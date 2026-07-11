import { findUnit, PLAYER_IDS } from "../rules/gameRules";
import {
  GameState,
  Keyword,
  ModifierDuration,
  PlayerId,
  UnitModifier
} from "../types";

export function addModifier(
  state: GameState,
  targetUnitId: string,
  modifier: Omit<UnitModifier, "id" | "createdRound" | "createdTurn"> &
    Partial<Pick<UnitModifier, "id" | "createdRound" | "createdTurn">>
): void {
  const unit = findUnitById(state, targetUnitId);
  const nextModifier: UnitModifier = {
    ...modifier,
    id:
      modifier.id ??
      `${targetUnitId}-${modifier.sourceCardId}-${state.round}-${state.turn}-${unit.modifiers.length}`,
    createdRound: modifier.createdRound ?? state.round,
    createdTurn: modifier.createdTurn ?? state.turn
  };
  unit.modifiers.push(nextModifier);
  state.visualEvents.push({
    type: "BUFF",
    targetId: unit.instanceId,
    attackDelta: nextModifier.attackDelta,
    healthDelta: nextModifier.healthDelta
  });
}

export function grantKeyword(
  state: GameState,
  targetUnitId: string,
  keyword: Keyword,
  _duration: ModifierDuration = "PERMANENT"
): void {
  const unit = findUnitById(state, targetUnitId);
  if (!unit.keywords.includes(keyword)) {
    unit.keywords.push(keyword);
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
