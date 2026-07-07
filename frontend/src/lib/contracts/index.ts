import type { Abi } from "viem";
import PhilaNumisCoreAbi from "./abis/PhilaNumisCore.json";
import LiquidityVaultAbi from "./abis/LiquidityVault.json";
import FixedPriceSaleAbi from "./abis/FixedPriceSale.json";
import RedemptionVaultAbi from "./abis/RedemptionVault.json";
import CustodyOracleAbi from "./abis/CustodyOracle.json";
import QuestEngineAbi from "./abis/QuestEngine.json";
import { CONTRACT_ADDRESSES } from "./addresses";

// USDC é um ERC-20 padrão — só precisamos do subconjunto de funções que a UI usa (approve/allowance/balanceOf).
const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/// Cada entrada combina endereço + ABI, prontos para `useReadContract`/`useWriteContract` do wagmi.
/// Cast explícito para `Abi`: imports de JSON não são const-asserted, então o TS infere `type` como
/// `string` largo em vez do literal `"function"`/`"event"` etc — isso quebra a checagem estrita que
/// o wagmi faz em `useReadContracts` (array de calls), mesmo funcionando bem em chamadas únicas.
export const contracts = {
  core: { address: CONTRACT_ADDRESSES.core, abi: PhilaNumisCoreAbi as Abi },
  liquidityVault: { address: CONTRACT_ADDRESSES.liquidityVault, abi: LiquidityVaultAbi as Abi },
  fixedPriceSale: { address: CONTRACT_ADDRESSES.fixedPriceSale, abi: FixedPriceSaleAbi as Abi },
  redemptionVault: { address: CONTRACT_ADDRESSES.redemptionVault, abi: RedemptionVaultAbi as Abi },
  custodyOracle: { address: CONTRACT_ADDRESSES.custodyOracle, abi: CustodyOracleAbi as Abi },
  questEngine: { address: CONTRACT_ADDRESSES.questEngine, abi: QuestEngineAbi as Abi },
  usdc: { address: CONTRACT_ADDRESSES.usdc, abi: ERC20_ABI as Abi },
} as const;
