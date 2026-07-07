"use client";

import { useAsset } from "@/lib/hooks/useAsset";
import { BuyWidget } from "@/components/marketplace/BuyWidget";

export default function AssetPage({ params }: { params: { tokenId: string } }) {
  const tokenId = BigInt(params.tokenId);
  const { asset, isLoading } = useAsset(tokenId);

  if (isLoading) return <p className="p-6 text-sm text-gray-500">Carregando ativo…</p>;
  if (!asset) return <p className="p-6 text-sm text-red-600">Ativo não encontrado.</p>;

  const pctSold = asset.totalFractions > 0n
    ? Number((asset.circulatingSupply * 10_000n) / asset.totalFractions) / 100
    : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-medium">Ativo #{tokenId.toString()}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {asset.circulatingSupply.toString()} / {asset.totalFractions.toString()} frações em circulação (
        {pctSold.toFixed(1)}%)
      </p>
      {asset.isRedeemed && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Este ativo já foi resgatado fisicamente — não é mais possível comprar frações.
        </p>
      )}

      {/* TODO: renderizar metadados do IPFS (asset.metadataURI) — laudo, fotos, número de série */}

      <div className="mt-6">
        <BuyWidget tokenId={tokenId} />
      </div>
    </main>
  );
}
