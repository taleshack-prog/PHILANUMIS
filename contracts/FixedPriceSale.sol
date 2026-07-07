// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPhilaNumisCoreForFixedSale {
    function mintFractions(uint256 tokenId, address to, uint256 amount) external;
    function assets(uint256 tokenId)
        external
        view
        returns (string memory metadataURI, uint256 totalFractions, uint256 circulatingSupply, bool isRedeemed, uint256 redemptionTimestamp);
}

/// @title FixedPriceSale
/// @notice Modalidade "Fixed Price" (playbook, seção 3.1) — preço fixo por fração, definido pela
///         perícia do ativo, para lançamentos e ativos premium onde não faz sentido descoberta de
///         preço via bonding curve.
/// @dev Só cobre a venda primária (mint). O playbook não descreve revenda secundária para ativos
///      Fixed Price — isso ficaria a cargo de um marketplace P2P (fora do escopo desta entrega).
/// @dev IMPORTANTE — limitação conhecida: os créditos de cashback (`LiquidityVault.cashbackCredits`)
///      concedidos pelo `QuestEngine` NÃO são reconhecidos aqui. Um usuário com crédito acumulado
///      via um ativo em bonding curve não consegue usá-lo numa compra Fixed Price, porque o
///      ledger de créditos vive no `LiquidityVault`, não num contrato compartilhado. Se isso for
///      um problema para o produto, a correção correta é extrair `cashbackCredits` /
///      `totalOutstandingCredits` para um contrato de tesouraria compartilhado entre as duas
///      modalidades — não implementei isso agora para não introduzir uma dependência circular
///      entre LiquidityVault e FixedPriceSale sem sua confirmação.
contract FixedPriceSale is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");

    uint256 public constant DEFAULT_MINT_FEE_BPS = 100; // 1%, mesma fee de mint do LiquidityVault

    struct Listing {
        uint256 pricePerFraction; // preço fixo por fração, em USDC (6 decimais), definido pela perícia
        uint256 mintFeeBps;
        uint256 captationCapUsdc; // teto regulatório de captação (0 = sem teto) — ver LiquidityVault
        bool initialized;
    }

    IERC20 public immutable usdc;
    IPhilaNumisCoreForFixedSale public immutable core;
    address public treasury;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => uint256) public totalRaised;

    event ListingCreated(uint256 indexed tokenId, uint256 pricePerFraction, uint256 mintFeeBps, uint256 captationCapUsdc);
    event PriceUpdated(uint256 indexed tokenId, uint256 newPricePerFraction);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 costPaid);

    constructor(address admin, address usdc_, address core_, address treasury_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CURATOR_ROLE, admin);
        usdc = IERC20(usdc_);
        core = IPhilaNumisCoreForFixedSale(core_);
        treasury = treasury_;
    }

    /// @param pricePerFraction Preço fixo por fração (em USDC, 6 decimais), definido pelo laudo de perícia.
    /// @param mintFeeBps Use `DEFAULT_MINT_FEE_BPS` (100) salvo necessidade específica.
    /// @param captationCapUsdc Teto de captação regulatório (0 apenas em testnet/staging).
    function listAsset(uint256 tokenId, uint256 pricePerFraction, uint256 mintFeeBps, uint256 captationCapUsdc)
        external
        onlyRole(CURATOR_ROLE)
    {
        require(!listings[tokenId].initialized, "ativo ja listado");
        require(pricePerFraction > 0, "preco deve ser > 0");
        require(mintFeeBps <= 1000, "fee maxima 10%");
        listings[tokenId] = Listing(pricePerFraction, mintFeeBps, captationCapUsdc, true);
        emit ListingCreated(tokenId, pricePerFraction, mintFeeBps, captationCapUsdc);
    }

    /// @notice Permite ao curador reajustar o preço (ex: novo laudo de perícia). Não afeta compras
    ///         já realizadas.
    function updatePrice(uint256 tokenId, uint256 newPricePerFraction) external onlyRole(CURATOR_ROLE) {
        require(listings[tokenId].initialized, "ativo nao listado");
        require(newPricePerFraction > 0, "preco deve ser > 0");
        listings[tokenId].pricePerFraction = newPricePerFraction;
        emit PriceUpdated(tokenId, newPricePerFraction);
    }

    function quoteBuy(uint256 tokenId, uint256 amount) public view returns (uint256 grossCost, uint256 totalCost) {
        Listing memory l = listings[tokenId];
        require(l.initialized, "ativo nao listado");
        grossCost = l.pricePerFraction * amount;
        totalCost = grossCost + (grossCost * l.mintFeeBps) / 10_000;
    }

    function buy(uint256 tokenId, uint256 amount, uint256 maxCost) external nonReentrant {
        Listing memory l = listings[tokenId];
        if (l.captationCapUsdc > 0) {
            require(totalRaised[tokenId] < l.captationCapUsdc, "teto de captacao atingido para este ativo");
        }

        (, uint256 totalCost) = quoteBuy(tokenId, amount);
        require(totalCost <= maxCost, "slippage: custo acima do limite");

        usdc.safeTransferFrom(msg.sender, address(this), totalCost);
        totalRaised[tokenId] += totalCost;

        core.mintFractions(tokenId, msg.sender, amount);

        emit Bought(tokenId, msg.sender, amount, totalCost);
    }

    /// @notice Retira as fees de mint acumuladas para a tesouraria.
    function withdrawTreasury(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        usdc.safeTransfer(treasury, amount);
    }
}
