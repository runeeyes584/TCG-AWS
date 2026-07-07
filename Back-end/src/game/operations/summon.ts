import { createCardInstance, createUnitInstance } from "../cards";
import { emitEvent } from "../triggers";
import { GameState, PlayerId } from "../types";
import { BOARD_LIMIT } from "../rules";
import { getCardDefinition } from "../cardRegistry";

export function summonUnit(
  state: GameState,
  playerId: PlayerId,
  cardId: string,
  instanceId?: string
): void {
  const player = state.players[playerId];
  if (player.board.length >= BOARD_LIMIT) {
    return;
  }

  const nextInstanceId = instanceId ?? `${cardId}-generated-${state.rngSeed}`;
  if (!instanceId) {
    state.rngSeed += 1;
  }
  const definition = getCardDefinition(cardId);
  const unit = createUnitInstance(createCardInstance(definition, playerId, nextInstanceId));
  player.board.push(unit);
  emitEvent(state, {
    type: "UNIT_SUMMONED",
    playerId,
    cardInstanceId: nextInstanceId,
    unitInstanceId: unit.instanceId
  });
}
