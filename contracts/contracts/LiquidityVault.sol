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

/// @dev Teto de captação regulatório (playbook, seção 5.1 — CVM 88 / Lei 14.478/2022): cada
///      ativo tem um limite de captação em USDC definido pelo curador na criação da curva.
///      Comportamento escolhido: a compra que cruza o teto é permitida (não interrompe a
///      transação em andamento), mas nenhuma nova compra é aceita depois disso — o teto é
///      verificado no INÍCIO de cada `buy()`, contra o total já captado ANTES dela.
contract LiquidityVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CURATOR_ROLE = keccak256("CURATOR_ROLE");
    bytes32 public constant QUEST_ENGINE_ROLE = keccak256("QUEST_ENGINE_ROLE");

    uint256 public constant DEFAULT_MINT_FEE_BPS = 100;        // 1%
    uint256 public constant DEFAULT_MARKETPLACE_FEE_BPS = 250; // 2.5%

    struct CurveParams {
        uint256 m;                 // inclinação, em wei de USDC (6 decimais) por fração^2
        uint256 b;                 // preço base, em wei de USDC (6 decimais)
        uint256 mintFeeBps;        // taxa cobrada na compra (mint), em basis points
        uint256 marketplaceFeeBps; // taxa cobrada na venda (trade secundário), em basis points
        uint256 captationCapUsdc;  // teto regulatório de captação para este ativo, em USDC (0 = sem teto)
        bool initialized;
    }

    IERC20 public immutable usdc;
    IPhilaNumisCore public immutable core;
    address public treasury;

    mapping(uint256 => CurveParams) public curves;
    // total já captado (soma de totalCost pago em buy()) por ativo — usado contra o teto regulatório
    mapping(uint256 => uint256) public totalRaised;

    // --- Gamificação (QuestEngine) ---
    // user => tokenId => total de USDC (custo cheio, antes de crédito) já gasto comprando esse ativo
    mapping(address => mapping(uint256 => uint256)) public userTotalSpent;
    // user => crédito de cashback disponível em USDC, abatido automaticamente na próxima compra
    mapping(address => uint256) public cashbackCredits;
    // user => tokenId => desconto adicional (bps) sobre a marketplace fee, por tier de série
    mapping(address => mapping(uint256 => uint256)) public marketplaceFeeDiscountBps;
    // soma de todos os créditos de cashback ainda não resgatados — admin NÃO pode retirar isso da tesouraria
    uint256 public totalOutstandingCredits;

    event CurveInitialized(
        uint256 indexed tokenId, uint256 m, uint256 b, uint256 mintFeeBps, uint256 marketplaceFeeBps, uint256 captationCapUsdc
    );
    event CaptationCapUpdated(uint256 indexed tokenId, uint256 newCapUsdc);
    event Bought(uint256 indexed tokenId, address indexed buyer, uint256 amount, uint256 costPaid, uint256 creditUsed);
    event Sold(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 payout);
    event CashbackCreditGranted(address indexed user, uint256 amount);
    event MarketplaceFeeDiscountSet(address indexed user, uint256 indexed tokenId, uint256 discountBps);

    constructor(address admin, address usdc_, address core_, address treasury_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CURATOR_ROLE, admin);
        usdc = IERC20(usdc_);
        core = IPhilaNumisCore(core_);
        treasury = treasury_;
    }

    /// @param mintFeeBps Use `DEFAULT_MINT_FEE_BPS` (100) salvo necessidade específica do ativo.
    /// @param marketplaceFeeBps Use `DEFAULT_MARKETPLACE_FEE_BPS` (250) salvo necessidade específica.
    /// @param captationCapUsdc Teto de captação regulatório para este ativo, em USDC (6 decimais).
    ///        Use 0 apenas em testnet/staging — em produção, todo ativo deve ter um teto definido
    ///        pelo jurídico (CVM 88 / Lei 14.478/2022, faixa de referência R$15M-R$25M).
    function initCurve(
        uint256 tokenId,
        uint256 m,
        uint256 b,
        uint256 mintFeeBps,
        uint256 marketplaceFeeBps,
        uint256 captationCapUsdc
    ) external onlyRole(CURATOR_ROLE) {
        require(!curves[tokenId].initialized, "curva ja inicializada");
        require(mintFeeBps <= 1000 && marketplaceFeeBps <= 1000, "fee maxima 10%");
        curves[tokenId] = CurveParams(m, b, mintFeeBps, marketplaceFeeBps, captationCapUsdc, true);
        emit CurveInitialized(tokenId, m, b, mintFeeBps, marketplaceFeeBps, captationCapUsdc);
    }

    /// @notice Permite ao curador ajustar o teto de captação depois do deploy (ex: reenquadramento
    ///         jurídico). Não afeta captação já realizada, só compras futuras.
    function setCaptationCap(uint256 tokenId, uint256 newCapUsdc) external onlyRole(CURATOR_ROLE) {
        require(curves[tokenId].initialized, "curva nao inicializada");
        curves[tokenId].captationCapUsdc = newCapUsdc;
        emit CaptationCapUpdated(tokenId, newCapUsdc);
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
    /// @param trader Endereço usado para aplicar o desconto de tier (50% da série); passe
    ///        `address(0)` para obter a cotação "cheia" sem considerar descontos pessoais.
    function quoteSell(uint256 tokenId, uint256 amount, address trader)
        public
        view
        returns (uint256 grossPayout, uint256 netPayout)
    {
        CurveParams memory c = curves[tokenId];
        require(c.initialized, "curva nao inicializada");
        (, , uint256 s, ,) = core.assets(tokenId);
        require(amount <= s, "amount excede supply circulante");

        uint256 sAfter = s - amount;
        grossPayout = (c.m * amount * (sAfter + s)) / 2 + c.b * amount;

        uint256 discount = marketplaceFeeDiscountBps[trader][tokenId];
        uint256 effectiveFeeBps = c.marketplaceFeeBps > discount ? c.marketplaceFeeBps - discount : 0;
        netPayout = grossPayout - (grossPayout * effectiveFeeBps) / 10_000;
    }

    function buy(uint256 tokenId, uint256 amount, uint256 maxCost) external nonReentrant {
        CurveParams memory c = curves[tokenId];
        if (c.captationCapUsdc > 0) {
            require(totalRaised[tokenId] < c.captationCapUsdc, "teto de captacao atingido para este ativo");
        }

        (, uint256 totalCost) = quoteBuy(tokenId, amount);
        require(totalCost <= maxCost, "slippage: custo acima do limite");

        uint256 credit = cashbackCredits[msg.sender];
        uint256 creditUsed = credit < totalCost ? credit : totalCost;
        uint256 amountDue = totalCost - creditUsed;

        if (creditUsed > 0) {
            cashbackCredits[msg.sender] = credit - creditUsed;
            totalOutstandingCredits -= creditUsed;
        }
        if (amountDue > 0) {
            usdc.safeTransferFrom(msg.sender, address(this), amountDue);
        }

        // Conta o valor cheio (totalCost) para fins de volume, independente de ter sido pago via
        // crédito — o crédito é um benefício, não deveria "esconder" o volume real do usuário.
        userTotalSpent[msg.sender][tokenId] += totalCost;
        totalRaised[tokenId] += totalCost;

        core.mintFractions(tokenId, msg.sender, amount);

        emit Bought(tokenId, msg.sender, amount, totalCost, creditUsed);
    }

    function sell(uint256 tokenId, uint256 amount, uint256 minPayout) external nonReentrant {
        (, uint256 netPayout) = quoteSell(tokenId, amount, msg.sender);
        require(netPayout >= minPayout, "slippage: payout abaixo do limite");

        core.burnFractions(tokenId, msg.sender, amount);
        usdc.safeTransfer(msg.sender, netPayout);

        emit Sold(tokenId, msg.sender, amount, netPayout);
    }

    /// @notice Chamado pelo QuestEngine ao conceder o tier Imperial Curator (100% da série).
    ///         O crédito é abatido automaticamente do custo das próximas compras do usuário.
    function grantCashbackCredit(address user, uint256 amount) external onlyRole(QUEST_ENGINE_ROLE) {
        if (amount == 0) return;
        cashbackCredits[user] += amount;
        totalOutstandingCredits += amount;
        emit CashbackCreditGranted(user, amount);
    }

    /// @notice Chamado pelo QuestEngine ao conceder o tier Silver (50% da série).
    function setMarketplaceFeeDiscount(address user, uint256 tokenId, uint256 discountBps)
        external
        onlyRole(QUEST_ENGINE_ROLE)
    {
        marketplaceFeeDiscountBps[user][tokenId] = discountBps;
        emit MarketplaceFeeDiscountSet(user, tokenId, discountBps);
    }

    /// @notice Retira as fees acumuladas (mint + marketplace) para a tesouraria.
    /// @dev Nunca retira além do que excede os créditos de cashback ainda não resgatados —
    ///      isso garante que o vault sempre tenha USDC suficiente para honrar os créditos.
    function withdrawTreasury(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 available = usdc.balanceOf(address(this)) - totalOutstandingCredits;
        require(amount <= available, "excede saldo livre (reservado para creditos de cashback)");
        usdc.safeTransfer(treasury, amount);
    }
}
