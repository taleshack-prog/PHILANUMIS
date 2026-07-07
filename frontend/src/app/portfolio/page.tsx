"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useMyPortfolio } from "@/lib/hooks/useAsset";
import { ConnectButton } from "@/components/wallet/ConnectButton";

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { owned, isLoading } = useMyPortfolio(address);

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-lg font-medium">Meus ativos</h1>
        <p className="mt-2 text-sm text-gray-600">Conecte-se para ver suas frações.</p>
        <div className="mt-4">
          <ConnectButton />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-medium">Meus ativos</h1>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Carregando…</p>}

      {!isLoading && owned.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">
          Você ainda não possui frações de nenhum ativo.{" "}
          <Link href="/marketplace" className="underline">
            Ver marketplace
          </Link>
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {owned.map((asset) => (
          <div key={asset.tokenId.toString()} className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Ativo #{asset.tokenId.toString()}</p>
              <p className="text-xs text-gray-500">
                Você tem {asset.balance.toString()} / {asset.totalFractions.toString()} frações
                {asset.ownsAll && " — 100%, elegível para resgate"}
              </p>
            </div>
            <div className="flex gap-2 text-sm">
              <Link href={`/marketplace/${asset.tokenId.toString()}`} className="underline">
                Ver / vender
              </Link>
              {asset.ownsAll && !asset.isRedeemed && (
                <Link href="/redemption" className="underline">
                  Resgatar
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
