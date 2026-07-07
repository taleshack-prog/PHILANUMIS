"use client";

import { useState } from "react";
import { ProofOfReserveBadge } from "@/components/custody/ProofOfReserveBadge";

export default function CustodyPage() {
  const [tokenIdInput, setTokenIdInput] = useState("1");
  const tokenId = tokenIdInput ? BigInt(tokenIdInput) : 0n;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-lg font-medium">Prova de custódia</h1>
      <p className="mt-2 text-sm text-gray-600">
        Cada ativo tem três camadas de attestação: oráculo próprio (diário), terceiro independente
        (trimestral) e auditoria Big 4 (anual). Todas precisam estar dentro da janela de validade.
      </p>

      <label className="mt-6 flex flex-col gap-1 text-sm">
        ID do ativo
        <input
          value={tokenIdInput}
          onChange={(e) => setTokenIdInput(e.target.value)}
          className="rounded-md border px-3 py-2"
        />
      </label>

      <div className="mt-4">
        <ProofOfReserveBadge tokenId={tokenId} />
      </div>
    </main>
  );
}
