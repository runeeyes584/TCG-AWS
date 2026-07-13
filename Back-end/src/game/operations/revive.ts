import { createUnitInstance } from "../entities/cards";
import { GameState, GraveyardEntryType, PlayerId, UnitInstance } from "../types";

export function reviveFromGraveyardToBoard(
  state: GameState,
  ownerId: PlayerId,
  cardInstanceId: string,
  allowedTypes: GraveyardEntryType[] = ["UNIT", "CHAMPION"]
): UnitInstance | undefined {
  const player = state.players[ownerId];

  // Board is full
  if (player.board.length >= 6) {
    return undefined;
  }

  const entryIndex = player.graveyard.findIndex(
    (entry) => entry.instanceId === cardInstanceId
  );
  if (entryIndex === -1) return undefined;

  const entryType = player.graveyard[entryIndex].type;
  // Spells cannot be revived to the board
  if (entryType === "SPELL") {
    return undefined;
  }

  // Validate against allowedTypes if specified
  if (!allowedTypes.includes(entryType)) {
    return undefined;
  }

  const [entry] = player.graveyard.splice(entryIndex, 1);
  const card = {
    instanceId: entry.instanceId,
    cardId: entry.cardId,
    ownerId: entry.ownerId
  };

  const revivedUnit = {
    ...createUnitInstance(card),
    boardRow: "ACTIVE" as const
  };
  player.board.push(revivedUnit);
  return revivedUnit;
}
