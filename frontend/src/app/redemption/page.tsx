"use client";

import { useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";
import { useRedemption } from "@/lib/hooks/useRedemption";

export default function RedemptionPage() {
  // TODO: em produção isso vem de um seletor de "meus ativos com 100% de posse" —
  // aqui é um input manual só pra deixar o fluxo testável no scaffold.
  const [tokenIdInput, setTokenIdInput] = useState("1");
  const tokenId = tokenIdInput ? BigInt(tokenIdInput) : 0n;

  const { ownsAll, hashShippingInfo, requestRedemption, isPending } = useRedemption(tokenId);
  const [shippingInfo, setShippingInfo] = useState("");
  const [appraisalValue, setAppraisalValue] = useState("");

  const appraisalValueUnits = appraisalValue ? parseUnits(appraisalValue, 6) : 0n;

  const { data: estimatedFee } = useReadContract({
    ...contracts.redemptionVault,
    functionName: "quoteRedemptionFee",
    args: [appraisalValueUnits],
    query: { enabled: appraisalValueUnits > 0n },
  });

  const { writeContractAsync: approveUsdc } = useWriteContract();

  async function handleSubmit() {
    if (!ownsAll || !shippingInfo || appraisalValueUnits === 0n) return;

    // 1) Aprova o USDC da fee de resgate (1% do valor do laudo) antes de solicitar.
    if (estimatedFee) {
      await approveUsdc({
        ...contracts.usdc,
        functionName: "approve",
        args: [contracts.redemptionVault.address, estimatedFee as bigint],
      });
    }

    // 2) Envia só o HASH dos dados — o conteúdo revelado vai por canal privado à Hack Tech Farm.
    const hash = hashShippingInfo(shippingInfo);
    await requestRedemption(hash, appraisalValueUnits);
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-lg font-medium">Resgate físico</h1>
      <p className="mt-2 text-sm text-gray-600">
        Exige deter 100% das frações do ativo. O conteúdo dos seus dados de envio não é publicado
        on-chain — apenas um hash. Envie os dados reais à Hack Tech Farm por um canal privado após
        solicitar aqui.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          ID do ativo
          <input
            value={tokenIdInput}
            onChange={(e) => setTokenIdInput(e.target.value)}
            className="rounded-md border px-3 py-2"
          />
        </label>

        {!ownsAll && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Você não possui 100% das frações deste ativo — resgate indisponível.
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Valor do laudo (USDC)
          <input
            value={appraisalValue}
            onChange={(e) => setAppraisalValue(e.target.value)}
            placeholder="25000"
            className="rounded-md border px-3 py-2"
          />
        </label>

        {estimatedFee !== undefined && appraisalValueUnits > 0n && (
          <p className="text-xs text-gray-600">
            Fee de resgate (1%): {formatUnits(estimatedFee as bigint, 6)} USDC
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Dados de envio (nome, endereço, documento) — só o hash vai on-chain
          <textarea
            value={shippingInfo}
            onChange={(e) => setShippingInfo(e.target.value)}
            rows={4}
            className="rounded-md border px-3 py-2"
          />
        </label>

        <button
          onClick={handleSubmit}
          disabled={!ownsAll || isPending || !shippingInfo || appraisalValueUnits === 0n}
          className="rounded-md bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-40"
        >
          {isPending ? "Confirmando…" : "Solicitar resgate"}
        </button>
      </div>
    </main>
  );
}
