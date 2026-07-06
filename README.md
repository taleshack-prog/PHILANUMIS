# PhilaNumis — Protocolo de Tokenização RWA para Colecionáveis

Tokenização fracionada de moedas, selos e medalhas na **Base L2**, com custódia física
verificável, bonding curve de liquidez em USDC e gamificação por completude de série
(Historical Quests).

> Escopo desta primeira entrega: **Fase 1 (MVP)** conforme o roadmap do projeto — protocolo
> fechado, único emissor (Hack Tech Farm), sem factory pattern nem onboarding de terceiros.

## Arquitetura — 5 módulos

| Contrato | Padrão | Responsabilidade |
|---|---|---|
| `PhilaNumisCore.sol` | ERC-1155 + AccessControl | Identidade do ativo e frações. Mint/burn controlado por role. |
| `LiquidityVault.sol` | Bonding Curve linear + USDC | Precificação automática `P(s) = m·s + b`. Compra/venda com spread. |
| `RedemptionVault.sol` | Escrow custom | Burn-to-claim: exige 100% das frações, commit-reveal de dados de envio. |
| `CustodyOracle.sol` | Oracle custom (3 camadas) | Registra attestações: diária (HTF), trimestral (Hacken), anual (Big4). |
| `QuestEngine.sol` | ERC-1155 soulbound | Badges não-transferíveis por completude de série (Bronze/Silver/Master/Imperial Curator). |

## Decisões e ajustes feitos em relação ao documento original

Revisei o `MVP_Philanumis.odt`, `PHILANUMIS-TEXT.odt` e `PHILONUMIS.pdf` linha a linha antes de
escrever o código. Três pontos precisam da sua validação:

1. **Inconsistência de taxas.** `MVP_Philanumis.odt` cita spread de 2% na bonding curve;
   `PHILANUMIS-TEXT.odt` cita 1%. Implementei `spreadBps` como parâmetro configurável por ativo
   (`LiquidityVault.initCurve`), sem travar em um valor fixo. **Decisão pendente sua**: qual é o
   fee schedule final (mint 1% ou 2%? spread 1% ou 2%? redemption 1% ou 3%?).
2. **"Merkle Proof" no resgate físico.** O texto original propõe Merkle Proof para validar
   propriedade "sem revelar identidade até confirmação". Uma árvore de Merkle tradicional não se
   aplica bem aqui — não há uma lista fixa de leaves a provar, e posse de 100% do supply já é
   verificável direto via `balanceOf`. Implementei em vez disso um **commit-reveal**: o usuário
   registra on-chain só o hash dos dados de envio; o conteúdo é revelado em canal privado
   diretamente à Hack Tech Farm, que confirma o hash antes de despachar. Resolve o mesmo problema
   (não expor dados pessoais on-chain) de forma mais simples e correta.
3. **"% de completude de série" ≠ "% de frações de um ativo".** São duas métricas diferentes que
   o rascunho original mistura. `QuestEngine` implementa a métrica correta: quantos **itens
   distintos** de uma série (ex: 9 moedas do Império) o usuário possui, não quantas frações de
   uma moeda específica.

## Estrutura

```
contracts/
  PhilaNumisCore.sol
  LiquidityVault.sol
  RedemptionVault.sol
  CustodyOracle.sol
  QuestEngine.sol
  mocks/MockERC20.sol      # USDC de teste
scripts/
  deploy.js                # deploy + wiring de roles entre os 5 contratos
test/
  PhilaNumis.test.js        # fluxo integrado: compra → 100% supply → resgate
```

## Como rodar

```bash
npm install
cp .env.example .env        # preencha PRIVATE_KEY, RPC, etc.
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network baseSepolia
```

> Nota: os contratos foram compilados e validados localmente com `solc 0.8.24` e `evmVersion:
> cancun` (necessário pelo OpenZeppelin 5.x, que usa o opcode `mcopy` em `Arrays.sol`). Confirme
> que a rede de destino (Base) já suporta o hardfork Cancun antes do deploy em mainnet.

## Auditoria de segurança — pontos que precisam de revisão externa antes de mainnet

- `LiquidityVault`: a curva impede arbitragem por design (spread cobrado nos dois sentidos), mas
  falta simular cenários de dump de 30% / pump de 100% mencionados no doc original — sugiro
  script de simulação antes do deploy.
- `RedemptionVault`: dependência de uma única conta com `CUSTODIAN_ROLE` é single point of failure
  — considerar multisig (Safe) antes de mainnet, como já recomendado no seu próprio documento
  (dependência do HTF como custodiante único é apontada como maior risco).
- Nenhum contrato aqui foi auditado por terceiros ainda — isso está no checklist da Fase 1
  (Hacken / Trail of Bits) e não deve ser pulado antes de qualquer capital real entrar no sistema.

## Próximos passos sugeridos

1. Validar/corrigir a fee schedule (ponto 1 acima) e eu ajusto os valores default.
2. Escrever os testes de stress da bonding curve (dump/pump).
3. Definir o schema de metadados IPFS final e o pipeline de upload do laudo + fotos.
4. Scripts de integração com `CustodyOracle` (quem assina as attestações trimestrais/anuais).
