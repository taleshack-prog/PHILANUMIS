"use client";

import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export function ProofOfReserveBadge({ tokenId }: { tokenId: bigint }) {
  const { data: isValid, isLoading } = useReadContract({
    ...contracts.custodyOracle,
    functionName: "isBackingValid",
    args: [tokenId],
  });

  if (isLoading) return <span className="text-xs text-ink-dim">Verificando custódia…</span>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs ${
        isValid ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isValid ? "bg-success" : "bg-danger"}`} />
      {isValid ? "Custódia verificada" : "Attestação desatualizada ou ausente"}
    </span>
  );
}
