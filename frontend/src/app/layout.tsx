import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// Toda página desta app lê estado de carteira/chain por usuário (saldo, allowance, tier de quest
// etc.) — não há nada aqui que faça sentido pré-renderizar estaticamente no build. Sem isso, o
// Next tenta gerar HTML estático no build e quebra (o Privy não inicializa sem app ID real em
// tempo de build, e mesmo que inicializasse, o HTML estático seria sempre o mesmo para todo mundo).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PhilaNumis",
  description: "Tokenização fracionada de moedas, selos e medalhas na Base L2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
