// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IPhilaNumisCoreForRedemption {
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function totalFractionsOf(uint256 tokenId) external view returns (uint256);
    function burnForRedemption(uint256 tokenId, address from, uint256 amount) external;
    function markAsRedeemed(uint256 tokenId) external;
}

/// @title RedemptionVault
/// @notice Fluxo de burn-to-claim: detentor de 100% das frações queima os tokens e dispara
///         o processo de envio físico pela Hack Tech Farm.
/// @dev Nota de implementação: a documentação original menciona "Merkle Proof" para validar
///      propriedade "sem revelar identidade até confirmação". Uma árvore de Merkle tradicional
///      não se aplica bem aqui (não há uma lista fixa de leaves a provar — a posse é 100% do
///      supply, verificável direto via balanceOf). O que entrega o mesmo objetivo de forma mais
///      simples e correta é um esquema de commit-reveal: o usuário registra on-chain apenas o
///      HASH dos dados de envio (endereço, documento) e revela o conteúdo em canal privado
///      (fora da chain) somente para a Hack Tech Farm, que confirma o hash antes de despachar.
///      Isso evita expor dados pessoais publicamente no calldata/eventos, que é o problema real
///      que a doc original queria resolver.
/// @dev Fee schedule fechada (playbook "Arquiteto RWA & GameFi"): taxa de resgate físico = 1%
///      (100 bps), cobrada em USDC no momento da solicitação e enviada à tesouraria.
contract RedemptionVault is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");

    uint256 public constant REDEMPTION_FEE_BPS = 100; // 1%

    enum Status {
        None,
        Requested,
        Confirmed,
        Shipped
    }

    struct RedemptionRequest {
        address claimant;
        bytes32 shippingInfoHash; // commit hash dos dados de envio; conteúdo revelado off-chain
        Status status;
        uint256 requestedAt;
        uint256 confirmedAt;
        uint256 feePaid;
    }

    IPhilaNumisCoreForRedemption public immutable core;
    IERC20 public immutable usdc;
    address public treasury;

    // tokenId => request (um resgate ativo por vez por ativo, já que é 100% do supply)
    mapping(uint256 => RedemptionRequest) public requests;

    event RedemptionRequested(uint256 indexed tokenId, address indexed claimant, bytes32 shippingInfoHash, uint256 feePaid);
    event RedemptionConfirmed(uint256 indexed tokenId, address indexed custodian);
    event RedemptionShipped(uint256 indexed tokenId, address indexed custodian);
    event TreasuryUpdated(address newTreasury);

    constructor(address admin, address core_, address usdc_, address treasury_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CUSTODIAN_ROLE, admin);
        core = IPhilaNumisCoreForRedemption(core_);
        usdc = IERC20(usdc_);
        treasury = treasury_;
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    /// @notice Calcula a fee de resgate (1%) sobre o valor de referência do ativo (appraisalValue,
    ///         em USDC, informado pelo chamador — validado off-chain pelo laudo de perícia).
    /// @dev O appraisalValue não é armazenado on-chain no Core atual (fica no metadataURI/IPFS),
    ///      por isso é passado aqui como parâmetro e não lido automaticamente. Se preferir travar
    ///      isso on-chain, dá para adicionar um campo `appraisalValue` em `AssetData` no Core.
    function quoteRedemptionFee(uint256 appraisalValueUsdc) public pure returns (uint256) {
        return (appraisalValueUsdc * REDEMPTION_FEE_BPS) / 10_000;
    }

    /// @notice Requer 100% das frações do tokenId. Cobra a fee de resgate (1% do appraisalValue)
    ///         em USDC e faz o burn imediato ao solicitar (evita double-claim e reflete que o item
    ///         físico já está reservado para saída de custódia).
    function requestRedemption(uint256 tokenId, bytes32 shippingInfoHash, uint256 appraisalValueUsdc)
        external
        nonReentrant
    {
        uint256 owned = core.balanceOf(msg.sender, tokenId);
        uint256 total = core.totalFractionsOf(tokenId);
        require(total > 0, "ativo inexistente");
        require(owned == total, "precisa deter 100% das fracoes");
        require(requests[tokenId].status == Status.None, "resgate ja solicitado para este ativo");

        uint256 fee = quoteRedemptionFee(appraisalValueUsdc);
        if (fee > 0) {
            usdc.safeTransferFrom(msg.sender, treasury, fee);
        }

        core.burnForRedemption(tokenId, msg.sender, owned);

        requests[tokenId] = RedemptionRequest({
            claimant: msg.sender,
            shippingInfoHash: shippingInfoHash,
            status: Status.Requested,
            requestedAt: block.timestamp,
            confirmedAt: 0,
            feePaid: fee
        });

        emit RedemptionRequested(tokenId, msg.sender, shippingInfoHash, fee);
    }

    /// @notice Custodiante (Hack Tech Farm) confirma que validou o hash revelado off-chain
    ///         e que o ativo será despachado. Marca o ativo como resgatado no Core.
    function confirmRedemption(uint256 tokenId, bytes32 expectedHash) external onlyRole(CUSTODIAN_ROLE) {
        RedemptionRequest storage req = requests[tokenId];
        require(req.status == Status.Requested, "sem solicitacao pendente");
        require(req.shippingInfoHash == expectedHash, "hash nao confere");

        req.status = Status.Confirmed;
        req.confirmedAt = block.timestamp;

        core.markAsRedeemed(tokenId);

        emit RedemptionConfirmed(tokenId, msg.sender);
    }

    function markShipped(uint256 tokenId) external onlyRole(CUSTODIAN_ROLE) {
        RedemptionRequest storage req = requests[tokenId];
        require(req.status == Status.Confirmed, "resgate ainda nao confirmado");
        req.status = Status.Shipped;
        emit RedemptionShipped(tokenId, msg.sender);
    }
}

