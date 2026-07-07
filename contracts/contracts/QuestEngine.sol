// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IPhilaNumisCoreForQuests {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

interface ILiquidityVaultForQuests {
    function grantCashbackCredit(address user, uint256 amount) external;
    function setMarketplaceFeeDiscount(address user, uint256 tokenId, uint256 discountBps) external;
    function userTotalSpent(address user, uint256 tokenId) external view returns (uint256);
}

/// @title QuestEngine
/// @notice Badges soulbound (não-transferíveis) emitidos por completude de "séries" históricas
///         (ex: 9 moedas do Império do Brasil 1843-1889).
/// @dev Ponto importante clarificado em relação ao rascunho: a % de conclusão de uma série
///      (25/50/75/100%) NÃO é a mesma coisa que "% de frações de UM ativo". É a proporção de
///      itens DISTINTOS da série que o usuário possui (qualquer quantidade > 0 de cada tokenId
///      já conta como "item coletado"). Isso é registrado explicitamente via `registerSeries`.
///      Referência a EIP-5114: usamos a mesma ideia central (badge não-transferível, "prova de
///      participação"), implementada aqui sobre ERC-1155 com transferências bloqueadas — o EIP
///      ainda não tem biblioteca de referência estável no OpenZeppelin no momento do MVP.
contract QuestEngine is ERC1155, AccessControl {
    bytes32 public constant QUEST_MASTER_ROLE = keccak256("QUEST_MASTER_ROLE");

    enum Tier {
        Bronze,          // 25% da série
        Silver,          // 50% da série
        Master,          // 75% da série
        ImperialCurator  // 100% da série
    }

    struct Series {
        string name;
        uint256[] tokenIds; // itens (tokenIds do PhilaNumisCore) que compõem a série
        bool exists;
    }

    IPhilaNumisCoreForQuests public immutable core;
    ILiquidityVaultForQuests public immutable vault;

    // Recompensas dos tiers 50% e 100% (playbook, seção 4.2) — 25% e 75% são apenas
    // sociais/informativos (badge + acesso a canal / notificação) e não têm efeito on-chain aqui.
    uint256 public constant SILVER_MARKETPLACE_DISCOUNT_BPS = 50;  // 0.5%
    uint256 public constant COMPLETION_CASHBACK_BPS = 300;         // 3% do volume comprado na série

    uint256 public seriesCounter;
    mapping(uint256 => Series) public series; // seriesId => Series
    // seriesId => user => maior tier já conquistado (+1; 0 = nenhum)
    mapping(uint256 => mapping(address => uint8)) public highestTierAchieved;

    event SeriesRegistered(uint256 indexed seriesId, string name, uint256 itemCount);
    event BadgeAwarded(uint256 indexed seriesId, address indexed user, Tier tier);

    constructor(address admin, address core_, address vault_) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(QUEST_MASTER_ROLE, admin);
        core = IPhilaNumisCoreForQuests(core_);
        vault = ILiquidityVaultForQuests(vault_);
    }

    /// @dev seriesId agora é auto-incrementado (mesmo padrão do `tokenCounter` no
    ///      PhilaNumisCore), em vez de escolhido pelo chamador. Isso permite ao frontend
    ///      descobrir todas as séries existentes lendo `seriesCounter` e iterando 1..N via
    ///      multicall — sem isso, "listar todas as séries" exigiria um indexer de eventos.
    function registerSeries(string calldata name, uint256[] calldata tokenIds)
        external
        onlyRole(QUEST_MASTER_ROLE)
        returns (uint256 seriesId)
    {
        require(tokenIds.length > 0, "serie precisa de ao menos 1 item");
        seriesId = ++seriesCounter;
        series[seriesId] = Series({name: name, tokenIds: tokenIds, exists: true});
        emit SeriesRegistered(seriesId, name, tokenIds.length);
    }

    /// @notice Calcula quantos itens distintos da série o usuário possui (balance > 0) e retorna
    ///         a completude em basis points (10_000 = 100%).
    function completionBps(uint256 seriesId, address user) public view returns (uint256) {
        Series memory s = series[seriesId];
        require(s.exists, "serie inexistente");

        uint256 owned = 0;
        for (uint256 i = 0; i < s.tokenIds.length; i++) {
            if (core.balanceOf(user, s.tokenIds[i]) > 0) {
                owned++;
            }
        }
        return (owned * 10_000) / s.tokenIds.length;
    }

    /// @notice Qualquer um pode chamar isso após uma compra para destravar o próximo badge —
    ///         evita depender de um bot centralizado para checar todos os usuários.
    function checkAndAwardBadges(uint256 seriesId, address user) external {
        uint256 bps = completionBps(seriesId, user);
        uint8 currentTier = highestTierAchieved[seriesId][user]; // 0 = nenhum ainda

        Tier newTier;
        bool eligible = false;

        if (bps >= 10_000 && currentTier < uint8(Tier.ImperialCurator) + 1) {
            newTier = Tier.ImperialCurator;
            eligible = true;
        } else if (bps >= 7_500 && currentTier < uint8(Tier.Master) + 1) {
            newTier = Tier.Master;
            eligible = true;
        } else if (bps >= 5_000 && currentTier < uint8(Tier.Silver) + 1) {
            newTier = Tier.Silver;
            eligible = true;
        } else if (bps >= 2_500 && currentTier < uint8(Tier.Bronze) + 1) {
            newTier = Tier.Bronze;
            eligible = true;
        }

        require(eligible, "nenhum novo tier a conquistar");

        highestTierAchieved[seriesId][user] = uint8(newTier) + 1;
        uint256 badgeId = _badgeId(seriesId, newTier);
        _mint(user, badgeId, 1, "");

        emit BadgeAwarded(seriesId, user, newTier);

        if (newTier == Tier.Silver) {
            _grantMarketplaceDiscount(seriesId, user);
        } else if (newTier == Tier.ImperialCurator) {
            _grantCompletionCashback(seriesId, user);
        }
    }

    /// @notice Tier 50%: desconto de 0.5% na marketplace fee para todos os ativos da série.
    function _grantMarketplaceDiscount(uint256 seriesId, address user) internal {
        uint256[] memory tokenIds = series[seriesId].tokenIds;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            vault.setMarketplaceFeeDiscount(user, tokenIds[i], SILVER_MARKETPLACE_DISCOUNT_BPS);
        }
    }

    /// @notice Tier 100%: cashback de 3% sobre o volume total (USDC) que o usuário comprou na
    ///         série, creditado no LiquidityVault para abater compras futuras.
    function _grantCompletionCashback(uint256 seriesId, address user) internal {
        uint256[] memory tokenIds = series[seriesId].tokenIds;
        uint256 totalSpend = 0;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            totalSpend += vault.userTotalSpent(user, tokenIds[i]);
        }
        uint256 bonus = (totalSpend * COMPLETION_CASHBACK_BPS) / 10_000;
        vault.grantCashbackCredit(user, bonus);
    }

    function _badgeId(uint256 seriesId, Tier tier) internal pure returns (uint256) {
        return (seriesId * 10) + uint256(tier);
    }

    /// @dev Soulbound: bloqueia qualquer transferência que não seja mint (from == 0) ou burn (to == 0).
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values)
        internal
        override
    {
        require(from == address(0) || to == address(0), "badge nao-transferivel (soulbound)");
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
