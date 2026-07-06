// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CustodyOracle
/// @notice Registra as três camadas de Proof of Reserve descritas no playbook:
///         1) atualização diária feita pela própria Hack Tech Farm (oráculo próprio)
///         2) attestação trimestral de terceiro independente (ex: Hacken)
///         3) auditoria anual de Big 4
/// @dev Este contrato NÃO valida a autenticidade do laudo em si — apenas registra hashes
///      IPFS/attestações on-chain de forma auditável e com timestamps, para que qualquer
///      pessoa possa verificar quando cada camada foi atualizada pela última vez.
contract CustodyOracle is AccessControl {
    bytes32 public constant SELF_ORACLE_ROLE = keccak256("SELF_ORACLE_ROLE");   // HTF, diário
    bytes32 public constant THIRD_PARTY_ROLE = keccak256("THIRD_PARTY_ROLE");   // Hacken, trimestral
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");           // Big4, anual

    struct ProofLayer {
        bytes32 attestationHash; // hash IPFS do laudo/relatório
        uint256 updatedAt;
    }

    // tokenId => camada => prova
    mapping(uint256 => ProofLayer) public selfAttestations;
    mapping(uint256 => ProofLayer) public thirdPartyAttestations;
    mapping(uint256 => ProofLayer) public auditAttestations;

    uint256 public constant SELF_MAX_STALENESS = 2 days;
    uint256 public constant THIRD_PARTY_MAX_STALENESS = 100 days;   // ~trimestral + margem
    uint256 public constant AUDIT_MAX_STALENESS = 400 days;         // ~anual + margem

    event SelfAttestationUpdated(uint256 indexed tokenId, bytes32 hash);
    event ThirdPartyAttestationUpdated(uint256 indexed tokenId, bytes32 hash);
    event AuditAttestationUpdated(uint256 indexed tokenId, bytes32 hash);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function updateSelfAttestation(uint256 tokenId, bytes32 hash) external onlyRole(SELF_ORACLE_ROLE) {
        selfAttestations[tokenId] = ProofLayer(hash, block.timestamp);
        emit SelfAttestationUpdated(tokenId, hash);
    }

    function updateThirdPartyAttestation(uint256 tokenId, bytes32 hash) external onlyRole(THIRD_PARTY_ROLE) {
        thirdPartyAttestations[tokenId] = ProofLayer(hash, block.timestamp);
        emit ThirdPartyAttestationUpdated(tokenId, hash);
    }

    function updateAuditAttestation(uint256 tokenId, bytes32 hash) external onlyRole(AUDITOR_ROLE) {
        auditAttestations[tokenId] = ProofLayer(hash, block.timestamp);
        emit AuditAttestationUpdated(tokenId, hash);
    }

    /// @notice Verifica se as três camadas de prova estão dentro da janela de validade esperada.
    ///         Front-end / marketplace deve consultar isso antes de permitir novas compras.
    function isBackingValid(uint256 tokenId) external view returns (bool) {
        ProofLayer memory s = selfAttestations[tokenId];
        ProofLayer memory t = thirdPartyAttestations[tokenId];
        ProofLayer memory a = auditAttestations[tokenId];

        if (s.updatedAt == 0 || t.updatedAt == 0 || a.updatedAt == 0) return false;

        bool selfFresh = block.timestamp - s.updatedAt <= SELF_MAX_STALENESS;
        bool thirdPartyFresh = block.timestamp - t.updatedAt <= THIRD_PARTY_MAX_STALENESS;
        bool auditFresh = block.timestamp - a.updatedAt <= AUDIT_MAX_STALENESS;

        return selfFresh && thirdPartyFresh && auditFresh;
    }
}
