"use client";

import { useSeriesProgress } from "@/lib/hooks/useQuestProgress";

const TIER_LABELS = ["Nenhum", "Bronze (25%)", "Silver (50%)", "Master (75%)", "Imperial Curator (100%)"];
const TIER_THRESHOLDS = [0, 25, 50, 75, 100];

export function SeriesProgress({ seriesId }: { seriesId: bigint }) {
  const { name, completionPct, currentTier, claimNextTier, isPending } = useSeriesProgress(seriesId);

  const nextThreshold = TIER_THRESHOLDS[currentTier + 1];
  const canClaimNext = nextThreshold !== undefined && completionPct >= nextThreshold;

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{name ?? `Série #${seriesId.toString()}`}</h3>

      <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
        <div
          className="h-2 rounded-full bg-ink"
          style={{ width: `${Math.min(completionPct, 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-600">
        {completionPct.toFixed(0)}% completo — tier atual: {TIER_LABELS[currentTier]}
      </p>

      {canClaimNext && (
        <button
          onClick={() => claimNextTier()}
          disabled={isPending}
          className="mt-3 rounded-md bg-ink px-3 py-1.5 text-xs text-parchment disabled:opacity-40"
        >
          {isPending ? "Confirmando…" : `Reivindicar ${TIER_LABELS[currentTier + 1]}`}
        </button>
      )}
    </div>
  );
}
