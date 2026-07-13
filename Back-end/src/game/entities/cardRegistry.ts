import coreCardsJson from "../data/cards.json";
import UiaCardsJson from "../data/UiaCard.json";

import {
  Ability,
  CardDefinition,
  CardType,
  GameValidationError,
  SpellSpeed,
  Trigger
} from "../types";

const cardMap = new Map<string, CardDefinition>();


for (const card of [
  // ...(coreCardsJson as CardDefinition[]),
  ...(UiaCardsJson as CardDefinition[])
]) {
  registerCardDefinition(card);
}

export function assertValidCardType(type: string): asserts type is CardType {
  if (type !== "unit" && type !== "spell" && type !== "champion") {
    throw new GameValidationError(`Invalid card type: ${type}`);
  }
}

export function assertValidSpellSpeed(
  speed: string | undefined
): asserts speed is SpellSpeed | undefined {
  if (speed === undefined) {
    return;
  }
  if (speed !== "burst" && speed !== "fast" && speed !== "slow") {
    throw new GameValidationError(`Invalid spell speed: ${speed}`);
  }
}

export function registerCardDefinition(definition: CardDefinition): CardDefinition {
  assertValidCardType(definition.type);
  assertValidSpellSpeed(definition.spellSpeed);
  const normalized = normalizeCardDefinition(definition);
  cardMap.set(normalized.id, normalized);
  return normalized;
}

export function registerCardDefinitions(definitions: CardDefinition[]): void {
  for (const definition of definitions) {
    registerCardDefinition(definition);
  }
}

export function getCardDefinition(cardId: string): CardDefinition {
  const definition = cardMap.get(cardId);
  if (!definition) {
    throw new GameValidationError(`Card definition not found: ${cardId}`);
  }
  return definition;
}

export function hasCard(cardId: string): boolean {
  return cardMap.has(cardId);
}


export function listCards(): CardDefinition[] {
  return [...cardMap.values()];
}

export function normalizeCardDefinition(definition: CardDefinition): CardDefinition {
  assertValidCardType(definition.type);
  assertValidSpellSpeed(definition.spellSpeed);

  const existingAbilities = definition.abilities ?? [];
  const convertedAbilities = convertTriggersToAbilities(
    definition.triggers ?? [],
    existingAbilities
  );

  return {
    ...definition,
    spellSpeed:
      definition.type === "spell"
        ? definition.spellSpeed ?? "slow"
        : definition.spellSpeed,
    abilities: [...existingAbilities, ...convertedAbilities],
    triggers: undefined
  };
}

function convertTriggersToAbilities(
  triggers: Trigger[],
  existingAbilities: Ability[]
): Ability[] {
  const existingIds = new Set(existingAbilities.map((ability) => ability.id));

  return triggers
    .filter((trigger) => {
      const migratedId = legacyTriggerAbilityId(trigger.id);
      return !existingIds.has(trigger.id) && !existingIds.has(migratedId);
    })
    .map((trigger) => ({
      id: legacyTriggerAbilityId(trigger.id),
      when: { event: trigger.event },
      runtimeCondition: trigger.condition,
      effects: trigger.effects
    }));
}

function legacyTriggerAbilityId(triggerId: string): string {
  return `legacy-trigger:${triggerId}`;
}
