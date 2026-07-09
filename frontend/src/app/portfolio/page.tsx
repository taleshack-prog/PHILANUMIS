"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useMyPortfolio } from "@/lib/hooks/useAsset";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Card } from "@/components/ui/Card";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { owned, isLoading } = useMyPortfolio(address);

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-display text-2xl text-ink">Meus ativos</h1>
        <p className="mt-2 text-sm text-ink-dim">Conecte-se para ver suas frações.</p>
        <div className="mt-4">
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="font-display text-2xl text-ink">Meus ativos</h1>

      {isLoading && <p className="mt-4 text-sm text-ink-dim">Carregando…</p>}

      {!isLoading && owned.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          Você ainda não possui frações de nenhum ativo.{" "}
          <Link href="/marketplace" className="text-circuit hover:underline">
            Ver marketplace
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {owned.map((asset) => (
          <Card key={asset.tokenId.toString()} className="flex items-center justify-between">
            <div>
              <p className="font-display text-ink">Ativo #{asset.tokenId.toString()}</p>
              <p className="mt-1 font-mono text-xs text-ink-dim">
                Você tem {asset.balance.toString()} / {asset.totalFractions.toString()} frações
                {asset.ownsAll && " — 100%, elegível para resgate"}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link href={`/marketplace/${asset.tokenId.toString()}`} className="text-circuit hover:underline">
                Ver / vender
              </Link>
              {asset.ownsAll && !asset.isRedeemed && (
                <Link href="/redemption" className="text-circuit hover:underline">
                  Resgatar
                </Link>
              )}
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
