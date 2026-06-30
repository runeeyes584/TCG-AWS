/**
 * graveyard.ts
 * Helpers for the graveyard and death pipeline.
 *
 * All functions mutate state in-place (same pattern as engine helpers).
 * They are called from engine.ts after damage, spell resolution, and modifier expiry.
 */

import { getUnitHealth } from "./cards";
import { emitEvent } from "./triggers";
import {
  CardInstance,
  GameState,
  GraveyardCause,
  GraveyardEntry,
  GraveyardEntryType,
  PlayerId,
  PlayerState,
  UnitInstance
} from "./types";

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Move a unit instance from board to its owner graveyard.
 * Does NOT remove it from board — caller (cleanupDeadUnits) handles that.
 * Emits UNIT_DIED after adding to graveyard.
 */
export function moveUnitToGraveyard(
  state: GameState,
  unit: UnitInstance,
  cause: GraveyardCause,
  sourceInstanceId?: string
): void {
  const player = state.players[unit.ownerId];

  // Guard: never add the same instance twice in one pipeline pass
  if (player.graveyard.some((e) => e.instanceId === unit.instanceId)) {
    return;
  }

  const entry: GraveyardEntry = {
    id: `${unit.instanceId}-gy`,
    instanceId: unit.instanceId,
    cardCode: unit.definition.id,
    ownerId: unit.ownerId,
    type: unit.definition.type === "champion" ? "CHAMPION" : "UNIT",
    round: state.round,
    cause,
    definition: unit.definition,
    sourceInstanceId
  };

  player.graveyard.push(entry);
  emitEvent(state, {
    type: "UNIT_DIED",
    playerId: unit.ownerId,
    unitInstanceId: unit.instanceId
  });
}

/**
 * Move a resolved spell card to the caster graveyard.
 */
export function moveSpellToGraveyard(
  state: GameState,
  card: CardInstance,
  casterId: PlayerId
): void {
  const player = state.players[casterId];

  // Guard: never add duplicate
  if (player.graveyard.some((e) => e.instanceId === card.instanceId)) {
    return;
  }

  const entry: GraveyardEntry = {
    id: `${card.instanceId}-gy`,
    instanceId: card.instanceId,
    cardCode: card.definition.id,
    ownerId: casterId,
    type: "SPELL",
    round: state.round,
    cause: "SPELL",
    definition: card.definition
  };

  player.graveyard.push(entry);
}

/**
 * Sweep a player board: move all dead units (health <= 0) to graveyard.
 * Call this after any operation that may deal lethal damage.
 */
export function cleanupDeadUnits(
  state: GameState,
  player: PlayerState,
  cause: GraveyardCause = "EFFECT",
  sourceInstanceId?: string
): void {
  const survivors: UnitInstance[] = [];
  for (const unit of player.board) {
    if (getUnitHealth(unit) <= 0) {
      moveUnitToGraveyard(state, unit, cause, sourceInstanceId);
    } else {
      survivors.push(unit);
    }
  }
  player.board = survivors;
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Get graveyard entries for a player, optionally filtered.
 */
export function getGraveyardEntries(
  state: GameState,
  playerId: PlayerId,
  filter?: { type?: GraveyardEntryType; cause?: GraveyardCause; round?: number }
): GraveyardEntry[] {
  let entries = state.players[playerId].graveyard;
  if (filter?.type !== undefined) {
    entries = entries.filter((e) => e.type === filter.type);
  }
  if (filter?.cause !== undefined) {
    entries = entries.filter((e) => e.cause === filter.cause);
  }
  if (filter?.round !== undefined) {
    entries = entries.filter((e) => e.round === filter.round);
  }
  return entries;
}

/**
 * Return graveyard entries valid for revive: UNIT and CHAMPION only.
 */
export function findReviveTargets(
  state: GameState,
  playerId: PlayerId
): GraveyardEntry[] {
  return state.players[playerId].graveyard.filter(
    (e) => e.type === "UNIT" || e.type === "CHAMPION"
  );
}
