import {
  CardDefinition,
  CardInstance,
  GameValidationError,
  PlayerId,
  UnitModifier,
  UnitInstance
} from "./types";

export function isChampionCard(definition: CardDefinition): boolean {
  return definition.type === "champion" || definition.type === "CHAMPION";
}

export function isUnitCard(definition: CardDefinition): boolean {
  return definition.type === "unit" || isChampionCard(definition);
}

export function createCardInstance(
  definition: CardDefinition,
  ownerId: PlayerId,
  instanceId: string
): CardInstance {
  return { instanceId, definition, ownerId };
}

export function createUnitInstance(card: CardInstance): UnitInstance {
  if (!isUnitCard(card.definition)) {
    throw new GameValidationError("Only unit or champion cards can become units.");
  }

  const attack = requireStat(card.definition.attack, "attack");
  const health = requireStat(card.definition.health, "health");

  return {
    instanceId: card.instanceId,
    definition: card.definition,
    ownerId: card.ownerId,
    attack,
    maxHealth: health,
    damage: 0,
    keywords: [...(card.definition.keywords ?? [])],
    modifiers: [],
    exhausted: false,
    attacking: false,
    triggers: card.definition.triggers ? [...card.definition.triggers] : []
  };
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
