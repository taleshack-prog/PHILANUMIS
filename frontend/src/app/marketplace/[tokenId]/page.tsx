"use client";

import { useAccount } from "wagmi";
import { useAsset, useSaleMode } from "@/lib/hooks/useAsset";
import { useCurrentPrice } from "@/lib/hooks/useCurrentPrice";
import { BuyWidget } from "@/components/marketplace/BuyWidget";
import { SellWidget } from "@/components/marketplace/SellWidget";
import { PriceCurveChart } from "@/components/marketplace/PriceCurveChart";
import { GuillochePattern } from "@/components/ui/GuillochePattern";
import { InfoBox } from "@/components/ui/Card";

export default function AssetPage({ params }: { params: { tokenId: string } }) {
  const tokenId = BigInt(params.tokenId);
  const { asset, isLoading } = useAsset(tokenId);
  const { mode } = useSaleMode(tokenId);
  const { price } = useCurrentPrice(tokenId);
  const { isConnected } = useAccount();

  if (isLoading) return <p className="p-6 text-sm text-ink-dim">Carregando ativo…</p>;
  if (!asset) return <p className="p-6 text-sm text-danger">Ativo não encontrado.</p>;

  const pctSold = asset.totalFractions > 0n
    ? Number((asset.circulatingSupply * 10_000n) / asset.totalFractions) / 100
    : 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center gap-4">
        <GuillochePattern
          variant="coin"
          seed={Number(tokenId)}
          className="h-16 w-16 shrink-0 text-bronze"
        />
        <div>
          <h1 className="font-display text-2xl text-ink">Ativo #{tokenId.toString()}</h1>
          <p className="mt-1 font-mono text-sm text-ink-dim">
            {asset.circulatingSupply.toString()} / {asset.totalFractions.toString()} frações em circulação (
            {pctSold.toFixed(1)}%)
            {price !== undefined && (
              <span className="ml-2 text-circuit">· {price.toFixed(4)} USDC/fração</span>
            )}
          </p>
        </div>
      </div>

      {asset.isRedeemed && (
        <div className="mt-4">
          <InfoBox tone="warning">
            Este ativo já foi resgatado fisicamente — não é mais possível comprar frações.
          </InfoBox>
        </div>
      )}

      {/* TODO: renderizar metadados do IPFS (asset.metadataURI) — laudo, fotos, número de série */}

      {mode === "bonding-curve" && (
        <div className="mt-6">
          <PriceCurveChart tokenId={tokenId} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BuyWidget tokenId={tokenId} />
        {isConnected && mode === "bonding-curve" && <SellWidget tokenId={tokenId} />}
      </div>

      {/* TODO: histórico de negociações (preço pago em cada Bought/Sold ao longo do tempo) —
          exige indexação de eventos, fora do escopo desta entrega. Ver README § Limitações. */}
    </main>
  );
}
