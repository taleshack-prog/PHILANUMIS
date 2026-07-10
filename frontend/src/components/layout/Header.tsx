"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { GuillochePattern } from "@/components/ui/GuillochePattern";
import { useIsAdmin } from "@/lib/hooks/useIsAdmin";

const NAV_LINKS = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/portfolio", label: "Meus ativos" },
  { href: "/quests", label: "Quests" },
  { href: "/redemption", label: "Resgate" },
  { href: "/custody", label: "Custódia" },
];

export function Header() {
  const pathname = usePathname();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <GuillochePattern variant="mark" className="h-7 w-7 text-bronze" />
          <span className="font-display text-lg tracking-tight text-ink">PhilaNumis</span>
        </Link>

        <nav className="hidden gap-6 sm:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm transition-colors ${
                  active ? "text-circuit" : "text-ink-dim hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className={`font-mono text-sm transition-colors ${
                pathname?.startsWith("/admin") ? "text-circuit" : "text-bronze hover:text-bronze-bright"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <ConnectButton />
      </div>
    </header>
  );
}
