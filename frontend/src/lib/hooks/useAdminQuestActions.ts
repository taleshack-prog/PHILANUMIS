import { useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export function useAdminQuestActions() {
  const { writeContractAsync, isPending } = useWriteContract();

  async function registerSeries(name: string, tokenIds: bigint[]) {
    return writeContractAsync({
      ...contracts.questEngine,
      functionName: "registerSeries",
      args: [name, tokenIds],
    });
  }

  return { registerSeries, isPending };
}
