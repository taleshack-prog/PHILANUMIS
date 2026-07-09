"use client";

import { useAllAssets } from "@/lib/hooks/useAsset";
import { AssetCard } from "@/components/marketplace/AssetCard";

export default function MarketplacePage() {
  const { assets, isLoading } = useAllAssets();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-display text-2xl text-ink">Marketplace</h1>

      {isLoading && <p className="mt-4 text-sm text-ink-dim">Carregando ativos…</p>}

      {!isLoading && assets.length === 0 && (
        <p className="mt-4 text-sm text-ink-dim">
          Nenhum ativo tokenizado ainda. Assim que o curador criar o primeiro via{" "}
          <code className="rounded bg-background px-1 font-mono text-xs">PhilaNumisCore.createAsset</code>,
          ele aparece aqui automaticamente.
        </p>
      )}

      {/* Grade de largura fixa por card (não força colunas vazias quando há poucos ativos) */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {assets.map((asset) => (
          <AssetCard key={asset.tokenId.toString()} asset={asset} />
        ))}
      </div>
    </main>
  );
}
