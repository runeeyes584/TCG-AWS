import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import type { CardDefinition, CardInstance, Keyword, SpellSpeed, UnitInstance } from "@backend/game/types";
import { statTrends, type StatTrends } from "../../cards/cardStats";
import { speedOf } from "../../cards/spellSpeed";

/** What each keyword does, as the engine plays it. */
export const KEYWORD_TEXT: Record<Keyword, string> = {
  TOUGH: "Takes 1 less damage from every hit.",
  BARRIER: "Blocks the next damage it would take, then the barrier is gone.",
  QUICK_ATTACK: "Strikes first when it fights: a blocker that dies never strikes back.",
  OVERWHELM: "Damage beyond the blocker's health goes through to the enemy Nexus."
};

export interface CardInfo {
  definition: CardDefinition;
  /** The keywords it has now (a unit's own, with what it gained), or its card's. */
  keywords: Keyword[];
  /** "Champion · Archetype", "Spell · …", "Unit · …". */
  typeLine: string;
  cost: number;
  /** Only for units and champions. */
  attack?: number;
  health?: number;
  /** Where the stats of a unit stand against the printed ones. */
  trends: StatTrends;
  /** Only for a spell (one with no speed is slow). */
  speed?: SpellSpeed;
}

/** Reads a card or a unit of the board into what the whisper and the codex show; nothing for a hidden or unknown card. */
export function describeCard(card?: CardInstance, unit?: UnitInstance): CardInfo | undefined {
  const cardId = unit?.cardId ?? card?.cardId;
  if (!cardId || cardId === "hidden-card" || !hasCard(cardId)) return undefined;

  const definition = getCardDefinition(cardId);
  const typeName = definition.type === "champion" ? "Champion" : definition.type === "spell" ? "Spell" : "Unit";
  const isSpell = definition.type === "spell";
  return {
    definition,
    keywords: (unit?.keywords ?? definition.keywords ?? []) as Keyword[],
    typeLine: [typeName, definition.archetype].filter(Boolean).join(" · "),
    cost: definition.cost,
    attack: isSpell ? undefined : unit ? getUnitAttack(unit) : definition.attack,
    health: isSpell ? undefined : unit ? getUnitHealth(unit) : definition.health,
    trends: statTrends(definition, unit),
    speed: speedOf(definition)
  };
}
