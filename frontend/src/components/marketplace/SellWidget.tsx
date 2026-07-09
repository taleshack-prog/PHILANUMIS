"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { useSellFlow, useSellQuote } from "@/lib/hooks/useBuyFlow";
import { extractRevertReason } from "@/lib/errors";
import { Card, InfoBox, Input } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      setErrorMessage(extractRevertReason(err));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <span className="font-mono text-xs uppercase tracking-wide text-ink-dim">Vender frações</span>

      <label className="flex flex-col gap-1 text-sm text-ink">
        Quantidade de frações
        <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>

      {amountBig > 0n && !quoteLoading && (
        <div className="font-mono text-sm text-ink-dim">
          <p>Retorno (sem taxa): {formatUnits(grossPayout, USDC_DECIMALS)} USDC</p>
          <p className="font-medium text-ink">Você recebe: {formatUnits(netPayout, USDC_DECIMALS)} USDC</p>
        </div>
      )}

      {errorMessage && <InfoBox tone="danger">{errorMessage}</InfoBox>}

      <Button variant="secondary" onClick={handleSell} disabled={amountBig === 0n || isPending}>
        {isPending ? "Confirmando…" : "Vender"}
      </Button>
    </Card>
  );
}
