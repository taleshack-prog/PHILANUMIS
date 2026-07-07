# PhilaNumis

Protocolo de tokenização RWA para colecionáveis (moedas, selos, medalhas) na Base L2, com
gamificação por completude de série. Projeto da Hack Tech Farm.

## Estrutura (monorepo)

```
contracts/   → protocolo Solidity: os 6 contratos, testes, script de deploy
              (ver contracts/README.md para arquitetura, fee schedule e decisões de design)
frontend/    → DApp Next.js que consome os contratos
              (ver frontend/README.md para stack e decisões de onboarding/wallet)
```

Cada subprojeto tem seu próprio `package.json`, `node_modules` e ciclo de vida — não há
dependência de build entre eles além do `frontend` consumir os ABIs já gerados em
`contracts/` e os endereços de deploy (via variáveis de ambiente, ver `frontend/.env.example`).

## Fluxo de trabalho

```bash
# Contratos
cd contracts
npm install
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network baseSepolia

# Frontend
cd frontend
npm install
cp .env.example .env   # preencher com os endereços do deploy acima + Privy App ID
npm run dev
```

## Estado atual

- **Contratos**: 6 módulos (Core, LiquidityVault, FixedPriceSale, RedemptionVault, CustodyOracle,
  QuestEngine), fee schedule fechada, gamificação (cashback/desconto por tier) e teto de
  captação regulatório implementados e validados (compilação + testes).
- **Frontend**: scaffold inicial (Next.js + wagmi + Privy) com as 4 seções principais. Marketplace
  e Quests ainda são stubs — falta indexação de eventos para listar todos os ativos/séries.
  Gas Abstraction ainda não implementado (decisão de produto pendente).

Detalhes de cada decisão de arquitetura, limitações conhecidas e itens pendentes estão nos
READMEs de cada subprojeto — não duplicados aqui para evitar desatualização.
