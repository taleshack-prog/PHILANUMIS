import { useReadContract, useReadContracts } from "wagmi";
import { contracts } from "@/lib/contracts";

export interface AssetData {
  tokenId: bigint;
  metadataURI: string;
  totalFractions: bigint;
  circulatingSupply: bigint;
  isRedeemed: boolean;
}

export interface OwnedAsset extends AssetData {
  balance: bigint;
  ownsAll: boolean;
}

/// Cruza `useAllAssets` com o saldo do usuário conectado em cada tokenId, via multicall.
/// Reaproveita a mesma limitação de escala documentada em `useAllAssets` — ok para o MVP.
export function useMyPortfolio(userAddress: `0x${string}` | undefined) {
  const { assets, isLoading: assetsLoading } = useAllAssets();

  const { data: balances, isLoading: balancesLoading } = useReadContracts({
    contracts: assets.map((a) => ({
      ...contracts.core,
      functionName: "balanceOf",
      args: [userAddress, a.tokenId],
    })),
    query: { enabled: Boolean(userAddress) && assets.length > 0 },
  });

  const owned: OwnedAsset[] = assets
    .map((asset, i) => {
      const result = balances?.[i];
      const balance = result?.status === "success" ? (result.result as bigint) : 0n;
      return { ...asset, balance, ownsAll: balance > 0n && balance === asset.totalFractions };
    })
    .filter((a) => a.balance > 0n);

  return { owned, isLoading: assetsLoading || balancesLoading };
}

/// Lista todos os ativos existentes lendo `tokenCounter` (auto-incrementado no Core a cada
/// `createAsset`) e buscando `assets(1..N)` em uma única chamada multicall. Funciona bem para a
/// escala do MVP (dezenas de ativos); se o catálogo crescer para milhares, migrar para um indexer
/// de eventos (subgraph) evita o custo de recarregar tudo a cada visita.
export function useAllAssets() {
  const { data: tokenCounter, isLoading: countLoading } = useReadContract({
    ...contracts.core,
    functionName: "tokenCounter",
  });

  const count = tokenCounter ? Number(tokenCounter as bigint) : 0;
  const tokenIds = Array.from({ length: count }, (_, i) => BigInt(i + 1));

  const { data, isLoading: assetsLoading } = useReadContracts({
    contracts: tokenIds.map((id) => ({ ...contracts.core, functionName: "assets", args: [id] })),
    query: { enabled: count > 0 },
  });

  const assets: AssetData[] = (data ?? [])
    .map((result, i) => {
      if (result.status !== "success") return undefined;
      const r = result.result as any;
      return {
        tokenId: tokenIds[i],
        metadataURI: r[0] as string,
        totalFractions: r[1] as bigint,
        circulatingSupply: r[2] as bigint,
        isRedeemed: r[3] as boolean,
      };
    })
    .filter((a): a is AssetData => a !== undefined);

  return { assets, isLoading: countLoading || assetsLoading };
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
