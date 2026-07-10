"use client";

import { useSystemHealth } from "@/lib/hooks/useSystemHealth";
import { Card } from "@/components/ui/Card";

const REDEMPTION_LABELS = ["—", "Aguardando confirmação", "Confirmado", "Despachado"];

export default function AdminHealthPage() {
  const { assetHealth, vaultUsdcBalance, outstandingCredits, isLoading } = useSystemHealth();

  const freeTreasuryBalance = vaultUsdcBalance - outstandingCredits;

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Saúde do sistema</h1>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <span className="font-mono text-xs uppercase text-ink-dim">USDC no LiquidityVault</span>
          <p className="mt-1 font-mono text-xl text-ink">{vaultUsdcBalance.toFixed(2)}</p>
        </Card>
        <Card>
          <span className="font-mono text-xs uppercase text-ink-dim">Créditos de cashback pendentes</span>
          <p className="mt-1 font-mono text-xl text-warning">{outstandingCredits.toFixed(2)}</p>
        </Card>
        <Card>
          <span className="font-mono text-xs uppercase text-ink-dim">Livre para sacar (withdrawTreasury)</span>
          <p className="mt-1 font-mono text-xl text-circuit">{freeTreasuryBalance.toFixed(2)}</p>
        </Card>
      </div>

      <h2 className="mt-8 font-display text-lg text-ink">Ativos</h2>
      {isLoading && <p className="mt-2 text-sm text-ink-dim">Carregando…</p>}

      <div className="mt-4 flex flex-col gap-3">
        {assetHealth.map((a) => {
          const capPct = a.captationCap > 0 ? (a.totalRaised / a.captationCap) * 100 : null;
          return (
            <Card key={a.tokenId.toString()} className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="font-display text-ink">#{a.tokenId.toString()}</span>

              <span className="font-mono text-xs text-ink-dim">
                {a.circulatingSupply.toString()}/{a.totalFractions.toString()} frações
              </span>

              <span className="font-mono text-xs text-ink-dim">
                Modalidade: <span className="text-ink">{a.mode}</span>
              </span>

              <span className="font-mono text-xs text-ink-dim">
                Captado: <span className="text-ink">{a.totalRaised.toFixed(2)} USDC</span>
                {capPct !== null && (
                  <span className={capPct >= 100 ? "text-danger" : "text-ink"}> ({capPct.toFixed(1)}% do teto)</span>
                )}
                {capPct === null && <span className="text-warning"> (sem teto definido)</span>}
              </span>

              <span
                className={`rounded-full px-2 py-0.5 font-mono text-xs ${
                  a.custodyValid ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
                }`}
              >
                {a.custodyValid ? "Custódia OK" : "Custódia inválida"}
              </span>

              {a.redemptionStatus > 0 && (
                <span className="rounded-full bg-warning-bg px-2 py-0.5 font-mono text-xs text-warning">
                  Resgate: {REDEMPTION_LABELS[a.redemptionStatus]}
                </span>
              )}

              {a.isRedeemed && (
                <span className="rounded-full bg-background px-2 py-0.5 font-mono text-xs text-ink-dim">
                  Já resgatado
                </span>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
