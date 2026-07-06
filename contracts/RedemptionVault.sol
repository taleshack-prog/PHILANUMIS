// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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
contract RedemptionVault is AccessControl, ReentrancyGuard {
    bytes32 public constant CUSTODIAN_ROLE = keccak256("CUSTODIAN_ROLE");

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
    }

    IPhilaNumisCoreForRedemption public immutable core;

    // tokenId => request (um resgate ativo por vez por ativo, já que é 100% do supply)
    mapping(uint256 => RedemptionRequest) public requests;

    event RedemptionRequested(uint256 indexed tokenId, address indexed claimant, bytes32 shippingInfoHash);
    event RedemptionConfirmed(uint256 indexed tokenId, address indexed custodian);
    event RedemptionShipped(uint256 indexed tokenId, address indexed custodian);

    constructor(address admin, address core_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CUSTODIAN_ROLE, admin);
        core = IPhilaNumisCoreForRedemption(core_);
    }

    /// @notice Requer 100% das frações do tokenId. Burn imediato ao solicitar (evita double-claim
    ///         e reflete que o item físico já está reservado para saída de custódia).
    function requestRedemption(uint256 tokenId, bytes32 shippingInfoHash) external nonReentrant {
        uint256 owned = core.balanceOf(msg.sender, tokenId);
        uint256 total = core.totalFractionsOf(tokenId);
        require(total > 0, "ativo inexistente");
        require(owned == total, "precisa deter 100% das fracoes");
        require(requests[tokenId].status == Status.None, "resgate ja solicitado para este ativo");

        core.burnForRedemption(tokenId, msg.sender, owned);

        requests[tokenId] = RedemptionRequest({
            claimant: msg.sender,
            shippingInfoHash: shippingInfoHash,
            status: Status.Requested,
            requestedAt: block.timestamp,
            confirmedAt: 0
        });

        emit RedemptionRequested(tokenId, msg.sender, shippingInfoHash);
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
