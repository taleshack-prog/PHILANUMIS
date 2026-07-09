"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GuillochePattern } from "@/components/ui/GuillochePattern";

const SECTIONS = [
  {
    href: "/marketplace",
    eyebrow: "Aquisição",
    title: "Marketplace",
    desc: "Compre frações de moedas, selos e medalhas — bonding curve ou preço fixo.",
  },
  {
    href: "/portfolio",
    eyebrow: "Posição",
    title: "Meus ativos",
    desc: "O que você possui, o que já rende desconto e o que já pode ser resgatado.",
  },
  {
    href: "/quests",
    eyebrow: "Progresso",
    title: "Historical Quests",
    desc: "Complete séries históricas inteiras para desbloquear tiers e cashback.",
  },
  {
    href: "/redemption",
    eyebrow: "Saída",
    title: "Resgate físico",
    desc: "100% das frações de um item vira o objeto real na sua mão.",
  },
  {
    href: "/custody",
    eyebrow: "Verificação",
    title: "Prova de custódia",
    desc: "Três camadas de attestação — diária, trimestral e auditoria anual.",
  },
];

export default function HomePage() {
  return (
    <main>
      <section className="relative flex min-h-[86vh] items-center justify-center overflow-hidden border-b border-border">
        <GuillochePattern
          variant="hero"
          className="pointer-events-none absolute left-1/2 top-1/2 h-[140vh] w-[140vh] -translate-x-1/2 -translate-y-1/2 text-bronze/40"
        />
        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-circuit">
            Base L2 · Colecionáveis tokenizados
          </span>
          <h1 className="mt-4 font-display text-5xl font-medium leading-tight text-ink sm:text-6xl">
            Cada moeda tem uma história.
            <br />
            Agora ela também tem um dono.
          </h1>
          <p className="mt-6 font-sans text-lg text-ink-dim">
            Frações reais de moedas, selos e medalhas históricas — custódia verificada,
            liquidez em USDC, resgate físico garantido.
          </p>
          <Link
            href="/marketplace"
            className="mt-8 inline-block rounded-md bg-bronze px-6 py-3 font-sans text-sm font-medium text-background transition-colors hover:bg-bronze-bright"
          >
            Ver marketplace
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.href}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
              className={s.href === "/marketplace" ? "sm:col-span-2" : ""}
            >
              <Link
                href={s.href}
                className="group block h-full rounded-lg border border-border bg-surface p-6 transition-colors hover:border-circuit"
              >
                <span className="font-mono text-xs uppercase tracking-wider text-ink-dim">
                  {s.eyebrow}
                </span>
                <h2 className="mt-2 font-display text-xl text-ink group-hover:text-circuit">
                  {s.title}
                </h2>
                <p className="mt-2 font-sans text-sm text-ink-dim">{s.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
