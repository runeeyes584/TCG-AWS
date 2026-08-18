import { emitEvent } from "../mechanics/triggers";
import { GameState, PlayerId } from "../types";
import { finishGame, opponentOf } from "../rules/gameRules";

export function drawCards(state: GameState, playerId: PlayerId, amount: number): void {
  const player = state.players[playerId];
  let drawn = 0;

  for (let index = 0; index < amount; index += 1) {
    const card = player.deck.shift();
    if (!card) {
      player.nexusHp = 0;
      finishGame(state, opponentOf(player.id), "DECK_EXHAUSTED");
      return;
    }
    player.hand.push(card);
    drawn += 1;
    emitEvent(state, { type: "CARD_DRAWN", playerId, cardInstanceId: card.instanceId });
  }

  if (drawn > 0) {
    state.visualEvents.push({ type: "DRAW", playerId, count: drawn });
  }
}
