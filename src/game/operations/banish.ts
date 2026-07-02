import { emitEvent } from "../triggers";
import { CardInstance, GameState, PlayerId, UnitInstance } from "../types";

export function banishUnit(
  state: GameState,
  unit: UnitInstance,
  sourceInstanceId?: string
): void {
  const player = state.players[unit.ownerId];
  player.board = player.board.filter(
    (candidate) => candidate.instanceId !== unit.instanceId
  );
  emitEvent(state, {
    type: "UNIT_BANISHED",
    playerId: unit.ownerId,
    unitInstanceId: unit.instanceId,
    targetPlayerId: unit.ownerId,
    targetUnitId: unit.instanceId,
    targetInstanceId: unit.instanceId,
    targetCardId: unit.cardId,
    sourceInstanceId
  });
}

export function banishCard(
  state: GameState,
  card: CardInstance,
  ownerId: PlayerId,
  zone: "hand" | "deck"
): void {
  const player = state.players[ownerId];
  player[zone] = player[zone].filter(
    (candidate) => candidate.instanceId !== card.instanceId
  );
  emitEvent(state, {
    type: "CARD_BANISHED",
    playerId: ownerId,
    cardInstanceId: card.instanceId,
    targetPlayerId: ownerId,
    targetInstanceId: card.instanceId,
    targetCardId: card.cardId
  });
}
