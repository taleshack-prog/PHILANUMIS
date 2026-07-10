"use client";

import { useState } from "react";
import { useAllSeries } from "@/lib/hooks/useQuestProgress";
import { useAdminQuestActions } from "@/lib/hooks/useAdminQuestActions";
import { extractRevertReason } from "@/lib/errors";
import { Card, Input, InfoBox } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function AdminGamificationPage() {
  const { seriesList, isLoading } = useAllSeries();
  const { registerSeries, isPending } = useAdminQuestActions();

  const [name, setName] = useState("");
  const [tokenIdsInput, setTokenIdsInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    try {
      const tokenIds = tokenIdsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s));

      if (tokenIds.length === 0) {
        setError("Informe ao menos um tokenId, separado por vírgula.");
        return;
      }

      await registerSeries(name, tokenIds);
      setSuccess(`Série "${name}" criada com ${tokenIds.length} item(ns).`);
      setName("");
      setTokenIdsInput("");
    } catch (err) {
      setError(extractRevertReason(err));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Gamificação</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Séries agrupam ativos existentes para os tiers de Historical Quests (25/50/75/100%).
        </p>
      </div>

      <Card>
        <span className="font-mono text-xs uppercase tracking-wide text-circuit">Nova série</span>
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm text-ink">
            Nome da série
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Império do Brasil 1822-1889" />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink">
            Token IDs (separados por vírgula)
            <Input value={tokenIdsInput} onChange={(e) => setTokenIdsInput(e.target.value)} placeholder="1, 2, 3" />
          </label>
          <Button onClick={handleCreate} disabled={isPending || !name || !tokenIdsInput}>
            {isPending ? "Confirmando…" : "Criar série"}
          </Button>
        </div>
      </Card>

      {success && <InfoBox tone="success">{success}</InfoBox>}
      {error && <InfoBox tone="danger">{error}</InfoBox>}

      <div>
        <h2 className="font-display text-lg text-ink">Séries existentes</h2>
        {isLoading && <p className="mt-2 text-sm text-ink-dim">Carregando…</p>}
        <div className="mt-3 flex flex-col gap-2">
          {seriesList.map((s) => (
            <Card key={s.seriesId.toString()}>
              <span className="font-mono text-xs text-ink-dim">#{s.seriesId.toString()}</span>{" "}
              <span className="text-ink">{s.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
