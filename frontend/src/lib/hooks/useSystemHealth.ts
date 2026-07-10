import { useReadContract, useReadContracts } from "wagmi";
import { contracts } from "@/lib/contracts";
import { useAllAssets } from "./useAsset";

const USDC_DECIMALS = 6;

export interface AssetHealth {
  tokenId: bigint;
  totalFractions: bigint;
  circulatingSupply: bigint;
  isRedeemed: boolean;
  mode: "bonding-curve" | "fixed-price" | "unconfigured";
  totalRaised: number;
  captationCap: number; // 0 = sem teto
  custodyValid: boolean;
  redemptionStatus: number; // 0=None 1=Requested 2=Confirmed 3=Shipped
}

export function useSystemHealth() {
  const { assets, isLoading: assetsLoading } = useAllAssets();

  const { data: vaultUsdcBalance } = useReadContract({
    ...contracts.usdc,
    functionName: "balanceOf",
    args: [contracts.liquidityVault.address],
  });
  const { data: outstandingCredits } = useReadContract({
    ...contracts.liquidityVault,
    functionName: "totalOutstandingCredits",
  });

  const tokenIds = assets.map((a) => a.tokenId);

  const { data, isLoading: detailsLoading } = useReadContracts({
    contracts: tokenIds.flatMap((id) => [
      { ...contracts.liquidityVault, functionName: "curves", args: [id] },
      { ...contracts.liquidityVault, functionName: "totalRaised", args: [id] },
      { ...contracts.fixedPriceSale, functionName: "listings", args: [id] },
      { ...contracts.fixedPriceSale, functionName: "totalRaised", args: [id] },
      { ...contracts.custodyOracle, functionName: "isBackingValid", args: [id] },
      { ...contracts.redemptionVault, functionName: "requests", args: [id] },
    ]),
    query: { enabled: tokenIds.length > 0 },
  });

  const assetHealth: AssetHealth[] = assets.map((asset, i) => {
    const base = i * 6;
    const curve = data?.[base];
    const curveRaised = data?.[base + 1];
    const listing = data?.[base + 2];
    const listingRaised = data?.[base + 3];
    const custody = data?.[base + 4];
    const redemption = data?.[base + 5];

    const curveInitialized = curve?.status === "success" && (curve.result as any)?.[5] === true;
    const listingInitialized = listing?.status === "success" && (listing.result as any)?.[3] === true;

    const mode: AssetHealth["mode"] = curveInitialized
      ? "bonding-curve"
      : listingInitialized
        ? "fixed-price"
        : "unconfigured";

    const totalRaisedRaw =
      mode === "bonding-curve"
        ? curveRaised?.status === "success"
          ? (curveRaised.result as bigint)
          : 0n
        : mode === "fixed-price"
          ? listingRaised?.status === "success"
            ? (listingRaised.result as bigint)
            : 0n
          : 0n;

    const capRaw =
      mode === "bonding-curve"
        ? curveInitialized
          ? ((curve!.result as any)[4] as bigint)
          : 0n
        : mode === "fixed-price"
          ? listingInitialized
            ? ((listing!.result as any)[2] as bigint)
            : 0n
          : 0n;

    return {
      tokenId: asset.tokenId,
      totalFractions: asset.totalFractions,
      circulatingSupply: asset.circulatingSupply,
      isRedeemed: asset.isRedeemed,
      mode,
      totalRaised: Number(totalRaisedRaw) / 10 ** USDC_DECIMALS,
      captationCap: Number(capRaw) / 10 ** USDC_DECIMALS,
      custodyValid: custody?.status === "success" ? (custody.result as boolean) : false,
      redemptionStatus: redemption?.status === "success" ? Number((redemption.result as any)[2]) : 0,
    };
  });

  return {
    assetHealth,
    vaultUsdcBalance: vaultUsdcBalance ? Number(vaultUsdcBalance as bigint) / 10 ** USDC_DECIMALS : 0,
    outstandingCredits: outstandingCredits ? Number(outstandingCredits as bigint) / 10 ** USDC_DECIMALS : 0,
    isLoading: assetsLoading || detailsLoading,
  };
}
