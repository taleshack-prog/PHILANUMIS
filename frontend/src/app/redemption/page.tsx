"use client";

import { useState } from "react";
import { parseUnits, formatUnits } from "viem";
import { useReadContract, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";
import { useRedemption } from "@/lib/hooks/useRedemption";
import { extractRevertReason } from "@/lib/errors";
import { Input, Textarea, InfoBox } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!ownsAll || !shippingInfo || appraisalValueUnits === 0n) return;
    setErrorMessage(null);

    try {
      if (estimatedFee) {
        await approveUsdc({
          ...contracts.usdc,
          functionName: "approve",
          args: [contracts.redemptionVault.address, estimatedFee as bigint],
        });
      }

      const hash = hashShippingInfo(shippingInfo);
      await requestRedemption(hash, appraisalValueUnits);
    } catch (err) {
      setErrorMessage(extractRevertReason(err));
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <h1 className="font-display text-2xl text-ink">Resgate físico</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Exige deter 100% das frações do ativo. O conteúdo dos seus dados de envio não é publicado
        on-chain — apenas um hash. Envie os dados reais à Hack Tech Farm por um canal privado após
        solicitar aqui.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-ink">
          ID do ativo
          <Input value={tokenIdInput} onChange={(e) => setTokenIdInput(e.target.value)} />
        </label>

        {!ownsAll && (
          <InfoBox tone="warning">
            Você não possui 100% das frações deste ativo — resgate indisponível.
          </InfoBox>
        )}

        <label className="flex flex-col gap-1 text-sm text-ink">
          Valor do laudo (USDC)
          <Input value={appraisalValue} onChange={(e) => setAppraisalValue(e.target.value)} placeholder="25000" />
        </label>

        {estimatedFee !== undefined && appraisalValueUnits > 0n && (
          <p className="font-mono text-xs text-ink-dim">
            Fee de resgate (1%): {formatUnits(estimatedFee as bigint, 6)} USDC
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm text-ink">
          Dados de envio (nome, endereço, documento) — só o hash vai on-chain
          <Textarea value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} rows={4} />
        </label>

        <Button
          onClick={handleSubmit}
          disabled={!ownsAll || isPending || !shippingInfo || appraisalValueUnits === 0n}
        >
          {isPending ? "Confirmando…" : "Solicitar resgate"}
        </Button>

        {errorMessage && <InfoBox tone="danger">{errorMessage}</InfoBox>}
      </div>
    </main>
  );
}
