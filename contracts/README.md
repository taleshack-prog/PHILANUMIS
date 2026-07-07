# PhilaNumis — Protocolo de Tokenização RWA para Colecionáveis

Tokenização fracionada de moedas, selos e medalhas na **Base L2**, com custódia física
verificável, bonding curve de liquidez em USDC e gamificação por completude de série
(Historical Quests).

> Escopo desta primeira entrega: **Fase 1 (MVP)** conforme o roadmap do projeto — protocolo
> fechado, único emissor (Hack Tech Farm), sem factory pattern nem onboarding de terceiros.

## Arquitetura — 6 módulos

| Contrato | Padrão | Responsabilidade |
|---|---|---|
| `PhilaNumisCore.sol` | ERC-1155 + AccessControl | Identidade do ativo e frações. Mint/burn controlado por role. |
| `LiquidityVault.sol` | Bonding Curve linear + USDC | Precificação automática `P(s) = m·s + b`. Compra/venda com fee. |
| `FixedPriceSale.sol` | Preço fixo + USDC | Modalidade "Fixed Price" (seção 3.1): preço definido por perícia, para lançamentos e ativos premium. Só venda primária. |
| `RedemptionVault.sol` | Escrow custom | Burn-to-claim: exige 100% das frações, commit-reveal de dados de envio. |
| `CustodyOracle.sol` | Oracle custom (3 camadas) | Registra attestações: diária (HTF), trimestral (Hacken), anual (Big4). |
| `QuestEngine.sol` | ERC-1155 soulbound | Badges não-transferíveis por completude de série (Bronze/Silver/Master/Imperial Curator). |

Com o `FixedPriceSale`, a Fase 1 do roadmap ("Bonding Curve + Fixed Price + 10 ativos") está
tecnicamente coberta pelos contratos — falta só popular com os 10 ativos reais e fazer o deploy.

> **Limitação conhecida do FixedPriceSale**: os créditos de cashback do tier 100% (`QuestEngine`
> → `LiquidityVault.cashbackCredits`) não são reconhecidos aqui — o ledger de créditos vive só no
> `LiquidityVault`. Um usuário com crédito acumulado numa série em bonding curve não consegue
> gastá-lo numa compra Fixed Price. Se isso for relevante para o produto, a correção é extrair
> esse ledger para um contrato de tesouraria compartilhado — não fiz isso agora para não acoplar
> os dois contratos de venda sem sua confirmação.

## Fee schedule (fechada pela skill "Arquiteto RWA & GameFi")

| Fee | Valor | Onde está implementada |
|---|---|---|
| Mint | 1% | `LiquidityVault.buy()` — `DEFAULT_MINT_FEE_BPS = 100` |
| Marketplace | 2.5% | `LiquidityVault.sell()` — `DEFAULT_MARKETPLACE_FEE_BPS = 250` |
| Resgate Físico | 1% | `RedemptionVault.requestRedemption()` — `REDEMPTION_FEE_BPS = 100`, cobrada em USDC sobre o `appraisalValue` informado |
| Completion Premium | 3% (cashback, não yield contínuo) | `QuestEngine` → `LiquidityVault.grantCashbackCredit()`, abatido automaticamente na próxima compra |

## Gamificação — Historical Quests (seção 4.2 do playbook)

| Tier | Completude | Efeito on-chain |
|---|---|---|
| Bronze | 25% | Badge soulbound apenas (acesso a canal é off-chain/Discord) |
| Silver | 50% | Badge + **desconto de 0.5% na marketplace fee** para os ativos da série (`LiquidityVault.marketplaceFeeDiscountBps`) |
| Master | 75% | Badge apenas (notificação prioritária é off-chain) |
| Imperial Curator | 100% | Badge + **cashback de 3% do volume comprado na série**, creditado em `cashbackCredits` e abatido automaticamente na próxima compra via `buy()` |

O cashback é financiado pelas próprias fees de mint/marketplace/resgate já retidas no vault —
`withdrawTreasury` bloqueia a retirada de qualquer valor que comprometa os créditos ainda não
resgatados (`totalOutstandingCredits`).

## Teto de captação regulatório (seção 5.1 do playbook — CVM 88 / Lei 14.478/2022)

Cada ativo tem um teto de captação em USDC definido pelo curador em `initCurve` (parâmetro
`captationCapUsdc`), ajustável depois via `setCaptationCap`. Comportamento (decisão sua):

- A compra que **cruza** o teto é aceita normalmente — não interrompe a transação em andamento.
- Qualquer compra **seguinte**, feita depois que o total captado já ultrapassou o teto, é
  bloqueada (`buy()` reverte com `"teto de captacao atingido para este ativo"`).
- `totalRaised[tokenId]` acumula o `totalCost` de cada compra e pode ser consultado a qualquer
  momento para acompanhar o quanto falta para o teto.
- `captationCapUsdc = 0` desativa o teto — use isso **apenas em testnet/staging**; em produção
  todo ativo deve ter um teto definido pelo jurídico, na faixa de referência R$15M-R$25M
  convertida para USDC pela cotação vigente na data de estruturação.

## Decisões e ajustes feitos em relação ao documento original

Revisei o `MVP_Philanumis.odt`, `PHILANUMIS-TEXT.odt`, `PHILONUMIS.pdf` e a skill "Arquiteto RWA &
GameFi" linha a linha antes de escrever o código. Dois pontos foram resolvidos pela skill (taxas)
e um segue precisando de decisão sua:

1. ~~Inconsistência de taxas~~ — resolvido pela skill, ver tabela acima.
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

## Itens da skill ainda NÃO implementados (precisam de decisão de design antes de codar)

- **Leaderboard + prêmios mensais (0.1% das taxas do protocolo para Top 10)**: exige um mecanismo
  de distribuição periódica (keeper/cron on-chain ou processo off-chain que dispara um claim).
  Também exige uma fonte de dados de "valor de catálogo" (Bentes/Scott/Gibbons) para rankear.
- **TWAP na bonding curve**: a mitigação de "Oracle Manipulation" pede TWAP + limites de slippage.
  Slippage já existe (`maxCost`/`minPayout`), TWAP ainda não — não é trivial numa curva bonding
  determinística (o preço já é função pura do supply, não de um oráculo externo manipulável da
  forma clássica), mas vale conversarmos se há um vetor de ataque específico que você quer cobrir.
- **Anti-dumping (vesting 6 meses para terceiros)**: não se aplica ao MVP fechado (sem terceiros),
  fica para Fase 3.

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
