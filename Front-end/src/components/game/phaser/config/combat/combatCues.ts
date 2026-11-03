import type { GamePhase, GameState } from "@backend/game/types";

/** What the board needs to remember about a combat to tell when something big happened. */
export interface CueSnapshot {
  phase: GamePhase;
  /** Units sent to attack, in lane order. */
  attackerIds: string[];
  /** Units that have been put in front of an attacker. */
  blockerIds: string[];
  /** Which of all the units in combat are champions. */
  championIds: string[];
}

export interface CombatCues {
  /** The attack or the blocks were committed. */
  commit?: { kind: "attack" | "defend"; unitIds: string[] };
  /** Champions that have just been declared into a lane. */
  champions: string[];
  /** Units that have just been sent to attack (the blade is drawn for them). */
  attackers: string[];
  /** Units that have just been put in front of an attacker (the gate locks). */
  blockers: string[];
}

/** The snapshot of a game state; `isChampion` tells whether a unit's card is a champion. */
export function cueSnapshot(state: GameState, isChampion: (unitId: string) => boolean): CueSnapshot {
  const attackerIds = state.combat.attackers.map((lane) => lane.attackerId);
  const blockerIds = state.combat.attackers
    .map((lane) => lane.blockerId)
    .filter((id): id is string => Boolean(id));
  return {
    phase: state.phase,
    attackerIds,
    blockerIds,
    championIds: [...attackerIds, ...blockerIds].filter(isChampion)
  };
}

/**
 * The moments worth shaking the screen for. Declaring an ordinary unit is not one of them (the card
 * just glides into its lane); declaring a champion, committing the attack and committing the blocks are. Nothing is cued on the first reading, so rejoining a match in the
 * middle of a combat stays quiet.
 */
export function combatCues(previous: CueSnapshot | undefined, next: CueSnapshot): CombatCues {
  if (!previous) return { champions: [], attackers: [], blockers: [] };

  const declaredBefore = new Set([...previous.attackerIds, ...previous.blockerIds]);
  const champions = [...new Set([...next.attackerIds, ...next.blockerIds])].filter(
    (id) => !declaredBefore.has(id) && next.championIds.includes(id)
  );
  const attackers = next.attackerIds.filter((id) => !previous.attackerIds.includes(id));
  const blockers = next.blockerIds.filter((id) => !previous.blockerIds.includes(id));
  const base = { champions, attackers, blockers };

  if (previous.phase === "ACTION" && next.phase === "BLOCK") {
    return { ...base, commit: { kind: "attack", unitIds: next.attackerIds } };
  }
  if (previous.phase === "BLOCK" && next.phase !== "BLOCK" && previous.blockerIds.length > 0) {
    return { ...base, commit: { kind: "defend", unitIds: previous.blockerIds } };
  }
  return base;
}
