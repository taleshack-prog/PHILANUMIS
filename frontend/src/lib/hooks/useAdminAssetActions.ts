import { usePublicClient, useWriteContract } from "wagmi";
import { parseUnits } from "viem";
import { contracts } from "@/lib/contracts";

const USDC_DECIMALS = 6;

export function useAdminAssetActions() {
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient();

  async function createAsset(metadataURI: string, totalFractions: bigint) {
    return writeContractAsync({
      ...contracts.core,
      functionName: "createAsset",
      args: [metadataURI, totalFractions],
    });
  }

  /// Cria o ativo, espera a transação confirmar on-chain, e lê `tokenCounter()` logo em seguida —
  /// como ele é auto-incrementado, esse é o tokenId do ativo que acabamos de criar. Evita o
  /// usuário ter que ir manualmente no explorador de blocos descobrir o ID.
  async function createAssetAndGetId(metadataURI: string, totalFractions: bigint): Promise<bigint> {
    const hash = await createAsset(metadataURI, totalFractions);
    if (!publicClient) throw new Error("Cliente RPC indisponível.");
    await publicClient.waitForTransactionReceipt({ hash });
    const tokenId = await publicClient.readContract({
      ...contracts.core,
      functionName: "tokenCounter",
    });
    return tokenId as bigint;
  }

  async function initBondingCurve(
    tokenId: bigint,
    mPerFraction: string,
    bBase: string,
    mintFeeBps: bigint,
    marketplaceFeeBps: bigint,
    captationCapUsdc: string
  ) {
    return writeContractAsync({
      ...contracts.liquidityVault,
      functionName: "initCurve",
      args: [
        tokenId,
        parseUnits(mPerFraction, USDC_DECIMALS),
        parseUnits(bBase, USDC_DECIMALS),
        mintFeeBps,
        marketplaceFeeBps,
        captationCapUsdc ? parseUnits(captationCapUsdc, USDC_DECIMALS) : 0n,
      ],
    });
  }

  async function listFixedPrice(
    tokenId: bigint,
    pricePerFraction: string,
    mintFeeBps: bigint,
    captationCapUsdc: string
  ) {
    return writeContractAsync({
      ...contracts.fixedPriceSale,
      functionName: "listAsset",
      args: [
        tokenId,
        parseUnits(pricePerFraction, USDC_DECIMALS),
        mintFeeBps,
        captationCapUsdc ? parseUnits(captationCapUsdc, USDC_DECIMALS) : 0n,
      ],
    });
  }

  return { createAsset, createAssetAndGetId, initBondingCurve, listFixedPrice, isPending };
}
