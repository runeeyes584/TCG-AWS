"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { GameState, PlayerId } from "@backend/game/types";
import type { ScreenRect } from "../../../../libs/arenaEventBus";
import { arenaEventAdapter } from "../../phaser/adapters/arenaEventAdapter";
import { graveyardChanges, graveyardSnapshot, scheduleChanges, type GraveyardSnapshot } from "./graveyardChanges";

function rectOf(element: Element | null | undefined): ScreenRect | undefined {
  if (!element) return undefined;
  const { left, top, width, height } = element.getBoundingClientRect();
  return width > 0 && height > 0 ? { x: left, y: top, width, height } : undefined;
}

/**
 * Tells the arena when a graveyard changes: a card fell in, was revived, returned to the hand or was banished. The
 * changes are found by comparing each state with the last one (the engine does not report the cards that enter); the
 * arena draws the soul between the places measured here, and the piles (painted by the arena too) react to the same event.
 * The first state seen is only remembered: joining or resuming a match is not an event.
 */
export function useGraveyardFx(
  gameState: GameState,
  viewerPlayerId: PlayerId,
  stageRef: RefObject<HTMLElement | null>
): void {
  const previous = useRef<GraveyardSnapshot | undefined>(undefined);

  useEffect(() => {
    const snapshot = graveyardSnapshot(gameState);
    const scheduled = scheduleChanges(graveyardChanges(previous.current, snapshot, gameState.visualEvents));
    previous.current = snapshot;

    const stage = stageRef.current;
    if (scheduled.length === 0 || !stage) return;

    const pileOf = (playerId: PlayerId) => rectOf(stage.querySelector(`[data-effect-target-id="graveyard-${playerId}"]`));
    const handOf = (playerId: PlayerId) =>
      rectOf(stage.querySelector(`.hand-dock--${playerId === viewerPlayerId ? "player" : "opponent"}`));

    for (const change of scheduled) {
      const pile = pileOf(change.playerId);
      if (!pile) continue;
      arenaEventAdapter.emit("GRAVEYARD_FX", {
        kind: change.kind,
        tone: change.playerId === viewerPlayerId ? "viewer" : "opponent",
        pile,
        cause: change.kind === "ENTER" ? change.entry.cause : undefined,
        unitId: change.kind === "REVIVE" ? change.entry.instanceId : undefined,
        hand: change.kind === "REBIRTH" ? handOf(change.playerId) : undefined,
        delayMs: change.delayMs
      });
    }
  }, [gameState, viewerPlayerId, stageRef]);
}
