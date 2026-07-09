"use client";

import { motion, useReducedMotion } from "framer-motion";

/// Gera o "d" de um path SVG de uma rosácea guilloché: um círculo modulado por uma senoide em
/// coordenadas polares. `lobes` controla quantos "pétalas" a curva tem, `amplitude` a profundidade
/// da ondulação. É o mesmo princípio matemático usado em gravação anti-falsificação de cédulas e
/// selos — a ponte visual entre o colecionável físico e a verificação on-chain.
function rosettePath(
  cx: number,
  cy: number,
  baseRadius: number,
  amplitude: number,
  lobes: number,
  phase = 0,
  points = 240
): string {
  let d = "";
  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * Math.PI * 2;
    const r = baseRadius + amplitude * Math.sin(lobes * theta + phase);
    const x = cx + r * Math.cos(theta);
    const y = cy + r * Math.sin(theta);
    d += `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)} `;
  }
  return d + "Z";
}

interface GuillochePatternProps {
  /// "mark": versão pequena e estática (logo do header). "hero": versão grande que se desenha
  /// conforme entra na tela ao rolar a página. "coin": medalhão circular único por ativo (usa
  /// `seed` — tipicamente o tokenId — para variar o desenho, já que ainda não temos fotos reais
  /// do laudo/IPFS).
  variant?: "mark" | "hero" | "coin";
  seed?: number;
  className?: string;
}

const MARK_RINGS = [
  { r: 8, amp: 1.2, lobes: 7, phase: 0 },
  { r: 5, amp: 0.8, lobes: 5, phase: 0 },
];

const HERO_RINGS = [
  { r: 160, amp: 14, lobes: 9, phase: 0 },
  { r: 130, amp: 10, lobes: 11, phase: 0.4 },
  { r: 100, amp: 8, lobes: 7, phase: 1.1 },
  { r: 72, amp: 6, lobes: 13, phase: 0.2 },
];

/// Gera 3 anéis pseudo-únicos a partir de um seed (tokenId) — mesmo ativo sempre gera o mesmo
/// medalhão, ativos diferentes ficam visualmente distintos.
function coinRings(seed: number) {
  const lobes1 = 6 + (seed % 5); // 6-10
  const lobes2 = 5 + ((seed * 3) % 6); // 5-10
  const lobes3 = 8 + ((seed * 7) % 5); // 8-12
  return [
    { r: 44, amp: 4, lobes: lobes1, phase: seed * 0.3 },
    { r: 32, amp: 3, lobes: lobes2, phase: seed * 0.7 },
    { r: 20, amp: 2, lobes: lobes3, phase: seed * 1.1 },
  ];
}

export function GuillochePattern({ variant = "hero", seed = 0, className }: GuillochePatternProps) {
  const reduceMotion = useReducedMotion();

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 28 28" className={className} fill="none" aria-hidden="true">
        {MARK_RINGS.map((ring, i) => (
          <path
            key={i}
            d={rosettePath(14, 14, ring.r, ring.amp, ring.lobes, ring.phase)}
            stroke="currentColor"
            strokeWidth="0.6"
          />
        ))}
      </svg>
    );
  }

  if (variant === "coin") {
    const rings = coinRings(seed);
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" aria-hidden="true">
        <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="1" opacity={0.5} />
        {rings.map((ring, i) => (
          <path
            key={i}
            d={rosettePath(50, 50, ring.r, ring.amp, ring.lobes, ring.phase)}
            stroke="currentColor"
            strokeWidth="0.8"
            opacity={0.8}
          />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 400" className={className} fill="none" aria-hidden="true">
      {HERO_RINGS.map((ring, i) =>
        reduceMotion ? (
          <path
            key={i}
            d={rosettePath(200, 200, ring.r, ring.amp, ring.lobes, ring.phase)}
            stroke="currentColor"
            strokeWidth="1"
            opacity={0.6}
          />
        ) : (
          <motion.path
            key={i}
            d={rosettePath(200, 200, ring.r, ring.amp, ring.lobes, ring.phase)}
            stroke="currentColor"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.6 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, delay: i * 0.25, ease: "easeInOut" }}
          />
        )
      )}
    </svg>
  );
}
