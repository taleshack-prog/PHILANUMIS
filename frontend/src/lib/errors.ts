/// wagmi/viem embrulham o motivo do revert em várias camadas de erro (ContractFunctionExecutionError
/// → ContractFunctionRevertedError). Isso extrai só a mensagem `require(...)` do Solidity, que é o
/// que realmente importa pro usuário — o resto (nomes de função, seletores, stack) é ruído.
export function extractRevertReason(err: unknown): string {
  if (err && typeof err === "object" && "shortMessage" in err) {
    const short = (err as { shortMessage: string }).shortMessage;
    const match = short.match(/reverted with the following reason:\s*(.+)/i);
    return match?.[1] ?? short;
  }
  return "Não foi possível completar a transação. Tente novamente.";
}
