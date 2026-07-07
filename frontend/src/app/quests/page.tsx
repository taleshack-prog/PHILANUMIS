"use client";

import { useAllSeries } from "@/lib/hooks/useQuestProgress";
import { SeriesProgress } from "@/components/quests/SeriesProgress";

export default function QuestsPage() {
  const { seriesList, isLoading } = useAllSeries();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-medium">Historical Quests</h1>
      <p className="mt-2 text-sm text-gray-600">
        Complete séries históricas para desbloquear badges, descontos e cashback.
      </p>

      {isLoading && <p className="mt-4 text-sm text-gray-500">Carregando séries…</p>}

      {!isLoading && seriesList.length === 0 && (
        <p className="mt-4 text-sm text-gray-600">
          Nenhuma série registrada ainda — o curador cria via{" "}
          <code className="rounded bg-gray-100 px-1">QuestEngine.registerSeries</code>.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {seriesList.map((s) => (
          <SeriesProgress key={s.seriesId.toString()} seriesId={s.seriesId} />
        ))}
      </div>
    </main>
  );
}
