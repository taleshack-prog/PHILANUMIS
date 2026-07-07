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
    page.tsx              # landing com navegação para as 4 seções
    marketplace/
      page.tsx            # listagem (stub — ver TODO)
      [tokenId]/page.tsx  # detalhe do ativo + BuyWidget
    quests/page.tsx        # progresso de séries + claim de tier
    redemption/page.tsx     # fluxo de burn-to-claim (commit-reveal)
    custody/page.tsx        # status de prova de reserva
  components/
    wallet/ConnectButton.tsx
    marketplace/BuyWidget.tsx   # detecta bonding curve vs fixed price automaticamente
    quests/SeriesProgress.tsx
    custody/ProofOfReserveBadge.tsx
  lib/
    chains.ts             # Base mainnet + Sepolia
    wagmi.ts              # config wagmi (sem connectors próprios — Privy injeta os dele)
    contracts/
      addresses.ts        # lidos de .env, com fallback e warning se faltar
      abis/*.json         # ABIs reais, gerados por solc a partir do repo de contratos
      index.ts             # {address, abi} prontos pro wagmi
    hooks/
      useAsset.ts          # lê o Core + detecta modalidade de venda (bonding curve/fixed price)
      useBuyFlow.ts         # approve + buy, funciona pras duas modalidades
      useQuestProgress.ts   # completude de série + claim de tier
      useRedemption.ts      # commit-reveal do hash de envio + requestRedemption
```

## Decisão técnica: renderização 100% dinâmica

`export const dynamic = "force-dynamic"` no `layout.tsx` raiz. Achei isso rodando o build: o
Next tentava pré-renderizar estaticamente todas as páginas, e isso quebra com o Privy (não
inicializa sem app ID real em build time) — mas mesmo se não quebrasse, não faria sentido: toda
página aqui depende de saldo/allowance/tier por usuário, então HTML estático nunca seria útil.

## Limitações conhecidas (documentadas, não escondidas)

1. **Marketplace e Quests não têm indexação.** `/marketplace` e `/quests` hoje são stubs que
   apontam pro ativo/série #1 fixo. Listar "todos os ativos existentes" ou "todas as séries"
   requer um indexer (subgraph via The Graph, ou um cron simples gravando eventos `AssetCreated`
   / `SeriesRegistered` em Postgres) — ler isso direto da chain iterando `tokenCounter` funciona
   pro MVP mas não escala nem permite busca/filtro.
2. **Cashback do QuestEngine não aparece na UI do FixedPriceSale.** Mesma limitação já documentada
   no contrato — a UI só reflete o que o contrato faz.
3. **Sem tratamento de erro de transação revertida na UI.** Os widgets chamam `writeContractAsync`
   e mostram "Confirmando…", mas não há tratamento de revert (ex: teto de captação atingido,
   slippage estourado) mostrado de volta pro usuário de forma amigável — hoje só rejeita a Promise
   e o erro fica só no console.

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
