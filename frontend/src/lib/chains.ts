import { base, baseSepolia } from "viem/chains";

export const SUPPORTED_CHAINS = [base, baseSepolia] as const;

export const ACTIVE_CHAIN =
  process.env.NEXT_PUBLIC_ACTIVE_NETWORK === "base" ? base : baseSepolia;

export const RPC_URLS: Record<number, string> = {
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL ?? base.rpcUrls.default.http[0],
  [baseSepolia.id]:
    process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? baseSepolia.rpcUrls.default.http[0],
};
