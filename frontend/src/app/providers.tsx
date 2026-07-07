"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ACTIVE_CHAIN, SUPPORTED_CHAINS } from "@/lib/chains";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

/// Decisão de produto (não técnica): o usuário escolhe como entrar, sem trava.
/// O modal do Privy mostra, lado a lado, as duas rotas:
///   1) Email / Google / Apple → cria uma embedded wallet na hora (zero fricção, sem extensão)
///   2) Conectar carteira existente → MetaMask, Coinbase Wallet, Rabby, WalletConnect, etc.
/// Nenhuma das duas é "a padrão" escondendo a outra — ambas ficam visíveis no mesmo passo.
export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

  if (!appId) {
    // Falha alto e cedo em dev — silenciar isso levaria a um app "quebrado" sem pista do porquê.
    console.error(
      "[Providers] NEXT_PUBLIC_PRIVY_APP_ID não configurado. Crie um app em https://dashboard.privy.io e preencha o .env."
    );
  }

  return (
    <PrivyProvider
      appId={appId ?? ""}
      config={{
        loginMethods: ["email", "google", "apple", "wallet"],
        appearance: {
          theme: "light",
          showWalletLoginFirst: false, // não prioriza nenhuma das duas rotas visualmente
        },
        embeddedWallets: {
          // Cria a embedded wallet automaticamente só para quem entrou via email/social —
          // quem já trouxe uma wallet externa não ganha uma segunda sem necessidade.
          createOnLogin: "users-without-wallets",
        },
        defaultChain: ACTIVE_CHAIN,
        supportedChains: [...SUPPORTED_CHAINS],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
