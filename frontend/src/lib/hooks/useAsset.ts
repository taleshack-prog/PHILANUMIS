import { useReadContract, useReadContracts } from "wagmi";
import { contracts } from "@/lib/contracts";

export interface AssetData {
  tokenId: bigint;
  metadataURI: string;
  totalFractions: bigint;
  circulatingSupply: bigint;
  isRedeemed: boolean;
}

/// Lê o ativo diretamente do PhilaNumisCore. As telas de compra então checam, em paralelo,
/// se existe uma curva inicializada no LiquidityVault OU um listing no FixedPriceSale —
/// um ativo usa uma modalidade OU outra, nunca as duas (ver playbook, seção 3.1).
export function useAsset(tokenId: bigint) {
  const { data, isLoading, error } = useReadContract({
    ...contracts.core,
    functionName: "assets",
    args: [tokenId],
  });

  const asset: AssetData | undefined = data
    ? {
        tokenId,
        metadataURI: (data as any)[0],
        totalFractions: (data as any)[1],
        circulatingSupply: (data as any)[2],
        isRedeemed: (data as any)[3],
      }
    : undefined;

  return { asset, isLoading, error };
}

export type SaleMode = "bonding-curve" | "fixed-price" | "unconfigured" | "conflicting";

/// Descobre qual modalidade de venda está ativa para o ativo, consultando os dois contratos
/// em paralelo. Retorna no máximo uma modalidade "initialized" — se vier as duas, é um bug de
/// setup (curador configurou errado) e a UI deveria alertar, não escolher uma arbitrariamente.
export function useSaleMode(tokenId: bigint) {
  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...contracts.liquidityVault, functionName: "curves", args: [tokenId] },
      { ...contracts.fixedPriceSale, functionName: "listings", args: [tokenId] },
    ],
  });

  const curveInitialized = data?.[0]?.status === "success" && (data[0].result as any)?.[5] === true;
  const listingInitialized = data?.[1]?.status === "success" && (data[1].result as any)?.[3] === true;

  const mode: SaleMode =
    curveInitialized && listingInitialized
      ? "conflicting"
      : curveInitialized
        ? "bonding-curve"
        : listingInitialized
          ? "fixed-price"
          : "unconfigured";

  return { mode, isLoading };
}
