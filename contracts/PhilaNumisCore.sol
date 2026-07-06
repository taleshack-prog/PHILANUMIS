// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PhilaNumisCore
/// @notice Identidade on-chain de cada ativo colecionável (moeda/selo) e suas frações.
/// @dev tokenId é único por ativo. Não há um "tokenId 0 = custódia mãe" separado —
///      cada ativo físico tem seu próprio tokenId, e o supply total de frações
///      desse tokenId representa 100% da propriedade daquele item específico.
///      (Ajuste em relação ao rascunho original: modelar "token mãe" + "frações" como
///      o MESMO tokenId simplifica drasticamente a lógica de redemption e evita
///      contabilidade duplicada de supply.)
contract PhilaNumisCore is ERC1155, AccessControl, ReentrancyGuard {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct AssetData {
        string metadataURI;      // IPFS: assetType, catalogNumber, laudoHash, custodyHash etc.
        uint256 totalFractions;  // supply total definido na criação do ativo (ex: 50_000)
        uint256 circulatingSupply; // quanto já foi mintado/está em circulação
        bool isRedeemed;
        uint256 redemptionTimestamp;
    }

    uint256 public tokenCounter;
    mapping(uint256 => AssetData) public assets;

    event AssetCreated(uint256 indexed tokenId, string metadataURI, uint256 totalFractions);
    event FractionsMinted(uint256 indexed tokenId, address indexed to, uint256 amount);
    event MetadataUpdated(uint256 indexed tokenId, string newURI);
    event AssetRedeemed(uint256 indexed tokenId, uint256 timestamp);

    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    /// @notice Cria um novo ativo tokenizado (chamado após perícia + custódia física confirmada).
    function createAsset(string calldata metadataURI_, uint256 totalFractions_)
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 tokenId)
    {
        require(totalFractions_ > 0, "totalFractions deve ser > 0");
        tokenId = ++tokenCounter;
        assets[tokenId] = AssetData({
            metadataURI: metadataURI_,
            totalFractions: totalFractions_,
            circulatingSupply: 0,
            isRedeemed: false,
            redemptionTimestamp: 0
        });
        emit AssetCreated(tokenId, metadataURI_, totalFractions_);
    }

    /// @notice Minta frações de um ativo já criado (ex: para a LiquidityVault distribuir via bonding curve).
    function mintFractions(uint256 tokenId, address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        AssetData storage asset = assets[tokenId];
        require(bytes(asset.metadataURI).length != 0, "ativo inexistente");
        require(!asset.isRedeemed, "ativo ja resgatado");
        require(asset.circulatingSupply + amount <= asset.totalFractions, "excede supply total");

        asset.circulatingSupply += amount;
        _mint(to, tokenId, amount, "");
        emit FractionsMinted(tokenId, to, amount);
    }

    /// @notice Burn usado pela RedemptionVault no fluxo de burn-to-claim (resgate físico).
    function burnForRedemption(uint256 tokenId, address from, uint256 amount)
        external
        onlyRole(MINTER_ROLE) // chamado pela RedemptionVault, que detém MINTER_ROLE
        nonReentrant
    {
        _burn(from, tokenId, amount);
    }

    /// @notice Burn genérico usado pela LiquidityVault quando alguém vende frações de volta à curva.
    /// @dev Reduz circulatingSupply, diferente do burnForRedemption (que não altera supply pois o
    ///      ativo já saiu de circulação por completo).
    function burnFractions(uint256 tokenId, address from, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        nonReentrant
    {
        AssetData storage asset = assets[tokenId];
        asset.circulatingSupply -= amount;
        _burn(from, tokenId, amount);
    }

    function setMetadata(uint256 tokenId, string calldata newURI) external onlyRole(MINTER_ROLE) {
        require(bytes(assets[tokenId].metadataURI).length != 0, "ativo inexistente");
        assets[tokenId].metadataURI = newURI;
        emit MetadataUpdated(tokenId, newURI);
    }

    /// @notice Marca ativo como resgatado fisicamente — só o oráculo/custodiante pode confirmar.
    function markAsRedeemed(uint256 tokenId) external onlyRole(ORACLE_ROLE) {
        AssetData storage asset = assets[tokenId];
        require(!asset.isRedeemed, "ja resgatado");
        asset.isRedeemed = true;
        asset.redemptionTimestamp = block.timestamp;
        emit AssetRedeemed(tokenId, block.timestamp);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return assets[tokenId].metadataURI;
    }

    function totalFractionsOf(uint256 tokenId) external view returns (uint256) {
        return assets[tokenId].totalFractions;
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
