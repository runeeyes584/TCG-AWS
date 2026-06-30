import {
  CardDefinition,
  CardInstance,
  GameValidationError,
  PlayerId,
  UnitModifier,
  UnitInstance
} from "./types";
import { getCardDefinition, registerCardDefinition } from "./cardRegistry";

export function isChampionCard(definition: CardDefinition): boolean {
  if (!definition) {
    return false;
  }
  return definition.type === "champion" || definition.type === "CHAMPION";
}

export function isUnitCard(definition: CardDefinition): boolean {
  return definition.type === "unit" || isChampionCard(definition);
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
  return attachCardDefinitionAccessor({ instanceId, cardId, ownerId } as CardInstance);
}

export function createUnitInstance(card: CardInstance): UnitInstance {
  const definition = getDefinitionForCardInstance(card);
  if (!isUnitCard(definition)) {
    throw new GameValidationError("Only unit or champion cards can become units.");
  }

  const attack = requireStat(definition.attack, "attack");
  const health = requireStat(definition.health, "health");

  return attachUnitDefinitionAccessor({
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
    attacking: false,
    triggers: definition.triggers ? [...definition.triggers] : []
  } as unknown as UnitInstance);
}

export function attachCardDefinitionAccessor(card: CardInstance): CardInstance {
  const existingDefinition = card.definition;
  if (!card.cardId && existingDefinition) {
    card.cardId = registerCardDefinition(existingDefinition).id;
  }
  if (!card.cardId) {
    throw new GameValidationError("Card instance requires cardId.");
  }
  Object.defineProperty(card, "definition", {
    configurable: true,
    enumerable: false,
    get: () => getCardDefinition(card.cardId!)
  });
  return card;
}

export function attachUnitDefinitionAccessor(unit: UnitInstance): UnitInstance {
  Object.defineProperty(unit, "definition", {
    configurable: true,
    enumerable: false,
    get: () => getCardDefinition(unit.cardId)
  });
  return unit;
}

function getDefinitionForCardInstance(card: CardInstance): CardDefinition {
  if (Object.prototype.hasOwnProperty.call(card, "definition") && card.definition) {
    card.cardId = registerCardDefinition(card.definition).id;
    return card.definition;
  }
  if (card.cardId) {
    return getCardDefinition(card.cardId);
  }
  if (card.definition) {
    card.cardId = registerCardDefinition(card.definition).id;
    return card.definition;
  }
  throw new GameValidationError("Card instance requires cardId.");
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
