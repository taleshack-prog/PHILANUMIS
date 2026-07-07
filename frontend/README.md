# PhilaNumis — DApp (frontend)

Next.js 14 (App Router) + TypeScript + wagmi/viem + Privy, consumindo os 6 contratos do
repositório [`taleshack-prog/PHILANUMIS`](https://github.com/taleshack-prog/PHILANUMIS).

## Stack e por quê

- **Next.js 14 (App Router)** — decisão sua, por SSR/SEO nas páginas de ativos.
- **wagmi v2 + viem** — camada de leitura/escrita on-chain, tipada a partir dos ABIs reais
  (gerados por `solc` direto dos contratos — ver `src/lib/contracts/abis/`, não escritos à mão).
- **Privy** — decisão de onboarding sua ("o usuário deve optar pela wallet que quer usar").
  Privy foi escolhido especificamente porque mostra, lado a lado no mesmo modal, duas rotas sem
  uma ser "a padrão":
  1. Email / Google / Apple → cria uma embedded wallet na hora, sem extensão.
  2. Conectar carteira existente → MetaMask, Coinbase Wallet, Rabby, WalletConnect etc.

  Isso resolve a parte de "Social Login" do checklist da skill (seção 8) sem travar ninguém numa
  única carteira.

## O que falta decidir: Gas Abstraction

O checklist da skill pede **Gas Abstraction**, além de Social Login. Isso eu **não implementei**
ainda — é uma decisão de custo/produto, não só técnica:

- Gas sponsoring (a protocolo paga o gás do usuário) exige um paymaster ERC-4337 (Coinbase
  Paymaster, ZeroDev, Alchemy) e uma política de quais transações são patrocinadas — senão o
  protocolo paga gas ilimitado para qualquer chamada de qualquer usuário.
- Na Base, o gas já é ordens de magnitude mais barato que Ethereum L1 ($0.0002-$0.01 por tx,
  conforme a própria skill cita), então o ganho de UX de patrocinar pode não justificar a
  complexidade extra — mas isso é uma decisão sua, não deveria ser assumida por mim.

Quando você decidir, a integração acontece em `src/app/providers.tsx` (Privy tem suporte nativo a
patrocinar gas via paymaster configurado no dashboard) sem precisar tocar no resto da app.

## Estrutura

```
src/
  app/
    layout.tsx          # força render dinâmico (ver nota abaixo) + Providers
    providers.tsx        # Privy + wagmi + react-query
    page.tsx              # landing com navegação para as 5 seções
    marketplace/
      page.tsx            # listagem real (via tokenCounter + multicall)
      [tokenId]/page.tsx  # detalhe do ativo + BuyWidget + SellWidget
    portfolio/page.tsx      # "meus ativos" — saldo do usuário conectado
    quests/page.tsx          # listagem real de séries + progresso + claim de tier
    redemption/page.tsx       # fluxo de burn-to-claim (commit-reveal)
    custody/page.tsx          # status de prova de reserva
  components/
    wallet/ConnectButton.tsx
    marketplace/
      BuyWidget.tsx       # detecta bonding curve vs fixed price automaticamente
      SellWidget.tsx       # só bonding curve (Fixed Price não tem venda secundária)
    quests/SeriesProgress.tsx
    custody/ProofOfReserveBadge.tsx
  lib/
    chains.ts             # Base mainnet + Sepolia
    wagmi.ts              # config wagmi (sem connectors próprios — Privy injeta os dele)
    errors.ts              # extrai a mensagem de revert do Solidity de dentro do erro do viem
    contracts/
      addresses.ts        # lidos de .env, com fallback e warning se faltar
      abis/*.json         # ABIs reais, gerados por solc a partir do repo de contratos
      index.ts             # {address, abi} prontos pro wagmi (abi tipado como Abi do viem)
    hooks/
      useAsset.ts          # lê o Core + lista todos os ativos + portfólio do usuário
      useBuyFlow.ts         # approve + buy + sell, funciona pras duas modalidades
      useQuestProgress.ts   # lista todas as séries + completude + claim de tier
      useRedemption.ts      # commit-reveal do hash de envio + requestRedemption
```

## Decisão técnica: renderização 100% dinâmica

`export const dynamic = "force-dynamic"` no `layout.tsx` raiz. Achei isso rodando o build: o
Next tentava pré-renderizar estaticamente todas as páginas, e isso quebra com o Privy (não
inicializa sem app ID real em build time) — mas mesmo se não quebrasse, não faria sentido: toda
página aqui depende de saldo/allowance/tier por usuário, então HTML estático nunca seria útil.

## O que foi completado nesta rodada

- **Indexação de marketplace e quests, sem indexer externo.** `PhilaNumisCore.tokenCounter` e
  `QuestEngine.seriesCounter` (este último, novo — `registerSeries` passou a auto-incrementar o
  ID, no mesmo padrão do `createAsset`) permitem ao frontend descobrir todos os ativos/séries
  existentes iterando 1..N via multicall (`useReadContracts`). `/marketplace` e `/quests` agora
  listam tudo de verdade, não mais um `tokenId`/`seriesId` fixo.
- **Fluxo de venda (bonding curve).** Antes só existia compra. `SellWidget` + `useSellFlow` /
  `useSellQuote` cobrem a venda de volta à curva, respeitando o desconto de tier do usuário
  (`marketplaceFeeDiscountBps`) na cotação.
- **Tratamento de erro de transação revertida.** `lib/errors.ts` extrai a mensagem `require(...)`
  do Solidity de dentro do erro embrulhado pelo viem/wagmi e mostra na UI (compra, venda, resgate,
  claim de tier) em vez de só rejeitar a Promise silenciosamente.
- **Página "Meus ativos" (`/portfolio`).** Cruza os ativos existentes com o saldo do usuário
  conectado, sinaliza quando ele tem 100% de um ativo (elegível pra resgate) e linka pras ações.

## Limitações que ainda ficam (genuinamente fora do escopo desta entrega)

1. **Indexação por multicall não escala indefinidamente.** Funciona bem até algumas dezenas de
   ativos/séries (a escala da Fase 1 do roadmap — 10 ativos). Se o catálogo crescer para
   centenas/milhares, migrar para um indexer de eventos (subgraph) evita recarregar tudo a cada
   visita.
2. **Cashback do QuestEngine não aparece na UI do FixedPriceSale.** Mesma limitação já documentada
   no contrato (`FixedPriceSale.sol`) — a UI só reflete o que o contrato faz, e o ledger de
   créditos vive só no `LiquidityVault`.
3. **Gas Abstraction** ainda não implementado — decisão de produto pendente (quem paga o gas
   patrocinado?), ver seção acima.
4. **Sem paginação/cache persistente.** Toda visita a `/marketplace`, `/quests` ou `/portfolio`
   rebusca tudo do zero — aceitável na escala atual, mas vale revisitar com mais ativos.

## Como rodar

```bash
npm install
cp .env.example .env
# preencha NEXT_PUBLIC_PRIVY_APP_ID (crie em https://dashboard.privy.io)
# preencha os endereços dos contratos após o deploy (ver PHILANUMIS/scripts/deploy.js)
npm run dev
```

Validado nesta entrega: `npx tsc --noEmit` sem erros e `npm run build` completo, sem depender de
credenciais reais (Privy/contratos) para o build passar — só para rodar de verdade no browser.
