import { useReadContract } from "wagmi";
import { contracts } from "@/lib/contracts";

export interface CurvePoint {
  supply: number;
  price: number;
}

const USDC_DECIMALS = 6;
const POINTS = 60;

/// Lê `m`, `b` (parâmetros da curva) e `totalFractions` (teto do eixo X) direto da chain, e gera
/// os pontos de `preço marginal = m·s + b` para plotar. É matemática pura sobre dados já lidos —
/// não depende de histórico de negociações (isso é o gráfico futuro, que precisa de indexação).
export function useCurveChartData(tokenId: bigint) {
  const { data: curve, isLoading: curveLoading } = useReadContract({
    ...contracts.liquidityVault,
    functionName: "curves",
    args: [tokenId],
  });

  const { data: asset, isLoading: assetLoading } = useReadContract({
    ...contracts.core,
    functionName: "assets",
    args: [tokenId],
  });

  if (!curve || !asset) {
    return { points: [] as CurvePoint[], currentSupply: 0, isLoading: curveLoading || assetLoading };
  }

  const m = Number((curve as any)[0]) / 10 ** USDC_DECIMALS;
  const b = Number((curve as any)[1]) / 10 ** USDC_DECIMALS;
  const totalFractions = Number((asset as any)[1]);
  const currentSupply = Number((asset as any)[2]);

  const points: CurvePoint[] = Array.from({ length: POINTS + 1 }, (_, i) => {
    const supply = (totalFractions * i) / POINTS;
    return { supply: Math.round(supply), price: m * supply + b };
  });

  return { points, currentSupply, totalFractions, isLoading: false };
}
