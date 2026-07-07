"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useSellFlow, useSellQuote } from "@/lib/hooks/useBuyFlow";
import { extractRevertReason } from "@/lib/errors";

const USDC_DECIMALS = 6;
const SLIPPAGE_BPS = 100n;

export function SellWidget({ tokenId }: { tokenId: bigint }) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const amountBig = amount ? BigInt(amount) : 0n;

  const { grossPayout, netPayout, isLoading: quoteLoading } = useSellQuote(tokenId, amountBig, address);
  const { sell, isPending } = useSellFlow(tokenId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const minPayout = netPayout - (netPayout * SLIPPAGE_BPS) / 10_000n;

  async function handleSell() {
    if (amountBig === 0n) return;
    setErrorMessage(null);
    try {
      await sell(amountBig, minPayout);
    } catch (err) {
      // Reverts do contrato (ex: "amount excede supply circulante") chegam aqui na mensagem —
      // mostramos direto pro usuário em vez de deixar só no console.
      setErrorMessage(extractRevertReason(err));
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <span className="text-xs uppercase tracking-wide text-gray-500">Vender frações</span>

      <label className="flex flex-col gap-1 text-sm">
        Quantidade de frações
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border px-3 py-2"
        />
      </label>

      {amountBig > 0n && !quoteLoading && (
        <div className="text-sm text-gray-600">
          <p>Retorno (sem taxa): {formatUnits(grossPayout, USDC_DECIMALS)} USDC</p>
          <p className="font-medium text-ink">Você recebe: {formatUnits(netPayout, USDC_DECIMALS)} USDC</p>
        </div>
      )}

      {errorMessage && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      <button
        onClick={handleSell}
        disabled={amountBig === 0n || isPending}
        className="rounded-md border border-ink px-4 py-2 text-sm text-ink disabled:opacity-40"
      >
        {isPending ? "Confirmando…" : "Vender"}
      </button>
    </div>
  );
}
