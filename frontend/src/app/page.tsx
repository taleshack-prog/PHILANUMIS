import Link from "next/link";
import { ConnectButton } from "@/components/wallet/ConnectButton";

const SECTIONS = [
  { href: "/marketplace", title: "Marketplace", desc: "Compre frações de moedas, selos e medalhas" },
  { href: "/quests", title: "Historical Quests", desc: "Acompanhe séries, tiers e badges" },
  { href: "/redemption", title: "Resgate físico", desc: "Troque 100% de um ativo pelo item real" },
  { href: "/custody", title: "Prova de custódia", desc: "Veja as attestações de reserva de cada ativo" },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-12 flex items-center justify-between">
        <h1 className="text-xl font-medium">PhilaNumis</h1>
        <ConnectButton />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border p-6 transition hover:border-ink"
          >
            <h2 className="text-lg font-medium">{s.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
