import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

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
    <html lang="pt-BR" className={`${fraunces.variable} ${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
