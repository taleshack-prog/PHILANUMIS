"use client";

import { useState } from "react";
import { useSeriesProgress } from "@/lib/hooks/useQuestProgress";
import { extractRevertReason } from "@/lib/errors";
import { Card, InfoBox } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const TIER_LABELS = ["Nenhum", "Bronze (25%)", "Silver (50%)", "Master (75%)", "Imperial Curator (100%)"];
const TIER_THRESHOLDS = [0, 25, 50, 75, 100];

export function SeriesProgress({ seriesId }: { seriesId: bigint }) {
  const { name, completionPct, currentTier, claimNextTier, isPending } = useSeriesProgress(seriesId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextThreshold = TIER_THRESHOLDS[currentTier + 1];
  const canClaimNext = nextThreshold !== undefined && completionPct >= nextThreshold;

  async function handleClaim() {
    setErrorMessage(null);
    try {
      await claimNextTier();
    } catch (err) {
      setErrorMessage(extractRevertReason(err));
    }
  }

  return (
    <Card>
      <h3 className="font-display text-lg text-ink">{name ?? `Série #${seriesId.toString()}`}</h3>

      <div className="mt-3 h-1.5 w-full rounded-full bg-background">
        <div
          className="h-1.5 rounded-full bg-circuit transition-all"
          style={{ width: `${Math.min(completionPct, 100)}%` }}
        />
      </div>
      <p className="mt-2 font-mono text-xs text-ink-dim">
        {completionPct.toFixed(0)}% completo — tier atual: {TIER_LABELS[currentTier]}
      </p>

      {canClaimNext && (
        <Button onClick={handleClaim} disabled={isPending} className="mt-3 text-xs">
          {isPending ? "Confirmando…" : `Reivindicar ${TIER_LABELS[currentTier + 1]}`}
        </Button>
      )}

      {errorMessage && (
        <div className="mt-2">
          <InfoBox tone="danger">{errorMessage}</InfoBox>
        </div>
      )}
    </Card>
  );
}
