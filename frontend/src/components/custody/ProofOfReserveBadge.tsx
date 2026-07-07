"use client";

import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export function ProofOfReserveBadge({ tokenId }: { tokenId: bigint }) {
  const { data: isValid, isLoading } = useReadContract({
    ...contracts.custodyOracle,
    functionName: "isBackingValid",
    args: [tokenId],
  });

  if (isLoading) return <span className="text-xs text-gray-500">Verificando custódia…</span>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
        isValid ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isValid ? "bg-green-600" : "bg-red-600"}`} />
      {isValid ? "Custódia verificada" : "Attestação desatualizada ou ausente"}
    </span>
  );
}
