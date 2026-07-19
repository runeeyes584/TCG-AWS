"use client";

import Image from "next/image";
import clsx from "clsx";
import { Layers, Skull } from "lucide-react";
import { motion } from "framer-motion";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import type { GraveyardEntry } from "@backend/game/types";

const MAX_DECK_LAYERS = 4;
const MAX_GRAVEYARD_LAYERS = 3;

export interface DeckPileProps {
  count: number;
  label?: string;
  onDraw?: () => void;
  interactive?: boolean;
}

export interface GraveyardPileProps {
  entries: GraveyardEntry[];
  label?: string;
  onOpen?: () => void;
}

/** A deck stack whose visible depth scales with the number of remaining cards. */
export function DeckPile({
  count,
  label = "Deck",
  onDraw,
  interactive = false
}: DeckPileProps) {
  const layers = count === 0 ? 0 : Math.min(MAX_DECK_LAYERS, Math.ceil(count / 6));
  const canDraw = interactive && count > 0 && Boolean(onDraw);

  return (
    <button
      type="button"
      className={clsx("side-pile side-pile--deck", canDraw && "side-pile--interactive")}
      onClick={canDraw ? onDraw : undefined}
      disabled={!canDraw}
      aria-label={`${label}: ${count} cards remaining${canDraw ? ", click to draw" : ""}`}
    >
      <span className="side-pile__label">{label}</span>
      <span className="side-pile__visual" aria-hidden="true">
        {Array.from({ length: layers }, (_, index) => (
          <span
            className="side-pile__deck-layer"
            key={`deck-layer-${index}`}
            style={{ transform: `translate(${index * 1.5}px, ${-index * 1.5}px)` }}
          >
            <Image alt="" fill sizes="48px" src="/monster/card-back.png" className="object-cover opacity-90" />
          </span>
        ))}
        <motion.span
          className={clsx("side-pile__deck-top", canDraw && "side-pile__deck-top--interactive")}
          style={{ transform: `translate(${layers * 1.5}px, ${-layers * 1.5}px)` }}
          whileTap={canDraw ? { scale: 0.94 } : undefined}
        >
          <Layers size={12} />
          <strong>{count}</strong>
        </motion.span>
      </span>
    </button>
  );
}

/** A graveyard stack showing an empty state or the most recently discarded card. */
export function GraveyardPile({ entries, label = "GY", onOpen }: GraveyardPileProps) {
  const total = entries.length;
  const top = entries.at(-1);
  const layers = Math.min(MAX_GRAVEYARD_LAYERS, total);
  const topDefinition = top ? getCardDefinition(top.cardId) : undefined;

  return (
    <button
      type="button"
      className={clsx("side-pile side-pile--graveyard", onOpen && "side-pile--interactive")}
      onClick={onOpen}
      disabled={!onOpen}
      aria-label={`${label}: ${total} cards${onOpen ? ", click to open graveyard" : ""}`}
    >
      <span className="side-pile__label">{label}</span>
      <span className="side-pile__visual" aria-hidden="true">
        {total === 0 ? (
          <span className="side-pile__graveyard-empty">
            <Skull size={16} />
          </span>
        ) : (
          <>
            {Array.from({ length: layers }, (_, index) => (
              <span
                className="side-pile__graveyard-layer"
                key={`graveyard-layer-${index}`}
                style={{ transform: `translate(${index}px, ${-index}px) rotate(${index * 2 - 2}deg)` }}
              />
            ))}
            <span
              className="side-pile__graveyard-top"
              style={
                topDefinition?.imageUrl
                  ? { backgroundImage: `url(${topDefinition.imageUrl})` }
                  : undefined
              }
            />
            <strong className="side-pile__count">{total}</strong>
          </>
        )}
      </span>
    </button>
  );
}
