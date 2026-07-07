import { createConfig } from "@privy-io/wagmi";
import { http } from "viem";
import { SUPPORTED_CHAINS, RPC_URLS } from "./chains";

/// wagmi config "puro", sem connectors próprios — o Privy injeta os connectors dele
/// (wallet externa OU embedded wallet via email/social) por cima disso. Ver providers.tsx.
export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  transports: {
    [SUPPORTED_CHAINS[0].id]: http(RPC_URLS[SUPPORTED_CHAINS[0].id]),
    [SUPPORTED_CHAINS[1].id]: http(RPC_URLS[SUPPORTED_CHAINS[1].id]),
  },
});
