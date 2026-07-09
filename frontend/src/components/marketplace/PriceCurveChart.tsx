"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceDot,
  CartesianGrid,
} from "recharts";
import { useCurveChartData } from "@/lib/hooks/useCurveChart";
import { Card } from "@/components/ui/Card";

export function PriceCurveChart({ tokenId }: { tokenId: bigint }) {
  const { points, currentSupply, isLoading } = useCurveChartData(tokenId);

  if (isLoading) return <p className="text-sm text-ink-dim">Carregando curva…</p>;
  if (points.length === 0) return null;

  const currentPoint = points.reduce((closest, p) =>
    Math.abs(p.supply - currentSupply) < Math.abs(closest.supply - currentSupply) ? p : closest
  );

  return (
    <Card>
      <span className="font-mono text-xs uppercase tracking-wide text-circuit">
        Curva de preço (marginal)
      </span>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="#262B33" vertical={false} />
            <XAxis
              dataKey="supply"
              tick={{ fill: "#9A9FA8", fontSize: 11 }}
              stroke="#262B33"
              label={{ value: "Frações emitidas", position: "insideBottom", offset: -4, fill: "#9A9FA8", fontSize: 11 }}
            />
            <YAxis
              tick={{ fill: "#9A9FA8", fontSize: 11 }}
              stroke="#262B33"
              width={56}
              label={{ value: "USDC", angle: -90, position: "insideLeft", fill: "#9A9FA8", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: "#14171C", border: "1px solid #262B33", borderRadius: 8 }}
              labelStyle={{ color: "#9A9FA8" }}
              itemStyle={{ color: "#EDE6D6" }}
              formatter={(value) => [`${Number(value).toFixed(4)} USDC`, "Preço marginal"]}
              labelFormatter={(supply) => `Supply: ${supply}`}
            />
            <Line type="monotone" dataKey="price" stroke="#C08A4E" strokeWidth={2} dot={false} />
            <ReferenceDot
              x={currentPoint.supply}
              y={currentPoint.price}
              r={5}
              fill="#46E0C4"
              stroke="#0B0D10"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 font-mono text-xs text-ink-dim">
        ● ponto verde = supply atual ({currentSupply} frações)
      </p>
    </Card>
  );
}
