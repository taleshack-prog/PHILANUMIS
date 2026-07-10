import { useAccount, useReadContracts } from "wagmi";
import { contracts } from "@/lib/contracts";
import { keccak256, toBytes } from "viem";

// keccak256("CURATOR_ROLE") e keccak256("QUEST_MASTER_ROLE") — calculados aqui em vez de lidos
// do contrato pra poder usar em `useReadContracts` sem uma chamada extra só pra pegar o hash.
const CURATOR_ROLE = keccak256(toBytes("CURATOR_ROLE"));
const QUEST_MASTER_ROLE = keccak256(toBytes("QUEST_MASTER_ROLE"));
const DEFAULT_ADMIN_ROLE = ("0x" + "0".repeat(64)) as `0x${string}`; // bytes32(0), padrão do OpenZeppelin AccessControl

/// Admin = tem CURATOR_ROLE (LiquidityVault ou FixedPriceSale), QUEST_MASTER_ROLE (QuestEngine),
/// ou DEFAULT_ADMIN_ROLE no Core (cobre o deployer, que tem tudo por padrão). Qualquer uma dessas
/// já é suficiente pra acessar o /admin — as páginas individuais escondem os botões que o usuário
/// específico não tem permissão de executar on-chain de qualquer forma (a real barreira de
/// segurança é o `onlyRole` do contrato, isso aqui é só UX pra não mostrar um painel vazio).
export function useIsAdmin() {
  const { address, isConnected } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...contracts.liquidityVault, functionName: "hasRole", args: [CURATOR_ROLE, address] },
      { ...contracts.fixedPriceSale, functionName: "hasRole", args: [CURATOR_ROLE, address] },
      { ...contracts.questEngine, functionName: "hasRole", args: [QUEST_MASTER_ROLE, address] },
      { ...contracts.core, functionName: "hasRole", args: [DEFAULT_ADMIN_ROLE, address] },
    ],
    query: { enabled: isConnected && Boolean(address) },
  });

  const isAdmin = (data ?? []).some((r) => r.status === "success" && r.result === true);

  return { isAdmin, isLoading: isConnected ? isLoading : false, isConnected };
}
