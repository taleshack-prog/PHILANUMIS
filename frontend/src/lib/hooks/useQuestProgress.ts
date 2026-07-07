import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";

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
