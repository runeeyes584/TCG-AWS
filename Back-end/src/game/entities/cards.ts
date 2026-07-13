import {
  CardDefinition,
  CardInstance,
  GameValidationError,
  PlayerId,
  UnitModifier,
  UnitInstance
} from "../types";
import { getCardDefinition, registerCardDefinition } from "./cardRegistry";

export function isChampionCard(definition: CardDefinition): boolean {
  if (!definition) {
    return false;
  }
  return definition.type === "champion";
}

export function isUnitCard(definition: CardDefinition): boolean {
  return definition.type === "unit" || definition.type === "champion";
}

export function createCardInstance(
  definitionOrCardId: CardDefinition | string,
  ownerId: PlayerId,
  instanceId: string
): CardInstance {
  const cardId =
    typeof definitionOrCardId === "string"
      ? definitionOrCardId
      : registerCardDefinition(definitionOrCardId).id;
  return { instanceId, cardId, ownerId };
}

export function createUnitInstance(card: CardInstance): UnitInstance {
  const definition = getCardDefinitionForInstance(card);
  if (!isUnitCard(definition)) {
    throw new GameValidationError("Only unit or champion cards can become units.");
  }

  const attack = requireStat(definition.attack, "attack");
  const health = requireStat(definition.health, "health");

  return {
    instanceId: card.instanceId,
    cardId: definition.id,
    ownerId: card.ownerId,
    attack,
    maxHealth: health,
    damage: 0,
    keywords: [...(definition.keywords ?? [])],
    temporaryKeywords: [],
    modifiers: [],
    exhausted: false,
    boardRow: "WAITING",
    attacking: false
  };
}

export function getCardDefinitionForInstance(card: CardInstance): CardDefinition {
  return getCardDefinition(card.cardId);
}

export function getCardDefinitionForUnit(unit: UnitInstance): CardDefinition {
  return getCardDefinition(unit.cardId);
}

export function getCardDefinitionForGraveyardEntry(entry: { cardId: string }): CardDefinition {
  return getCardDefinition(entry.cardId);
}

export function getUnitAttack(unit: UnitInstance): number {
  return Math.max(
    0,
      unit.attack +
      unit.modifiers.reduce(
        (total: number, modifier: UnitModifier) => total + modifier.attackDelta,
        0
      )
  );
}

export function getUnitMaxHealth(unit: UnitInstance): number {
  return Math.max(
    0,
      unit.maxHealth +
      unit.modifiers.reduce(
        (total: number, modifier: UnitModifier) => total + modifier.healthDelta,
        0
      )
  );
}

export function getUnitHealth(unit: UnitInstance): number {
  return getUnitMaxHealth(unit) - unit.damage;
}

export function requireStat(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new GameValidationError(`Unit requires ${label}.`);
  }
  return value;
}
