import { findUnit, PLAYER_IDS } from "../rules/gameRules";
import { GameState, Keyword, PlayerId, UnitModifier } from "../types";

export function addDebuff(
  state: GameState,
  targetUnitId: string,
  modifier: Omit<UnitModifier, "id" | "createdRound" | "createdTurn"> &
    Partial<Pick<UnitModifier, "id" | "createdRound" | "createdTurn">>
): void {
  const unit = findUnitById(state, targetUnitId);
  const nextModifier: UnitModifier = {
    ...modifier,
    attackDelta: -Math.abs(modifier.attackDelta),
    healthDelta: -Math.abs(modifier.healthDelta),
    id:
      modifier.id ??
      `${targetUnitId}-${modifier.sourceCardId}-${state.round}-${state.turn}-${unit.modifiers.length}`,
    createdRound: modifier.createdRound ?? state.round,
    createdTurn: modifier.createdTurn ?? state.turn
  };
  unit.modifiers.push(nextModifier);
  state.visualEvents.push({
    type: "DEBUFF",
    targetId: unit.instanceId,
    attackDelta: nextModifier.attackDelta,
    healthDelta: nextModifier.healthDelta
  });
}

export function removeKeyword(
  state: GameState,
  targetUnitId: string,
  keyword: Keyword
): void {
  const unit = findUnitById(state, targetUnitId);
  if (unit.keywords.includes(keyword)) {
    unit.keywords = unit.keywords.filter((candidate) => candidate !== keyword);
  }
}

function findUnitById(state: GameState, targetUnitId: string) {
  for (const playerId of PLAYER_IDS) {
    const unit = state.players[playerId as PlayerId].board.find(
      (candidate) => candidate.instanceId === targetUnitId
    );
    if (unit) {
      return findUnit(state, playerId as PlayerId, targetUnitId);
    }
  }
  throw new Error(`Unit not found: ${targetUnitId}`);
}
