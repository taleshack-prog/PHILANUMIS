"use client";

import { SeriesProgress } from "@/components/quests/SeriesProgress";

// TODO: mesma limitação da página de marketplace — listar todas as séries existentes exige
// indexação (evento `SeriesRegistered`). Por enquanto, mostra a série #1 fixa como exemplo.
const KNOWN_SERIES_IDS = [1n];

export default function QuestsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-lg font-medium">Historical Quests</h1>
      <p className="mt-2 text-sm text-gray-600">
        Complete séries históricas para desbloquear badges, descontos e cashback.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {KNOWN_SERIES_IDS.map((id) => (
          <SeriesProgress key={id.toString()} seriesId={id} />
        ))}
      </div>
    </main>
  );
}
