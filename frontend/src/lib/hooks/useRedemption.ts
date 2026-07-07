import { keccak256, toBytes } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export function useRedemption(tokenId: bigint) {
  const { address } = useAccount();

  const { data: ownedBalance } = useReadContract({
    ...contracts.core,
    functionName: "balanceOf",
    args: address ? [address, tokenId] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { data: totalFractions } = useReadContract({
    ...contracts.core,
    functionName: "totalFractionsOf",
    args: [tokenId],
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const ownsAll =
    ownedBalance !== undefined && totalFractions !== undefined && ownedBalance === totalFractions;

  /// O conteúdo real (endereço de entrega, documento) NUNCA vai on-chain — só o hash.
  /// O texto revelado precisa ser enviado à Hack Tech Farm por um canal privado (fora desta app),
  /// que confirma o hash batendo antes de despachar. Ver RedemptionVault.sol para o porquê.
  function hashShippingInfo(shippingInfoPlainText: string): `0x${string}` {
    return keccak256(toBytes(shippingInfoPlainText));
  }

  async function requestRedemption(shippingInfoHash: `0x${string}`, appraisalValueUsdc: bigint) {
    return writeContractAsync({
      ...contracts.redemptionVault,
      functionName: "requestRedemption",
      args: [tokenId, shippingInfoHash, appraisalValueUsdc],
    });
  }

  return { ownsAll, ownedBalance, totalFractions, hashShippingInfo, requestRedemption, isPending };
}
