"use client";

import Link from "next/link";
import { GuillochePattern } from "@/components/ui/GuillochePattern";
import { useCurrentPrice } from "@/lib/hooks/useCurrentPrice";
import type { AssetData } from "@/lib/hooks/useAsset";

export function AssetCard({ asset }: { asset: AssetData }) {
  const { price, mode } = useCurrentPrice(asset.tokenId);
  const pctSold =
    asset.totalFractions > 0n
      ? Number((asset.circulatingSupply * 10_000n) / asset.totalFractions) / 100
      : 0;

  return (
    <Link
      href={`/marketplace/${asset.tokenId.toString()}`}
      className="group flex gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-circuit"
    >
      <GuillochePattern
        variant="coin"
        seed={Number(asset.tokenId)}
        className="h-16 w-16 shrink-0 text-bronze transition-colors group-hover:text-circuit"
      />

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <p className="font-display text-lg text-ink">Ativo #{asset.tokenId.toString()}</p>
          {asset.isRedeemed && (
            <span className="rounded-full bg-warning-bg px-2 py-0.5 font-mono text-xs text-warning">
              Resgatado
            </span>
          )}
        </div>

        {price !== undefined && (
          <p className="mt-1 font-mono text-sm text-circuit">
            {price.toFixed(4)} USDC
            <span className="ml-1 text-xs text-ink-dim">
              {mode === "bonding-curve" ? "/ próxima fração" : "/ fração"}
            </span>
          </p>
        )}

        <div className="mt-3 h-1.5 w-full rounded-full bg-background">
          <div
            className="h-1.5 rounded-full bg-bronze transition-all"
            style={{ width: `${Math.min(pctSold, 100)}%` }}
          />
        </div>
        <p className="mt-1.5 font-mono text-xs text-ink-dim">
          {asset.circulatingSupply.toString()} / {asset.totalFractions.toString()} frações ({pctSold.toFixed(1)}%)
        </p>
      </div>
    </Link>
  );
}
