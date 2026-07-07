"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useSaleMode } from "@/lib/hooks/useAsset";
import { useBuyFlow, useBuyQuote } from "@/lib/hooks/useBuyFlow";
import { extractRevertReason } from "@/lib/errors";

const USDC_DECIMALS = 6;
const SLIPPAGE_BPS = 100n; // 1% de tolerância padrão sobre o custo cotado

export function BuyWidget({ tokenId }: { tokenId: bigint }) {
  const [fractionAmount, setFractionAmount] = useState("");
  const { mode, isLoading: modeLoading } = useSaleMode(tokenId);

  if (modeLoading) return <p className="text-sm text-gray-500">Carregando modalidade de venda…</p>;
  if (mode === "unconfigured")
    return <p className="text-sm text-gray-500">Este ativo ainda não está à venda.</p>;
  if (mode === "conflicting")
    return (
      <p className="text-sm text-red-600">
        Erro de configuração: este ativo tem curva E listagem fixa ativas ao mesmo tempo. Avise o time.
      </p>
    );

  return <BuyForm tokenId={tokenId} mode={mode} amount={fractionAmount} onAmountChange={setFractionAmount} />;
}

function BuyForm({
  tokenId,
  mode,
  amount,
  onAmountChange,
}: {
  tokenId: bigint;
  mode: "bonding-curve" | "fixed-price";
  amount: string;
  onAmountChange: (v: string) => void;
}) {
  const amountBig = amount ? BigInt(amount) : 0n;
  const { grossCost, totalCost, isLoading: quoteLoading } = useBuyQuote(tokenId, amountBig, mode);
  const { approve, buy, needsApproval, isPending } = useBuyFlow(tokenId, mode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const maxCost = totalCost + (totalCost * SLIPPAGE_BPS) / 10_000n;

  async function handleBuy() {
    if (amountBig === 0n) return;
    setErrorMessage(null);
    try {
      if (needsApproval(maxCost)) {
        await approve(maxCost);
      }
      await buy(amountBig, maxCost);
    } catch (err) {
      setErrorMessage(extractRevertReason(err));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <span className="text-xs uppercase tracking-wide text-gray-500">
        {mode === "bonding-curve" ? "Bonding curve" : "Preço fixo"}
      </span>

      <label className="flex flex-col gap-1 text-sm">
        Quantidade de frações
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          className="rounded-md border px-3 py-2"
        />
      </label>

      {amountBig > 0n && !quoteLoading && (
        <div className="text-sm text-gray-600">
          <p>Custo (sem taxa): {formatUnits(grossCost, USDC_DECIMALS)} USDC</p>
          <p className="font-medium text-ink">Total a pagar: {formatUnits(totalCost, USDC_DECIMALS)} USDC</p>
        </div>
      )}

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      <button
        onClick={handleBuy}
        disabled={amountBig === 0n || isPending}
        className="rounded-md bg-ink px-4 py-2 text-sm text-parchment disabled:opacity-40"
      >
        {isPending ? "Confirmando…" : "Comprar"}
      </button>
    </div>
  );
}
