import type { Address } from "viem";

function requireAddress(envVar: string | undefined, name: string): Address {
  if (!envVar) {
    // Em dev, retorna o endereço zero em vez de derrubar a app inteira — mais fácil de iterar na UI
    // antes do deploy estar pronto. Em produção, isso deveria ser validado no build.
    console.warn(`[contracts] ${name} não configurado em .env — usando endereço zero.`);
    return "0x0000000000000000000000000000000000000000";
  }
  return envVar as Address;
}

export const CONTRACT_ADDRESSES = {
  core: requireAddress(process.env.NEXT_PUBLIC_CORE_ADDRESS, "NEXT_PUBLIC_CORE_ADDRESS"),
  liquidityVault: requireAddress(
    process.env.NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS,
    "NEXT_PUBLIC_LIQUIDITY_VAULT_ADDRESS"
  ),
  fixedPriceSale: requireAddress(
    process.env.NEXT_PUBLIC_FIXED_PRICE_SALE_ADDRESS,
    "NEXT_PUBLIC_FIXED_PRICE_SALE_ADDRESS"
  ),
  redemptionVault: requireAddress(
    process.env.NEXT_PUBLIC_REDEMPTION_VAULT_ADDRESS,
    "NEXT_PUBLIC_REDEMPTION_VAULT_ADDRESS"
  ),
  custodyOracle: requireAddress(
    process.env.NEXT_PUBLIC_CUSTODY_ORACLE_ADDRESS,
    "NEXT_PUBLIC_CUSTODY_ORACLE_ADDRESS"
  ),
  questEngine: requireAddress(
    process.env.NEXT_PUBLIC_QUEST_ENGINE_ADDRESS,
    "NEXT_PUBLIC_QUEST_ENGINE_ADDRESS"
  ),
  usdc: requireAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS, "NEXT_PUBLIC_USDC_ADDRESS"),
} as const;
