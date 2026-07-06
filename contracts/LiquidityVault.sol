// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPhilaNumisCore {
    function mintFractions(uint256 tokenId, address to, uint256 amount) external;
    function burnFractions(uint256 tokenId, address from, uint256 amount) external;
    function assets(uint256 tokenId)
        external
        view
        returns (string memory metadataURI, uint256 totalFractions, uint256 circulatingSupply, bool isRedeemed, uint256 redemptionTimestamp);
}

/// @title LiquidityVault
/// @notice Bonding curve linear P(s) = m*s + b para compra/venda de frações em USDC.
/// @dev Fee schedule fechada (playbook "Arquiteto RWA & GameFi"):
///      - Mint fee (compra = novas frações mintadas): 1% (100 bps)
///      - Marketplace fee (venda = trade secundário de volta à curva): 2.5% (250 bps)
///      Ambas configuráveis por ativo via `initCurve`, com os valores acima como default
///      recomendado. Mantidas separadas (e não um único "spread") porque o playbook trata
///      mint e marketplace como linhas de receita distintas.
contract LiquidityVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    uint256 public constant DEFAULT_MINT_FEE_BPS = 100;        // 1%
    uint256 public constant DEFAULT_MARKETPLACE_FEE_BPS = 250; // 2.5%

    struct CurveParams {
        uint256 m;                 // inclinação, em wei de USDC (6 decimais) por fração^2
        uint256 b;                 // preço base, em wei de USDC (6 decimais)
        uint256 mintFeeBps;        // taxa cobrada na compra (mint), em basis points
        uint256 marketplaceFeeBps; // taxa cobrada na venda (trade secundário), em basis points
        bool initialized;
    }

    IERC20 public immutable usdc;
    IPhilaNumisCore public immutable core;
    address public treasury;

    mapping(uint256 => CurveParams) public curves;

    event CurveInitialized(uint256 indexed tokenId, uint256 m, uint256 b, uint256 mintFeeBps, uint256 marketplaceFeeBps);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 costPaid);
    event Sold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 payout);

    constructor(address admin, address usdc_, address core_, address treasury_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CURATOR_ROLE, admin);
        usdc = IERC20(usdc_);
        core = IPhilaNumisCore(core_);
        treasury = treasury_;
    }

    /// @param mintFeeBps Use `DEFAULT_MINT_FEE_BPS` (100) salvo necessidade específica do ativo.
    /// @param marketplaceFeeBps Use `DEFAULT_MARKETPLACE_FEE_BPS` (250) salvo necessidade específica.
    function initCurve(uint256 tokenId, uint256 m, uint256 b, uint256 mintFeeBps, uint256 marketplaceFeeBps)
        external
        onlyRole(CURATOR_ROLE)
    {
        require(!curves[tokenId].initialized, "curva ja inicializada");
        require(mintFeeBps <= 1000 && marketplaceFeeBps <= 1000, "fee maxima 10%");
        curves[tokenId] = CurveParams(m, b, mintFeeBps, marketplaceFeeBps, true);
        emit CurveInitialized(tokenId, m, b, mintFeeBps, marketplaceFeeBps);
    }

    /// @notice Custo bruto (sem fee) para comprar `amount` frações a partir do supply atual `s`.
    /// @dev Integral de (m*x + b) entre s e s+amount = m*amount*(2s+amount)/2 + b*amount
    function quoteBuy(uint256 tokenId, uint256 amount) public view returns (uint256 grossCost, uint256 totalCost) {
        CurveParams memory c = curves[tokenId];
        require(c.initialized, "curva nao inicializada");
        (, , uint256 s, ,) = core.assets(tokenId);

        grossCost = (c.m * amount * (2 * s + amount)) / 2 + c.b * amount;
        totalCost = grossCost + (grossCost * c.mintFeeBps) / 10_000;
    }

    /// @notice Retorno bruto (sem fee) ao vender `amount` frações a partir do supply atual `s`.
    function quoteSell(uint256 tokenId, uint256 amount) public view returns (uint256 grossPayout, uint256 netPayout) {
        CurveParams memory c = curves[tokenId];
        require(c.initialized, "curva nao inicializada");
        (, , uint256 s, ,) = core.assets(tokenId);
        require(amount <= s, "amount excede supply circulante");

        uint256 sAfter = s - amount;
        grossPayout = (c.m * amount * (sAfter + s)) / 2 + c.b * amount;
        netPayout = grossPayout - (grossPayout * c.marketplaceFeeBps) / 10_000;
    }

    function buy(uint256 tokenId, uint256 amount, uint256 maxCost) external nonReentrant {
        (, uint256 totalCost) = quoteBuy(tokenId, amount);
        require(totalCost <= maxCost, "slippage: custo acima do limite");

        usdc.safeTransferFrom(msg.sender, address(this), totalCost);
        core.mintFractions(tokenId, msg.sender, amount);

        emit Bought(tokenId, msg.sender, amount, totalCost);
    }

    function sell(uint256 tokenId, uint256 amount, uint256 minPayout) external nonReentrant {
        (, uint256 netPayout) = quoteSell(tokenId, amount);
        require(netPayout >= minPayout, "slippage: payout abaixo do limite");

        core.burnFractions(tokenId, msg.sender, amount);
        usdc.safeTransfer(msg.sender, netPayout);

        emit Sold(tokenId, msg.sender, amount, netPayout);
    }

    /// @notice Retira as fees acumuladas (mint + marketplace) para a tesouraria.
    function withdrawTreasury(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        usdc.safeTransfer(treasury, amount);
    }
}
