"use client";

import { useState } from "react";
import { ProofOfReserveBadge } from "@/components/custody/ProofOfReserveBadge";
import { Input } from "@/components/ui/Card";

export default function CustodyPage() {
  const [tokenIdInput, setTokenIdInput] = useState("1");
  const tokenId = tokenIdInput ? BigInt(tokenIdInput) : 0n;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-2xl text-ink">Prova de custódia</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Cada ativo tem três camadas de attestação: oráculo próprio (diário), terceiro independente
        (trimestral) e auditoria Big 4 (anual). Todas precisam estar dentro da janela de validade.
      </p>

      <label className="mt-6 flex flex-col gap-1 text-sm text-ink">
        ID do ativo
        <Input value={tokenIdInput} onChange={(e) => setTokenIdInput(e.target.value)} className="max-w-[160px]" />
      </label>

      <div className="mt-4">
        <ProofOfReserveBadge tokenId={tokenId} />
      </div>
    </main>
  );
}
