import { CardInstance, GameState, PlayerId } from "../types";

export function reviveFromGraveyardToHand(
  state: GameState,
  ownerId: PlayerId,
  cardInstanceId: string,
  allowedTypes?: ("UNIT" | "CHAMPION")[]
): CardInstance | undefined {
  const player = state.players[ownerId];
  const entryIndex = player.graveyard.findIndex(
    (entry) => entry.instanceId === cardInstanceId
  );
  if (entryIndex === -1) return undefined;

  const entryType = player.graveyard[entryIndex].type;
  // Never allow reviving SPELL cards
  if (entryType === "SPELL") {
    return undefined;
  }
  // Validate against allowedTypes if specified
  if (allowedTypes && !allowedTypes.includes(entryType as any)) {
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
