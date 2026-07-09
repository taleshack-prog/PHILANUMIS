"use client";

import { usePrivy } from "@privy-io/react-auth";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button disabled className="rounded-md border border-border px-4 py-2 text-sm text-ink-dim">
        Carregando…
      </button>
    );
  }

  if (authenticated) {
    const label = user?.wallet?.address
      ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
      : (user?.email?.address ?? "Conta conectada");

    return (
      <button
        onClick={logout}
        className="rounded-md border border-circuit/40 px-4 py-2 font-mono text-sm text-circuit transition-colors hover:border-circuit"
        title="Clique para sair"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-md bg-bronze px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-bronze-bright"
    >
      Entrar
    </button>
  );
}
