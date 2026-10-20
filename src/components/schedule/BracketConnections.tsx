"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { BracketRound } from "@/lib/standingsEngine";

interface Connection {
  id: string;
  path: string;
  loser: boolean;
}

export default function BracketConnections({ rounds, children, className }: {
  rounds: BracketRound[];
  children: ReactNode;
  className: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const cards = new Map(Array.from(container.querySelectorAll<HTMLElement>("[data-bracket-match]"))
        .map((card) => [card.dataset.bracketMatch, card.getBoundingClientRect()]));
      const next: Connection[] = [];
      for (const round of rounds) {
        for (const node of round.matches) {
          const target = cards.get(node.id);
          if (!target) continue;
          for (const [side, source] of [["home", node.homeSource], ["away", node.awaySource]] as const) {
            if (!source) continue;
            const from = cards.get(source.matchId);
            const endX = target.left - origin.left;
            const endY = target.top - origin.top + target.height * (side === "home" ? 0.42 : 0.72);
            const startX = from ? from.right - origin.left : endX - 12;
            const startY = from ? from.top - origin.top + from.height / 2 : endY;
            const middle = (startX + endX) / 2;
            next.push({
              id: `${source.matchId}-${node.id}-${side}`,
              path: `M ${startX} ${startY} H ${middle} V ${endY} H ${endX}`,
              loser: source.result === "loser",
            });
          }
        }
      }
      setConnections(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll("[data-bracket-match]").forEach((card) => observer.observe(card));
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [rounds]);

  return (
    <div ref={root} className={`relative ${className}`}>
      <svg aria-hidden="true" data-testid="bracket-connectors" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible text-cyan-400/70" fill="none">
        {connections.map((connection) => <path key={connection.id} d={connection.path} stroke="currentColor" strokeWidth={2} strokeDasharray={connection.loser ? "5 4" : undefined} />)}
      </svg>
      {children}
    </div>
  );
}
