import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { contracts } from "@/lib/contracts";
import type { SaleMode } from "./useAsset";

/// Encapsula o fluxo de duas transações (approve USDC → buy) que todo comprador precisa fazer,
/// independente da modalidade. A UI só precisa chamar `buy(amount)` e reagir a `step`.
export function useBuyFlow(tokenId: bigint, mode: Extract<SaleMode, "bonding-curve" | "fixed-price">) {
  const { address } = useAccount();
  const target = mode === "bonding-curve" ? contracts.liquidityVault : contracts.fixedPriceSale;

  const { data: allowance } = useReadContract({
    ...contracts.usdc,
    functionName: "allowance",
    args: address ? [address, target.address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  async function approve(amount: bigint) {
    return writeContractAsync({
      ...contracts.usdc,
      functionName: "approve",
      args: [target.address, amount],
    });
  }

  async function buy(amount: bigint, maxCost: bigint) {
    return writeContractAsync({
      ...target,
      functionName: "buy",
      args: [tokenId, amount, maxCost],
    });
  }

  const needsApproval = (maxCost: bigint) => (allowance ?? 0n) < maxCost;

  return { approve, buy, needsApproval, isPending };
}

/// Cotação: usa quoteBuy do contrato certo. As duas funções têm a mesma assinatura de retorno
/// (grossCost, totalCost), então o hook fica idêntico independente da modalidade.
export function useBuyQuote(
  tokenId: bigint,
  amount: bigint,
  mode: Extract<SaleMode, "bonding-curve" | "fixed-price">
) {
  const target = mode === "bonding-curve" ? contracts.liquidityVault : contracts.fixedPriceSale;

  const { data, isLoading } = useReadContract({
    ...target,
    functionName: "quoteBuy",
    args: [tokenId, amount],
    query: { enabled: amount > 0n },
  });

  const [grossCost, totalCost] = (data as [bigint, bigint] | undefined) ?? [0n, 0n];
  return { grossCost, totalCost, isLoading };
}
