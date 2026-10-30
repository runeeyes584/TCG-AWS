"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayerId } from "@backend/game/types";
import { arenaEventBus } from "../../../../libs/arenaEventBus";
import { PILE_IDS, type PileId } from "../../phaser/config/pileLayout";
import type { PileKind } from "./pileLook";
import type { PilesState } from "./pileState";

export interface PileSpec {
  kind: PileKind;
  playerId: PlayerId;
  /** How a screen reader names it: "Your deck", "Opponent's graveyard". */
  name: string;
  count: number;
  /** The card on top of a graveyard. */
  topCardId?: string;
  /** What a click does. Without it the pile is only to be looked at (a deck outside the turn of its player). */
  onActivate?: () => void;
}

export type PileSpecs = Record<PileId, PileSpec>;

/** The words on the button for a screen reader, and the tip for the mouse. */
export function pileLabel(spec: Pick<PileSpec, "kind" | "name" | "count" | "onActivate">): string {
  const cards = `${spec.count} ${spec.count === 1 ? "card" : "cards"}`;
  if (spec.kind === "graveyard") return `${spec.name}: ${cards}, click to open`;
  return `${spec.name}: ${cards} remaining${spec.onActivate ? ", click to draw" : ""}`;
}

/**
 * The decks and the graveyards of the table. Phaser paints them (`PilesRenderer`); these four buttons are their hit areas.
 * Each one owns the click, the focus, the disabled state and the label, and reports what its pile holds and whether the
 * pointer is on it, so the rules (when a deck may draw, what a graveyard opens) stay with `GameBoard`. Where they stand
 * comes from the arena, as CSS variables (`--pile-x`, `--pile-w`, `--pile-h`, `--pile-y-*`), because it is the arena
 * that knows where the table, the rift and the Turn Rail are.
 */
export function PileDock({ piles }: { piles: PileSpecs }) {
  const [hovered, setHovered] = useState<PileId>();
  const [pressed, setPressed] = useState<PileId>();

  const state = useMemo<PilesState>(() => {
    const entry = (id: PileId) => {
      const spec = piles[id];
      const interactive = Boolean(spec.onActivate);
      return {
        kind: spec.kind,
        count: spec.count,
        topCardId: spec.topCardId,
        interactive,
        hover: interactive && hovered === id,
        pressed: interactive && pressed === id
      };
    };
    return {
      opponentGraveyard: entry("opponentGraveyard"),
      opponentDeck: entry("opponentDeck"),
      viewerDeck: entry("viewerDeck"),
      viewerGraveyard: entry("viewerGraveyard")
    };
  }, [piles, hovered, pressed]);

  useEffect(() => {
    arenaEventBus.emit("PILES_STATE", state);
  }, [state]);

  // The piles are gone with the board.
  useEffect(() => () => arenaEventBus.emit("PILES_STATE", undefined), []);

  return (
    <div className="pile-dock" role="group" aria-label="Decks and graveyards">
      {PILE_IDS.map((id) => {
        const spec = piles[id];
        const label = pileLabel(spec);
        return (
          <button
            key={id}
            type="button"
            className="pile-hit"
            data-pile={id}
            data-ui-shield=""
            data-effect-target-id={spec.kind === "graveyard" ? `graveyard-${spec.playerId}` : undefined}
            disabled={!spec.onActivate}
            aria-label={label}
            title={label}
            onClick={spec.onActivate}
            onPointerEnter={() => setHovered(id)}
            onPointerLeave={() => {
              setHovered((current) => (current === id ? undefined : current));
              setPressed((current) => (current === id ? undefined : current));
            }}
            onPointerDown={() => setPressed(id)}
            onPointerUp={() => setPressed((current) => (current === id ? undefined : current))}
          />
        );
      })}
    </div>
  );
}
