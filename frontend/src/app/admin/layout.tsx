"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";
import { ConnectButton } from "@/components/wallet/ConnectButton";

const ADMIN_SECTIONS = [
  { href: "/admin/health", label: "Saúde do sistema" },
  { href: "/admin/assets", label: "Tokenização" },
  { href: "/admin/gamification", label: "Gamificação" },
  { href: "/admin/blog", label: "Blog" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, isConnected } = useIsAdmin();
  const pathname = usePathname();

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-ink-dim">Conecte a carteira com permissão de curador para acessar o painel.</p>
        <div className="mt-4 flex justify-center">
          <ConnectButton />
        </div>
      </main>
    );
  }

  if (isLoading) {
    return <p className="mx-auto max-w-md px-6 py-20 text-center text-sm text-ink-dim">Verificando permissões…</p>;
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-danger">
          Essa carteira não tem nenhuma role de administração nos contratos (CURATOR_ROLE,
          QUEST_MASTER_ROLE ou DEFAULT_ADMIN_ROLE). Conecte a carteira certa.
        </p>
      </main>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center gap-1 border-b border-border pb-4">
        {ADMIN_SECTIONS.map((s) => {
          const active = pathname?.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`rounded-md px-3 py-1.5 font-mono text-sm transition-colors ${
                active ? "bg-surface text-circuit" : "text-ink-dim hover:text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
