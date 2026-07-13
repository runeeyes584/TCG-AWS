import { CardInstance, GameState, GraveyardEntryType, PlayerId } from "../types";

export function rebirthFromGraveyardToHand(
  state: GameState,
  ownerId: PlayerId,
  cardInstanceId: string,
  allowedTypes: GraveyardEntryType[] = ["UNIT", "CHAMPION", "SPELL"],
): CardInstance | undefined {
  const player = state.players[ownerId];
  const entryIndex = player.graveyard.findIndex(
    (entry) => entry.instanceId === cardInstanceId
  );
  if (entryIndex === -1) return undefined;

  const entryType = player.graveyard[entryIndex].type;
  // Validate against allowedTypes if specified
  if (!allowedTypes.includes(entryType)) {
    return undefined;
  }

  const [entry] = player.graveyard.splice(entryIndex, 1);
  const rebirthCard: CardInstance = {
    instanceId: entry.instanceId,
    cardId: entry.cardId,
    ownerId: entry.ownerId
  };

  player.hand.push(rebirthCard);
  return rebirthCard;
}
