"use client";

import Link from "next/link";
import { useAllAssets } from "@/lib/hooks/useAsset";

export default function MarketplacePage() {
  const { assets, isLoading } = useAllAssets();

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-lg font-medium">Marketplace</h1>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Carregando ativos…</p>}

      {!isLoading && assets.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">
          Nenhum ativo tokenizado ainda. Assim que o curador criar o primeiro via
          <code className="mx-1 rounded bg-gray-100 px-1">PhilaNumisCore.createAsset</code>,
          ele aparece aqui automaticamente.
        </p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const pctSold =
            asset.totalFractions > 0n
              ? Number((asset.circulatingSupply * 10_000n) / asset.totalFractions) / 100
              : 0;

          return (
            <Link
              key={asset.tokenId.toString()}
              href={`/marketplace/${asset.tokenId.toString()}`}
              className="rounded-lg border p-4 transition hover:border-ink"
            >
              <p className="font-medium">Ativo #{asset.tokenId.toString()}</p>
              <p className="mt-1 text-xs text-gray-500">
                {asset.circulatingSupply.toString()} / {asset.totalFractions.toString()} frações (
                {pctSold.toFixed(1)}%)
              </p>
              {asset.isRedeemed && (
                <span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                  Resgatado
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
