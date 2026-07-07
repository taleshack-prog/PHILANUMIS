import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";

/// Lista todas as séries existentes lendo `seriesCounter` (auto-incrementado a cada
/// `registerSeries`) e buscando `series(1..N)` via multicall — mesmo padrão do `useAllAssets`.
export function useAllSeries() {
  const { data: seriesCounter, isLoading: countLoading } = useReadContract({
    ...contracts.questEngine,
    functionName: "seriesCounter",
  });

  const count = seriesCounter ? Number(seriesCounter as bigint) : 0;
  const seriesIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  const { data, isLoading: seriesLoading } = useReadContracts({
    contracts: seriesIds.map((id) => ({ ...contracts.questEngine, functionName: "series", args: [id] })),
    query: { enabled: count > 0 },
  });

  const seriesList = seriesIds
    .map((id, i) => {
      const result = data?.[i];
      if (result?.status !== "success") return undefined;
      return { seriesId: id, name: (result.result as any)[0] as string };
    })
    .filter((s): s is { seriesId: bigint; name: string } => s !== undefined);

  return { seriesList, isLoading: countLoading || seriesLoading };
}

export function useSeriesProgress(seriesId: bigint) {
  const { address } = useAccount();

  const { data: series } = useReadContract({
    ...contracts.questEngine,
    functionName: "series",
    args: [seriesId],
  });

  const { data: completionBps } = useReadContract({
    ...contracts.questEngine,
    functionName: "completionBps",
    args: address ? [seriesId, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: currentTier } = useReadContract({
    ...contracts.questEngine,
    functionName: "highestTierAchieved",
    args: address ? [seriesId, address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  async function claimNextTier() {
    if (!address) return;
    return writeContractAsync({
      ...contracts.questEngine,
      functionName: "checkAndAwardBadges",
      args: [seriesId, address],
    });
  }

  return {
    name: (series as any)?.[0] as string | undefined,
    completionPct: completionBps ? Number(completionBps as bigint) / 100 : 0,
    currentTier: currentTier ? Number(currentTier as number) : 0, // 0 = nenhum tier ainda
    claimNextTier,
    isPending,
  };
}
