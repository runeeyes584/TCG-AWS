import { emitEvent } from "../mechanics/triggers";
import { GameState, PlayerId } from "../types";
import { moveCardToGraveyard } from "../mechanics/graveyard";

export function discardCards(
  state: GameState,
  playerId: PlayerId,
  cardInstanceIds: string[]
): void {
  const player = state.players[playerId];

  for (const cardInstanceId of cardInstanceIds) {
    const index = player.hand.findIndex((card) => card.instanceId === cardInstanceId);
    if (index === -1) {
      continue;
    }
    const [card] = player.hand.splice(index, 1);
    moveCardToGraveyard(state, card, playerId, "DISCARD");
    emitEvent(state, { type: "CARD_DISCARDED", playerId, cardInstanceId });
  }
}
