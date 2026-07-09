import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";
import { useSaleMode } from "./useAsset";

const USDC_DECIMALS = 6;

/// Retorna o preço de exibição (1 fração) do ativo, na modalidade correta — marginal para
/// bonding curve (m·s + b no supply atual), ou o preço fixo para Fixed Price.
export function useCurrentPrice(tokenId: bigint) {
  const { mode, isLoading: modeLoading } = useSaleMode(tokenId);

  const { data: curve, isLoading: curveLoading } = useReadContract({
    ...contracts.liquidityVault,
    functionName: "curves",
    args: [tokenId],
    query: { enabled: mode === "bonding-curve" },
  });

  const { data: asset } = useReadContract({
    ...contracts.core,
    functionName: "assets",
    args: [tokenId],
    query: { enabled: mode === "bonding-curve" },
  });

  const { data: listing, isLoading: listingLoading } = useReadContract({
    ...contracts.fixedPriceSale,
    functionName: "listings",
    args: [tokenId],
    query: { enabled: mode === "fixed-price" },
  });

  if (mode === "bonding-curve" && curve && asset) {
    const m = Number((curve as any)[0]) / 10 ** USDC_DECIMALS;
    const b = Number((curve as any)[1]) / 10 ** USDC_DECIMALS;
    const supply = Number((asset as any)[2]);
    return { price: m * supply + b, isLoading: modeLoading || curveLoading, mode };
  }

  if (mode === "fixed-price" && listing) {
    const price = Number((listing as any)[0]) / 10 ** USDC_DECIMALS;
    return { price, isLoading: modeLoading || listingLoading, mode };
  }

  return { price: undefined, isLoading: modeLoading || curveLoading || listingLoading, mode };
}
