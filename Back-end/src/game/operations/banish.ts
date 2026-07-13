import { emitEvent } from "../mechanics/triggers";
import { GameState, PlayerId } from "../types";

export function banishFromGraveyard(
  state: GameState,
  ownerId: PlayerId,
  cardInstanceId: string,
  sourceInstanceId?: string
): void {
  const player = state.players[ownerId];
  const entryIndex = player.graveyard.findIndex(
    (entry) => entry.instanceId === cardInstanceId
  );
  if (entryIndex === -1) return;

  const [entry] = player.graveyard.splice(entryIndex, 1);
  emitEvent(state, {
    type: "CARD_BANISHED",
    playerId: ownerId,
    cardInstanceId: entry.instanceId,
    targetPlayerId: ownerId,
    targetInstanceId: entry.instanceId,
    targetCardId: entry.cardId,
    sourceInstanceId
  });
}
