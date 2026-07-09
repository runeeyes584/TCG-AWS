import { CardInstance, GameState, PlayerId } from "../types";

export function reviveFromGraveyardToHand(
  state: GameState,
  ownerId: PlayerId,
  cardInstanceId: string
): CardInstance | undefined {
  const player = state.players[ownerId];
  const entryIndex = player.graveyard.findIndex(
    (entry) => entry.instanceId === cardInstanceId
  );
  if (entryIndex === -1) return undefined;

  // Only allow reviving UNIT and CHAMPION cards
  if (player.graveyard[entryIndex].type === "SPELL") {
    return undefined;
  }

  const [entry] = player.graveyard.splice(entryIndex, 1);
  const revivedCard: CardInstance = {
    instanceId: entry.instanceId,
    cardId: entry.cardId,
    ownerId: entry.ownerId
  };

  player.hand.push(revivedCard);
  return revivedCard;
}
