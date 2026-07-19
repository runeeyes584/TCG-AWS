"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VisualEvent } from "@backend/game/types";

type SpellEffectKind = "arcane" | "dark" | "explosion";

interface ActiveSpellEffect {
  id: string;
  kind: SpellEffectKind;
  x: number;
  y: number;
}

export interface SpellEffectLayerProps {
  events: VisualEvent[];
  stageRef: RefObject<HTMLElement | null>;
}

const COLORS: Record<SpellEffectKind, string> = {
  arcane: "oklch(0.62 0.19 300)",
  dark: "oklch(0.4 0.12 300)",
  explosion: "oklch(0.68 0.2 30)"
};

const SHARDS = Array.from({ length: 10 }, (_, index) => {
  const angle = (index / 10) * Math.PI * 2;
  const distance = 76 + (index % 3) * 13;

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
    duration: 0.7 + (index % 3) * 0.06
  };
});

function getEffectKind(event: VisualEvent): SpellEffectKind | undefined {
  switch (event.type) {
    case "DAMAGE":
      return "explosion";
    case "DEBUFF":
      return "dark";
    case "HEAL":
    case "BUFF":
    case "SUMMON":
    case "TRIGGER_ACTIVATED":
      return "arcane";
    default:
      return undefined;
  }
}

function getTargetId(event: VisualEvent): string | undefined {
  switch (event.type) {
    case "DAMAGE":
    case "HEAL":
    case "BUFF":
    case "DEBUFF":
      return event.targetId;
    case "SUMMON":
      return event.instanceId;
    case "TRIGGER_ACTIVATED":
      return event.sourceId;
    default:
      return undefined;
  }
}

function getEffectPosition(
  event: VisualEvent,
  stage: HTMLElement | null
): Pick<ActiveSpellEffect, "x" | "y"> {
  if (!stage) {
    return { x: 0, y: 0 };
  }

  const stageRect = stage.getBoundingClientRect();
  const targetId = getTargetId(event);
  const target = targetId
    ? stage.querySelector<HTMLElement>(`[data-effect-target-id="${targetId}"]`)
    : undefined;

  if (target) {
    const targetRect = target.getBoundingClientRect();
    return {
      x: targetRect.left - stageRect.left + targetRect.width / 2,
      y: targetRect.top - stageRect.top + targetRect.height / 2
    };
  }

  return { x: stageRect.width / 2, y: stageRect.height / 2 };
}

function Burst({ effect, onDone }: { effect: ActiveSpellEffect; onDone: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onDone, 950);
    return () => window.clearTimeout(timeout);
  }, [onDone]);

  const color = COLORS[effect.kind];

  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: effect.x, top: effect.y, transform: "translate(-50%, -50%)" }}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 60,
          height: 60,
          marginLeft: -30,
          marginTop: -30,
          background: color,
          boxShadow: `0 0 30px ${color}`
        }}
        initial={{ scale: 0, opacity: 0.9 }}
        animate={{ scale: 2.4, opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 40,
          height: 40,
          marginLeft: -20,
          marginTop: -20,
          border: `2px solid ${color}`,
          boxShadow: `0 0 14px ${color}`
        }}
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 4, opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      {SHARDS.map((shard, index) => (
        <motion.span
          key={index}
          className="absolute rounded-full"
          style={{ width: 4, height: 4, background: color, boxShadow: `0 0 8px ${color}` }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: shard.x, y: shard.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: shard.duration, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/** Renders short-lived spell feedback from production engine visual events. */
export function SpellEffectLayer({ events, stageRef }: SpellEffectLayerProps) {
  const [effects, setEffects] = useState<ActiveSpellEffect[]>([]);
  const processedEventsRef = useRef<VisualEvent[] | undefined>(undefined);
  const nextEffectIdRef = useRef(0);

  useEffect(() => {
    if (processedEventsRef.current === events) {
      return;
    }

    processedEventsRef.current = events;
    const stage = stageRef.current;
    const nextEffects = events.flatMap((event) => {
      const kind = getEffectKind(event);
      if (!kind) {
        return [];
      }

      return [{
        id: `spell-effect-${nextEffectIdRef.current++}`,
        kind,
        ...getEffectPosition(event, stage)
      }];
    });

    if (nextEffects.length > 0) {
      setEffects((current) => [...current, ...nextEffects]);
    }
  }, [events, stageRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <AnimatePresence initial={false}>
        {effects.map((effect) => (
          <Burst
            key={effect.id}
            effect={effect}
            onDone={() => setEffects((current) => current.filter((item) => item.id !== effect.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
