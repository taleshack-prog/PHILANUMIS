"use client";

import { usePrivy } from "@privy-io/react-auth";

export function ConnectButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <button disabled className="rounded-md border px-4 py-2 text-sm opacity-50">
        Carregando…
      </button>
    );
  }

  if (authenticated) {
    const label =
      user?.wallet?.address
        ? `${user.wallet.address.slice(0, 6)}…${user.wallet.address.slice(-4)}`
        : user?.email?.address ?? "Conta conectada";

    return (
      <button
        onClick={logout}
        className="rounded-md border px-4 py-2 text-sm hover:bg-black/5"
        title="Clique para sair"
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-md bg-ink px-4 py-2 text-sm text-parchment hover:opacity-90"
    >
      Entrar
    </button>
  );
}
