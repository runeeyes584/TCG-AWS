import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import type { Keyword, UnitInstance } from "@backend/game/types";

export interface ReserveChip {
  unit: UnitInstance;
  name: string;
  attack: number;
  health: number;
  /** One letter for each keyword the unit has now: Tough, Barrier, Quick attack, Overwhelm. */
  marks: string[];
}

const MARK: Record<Keyword, string> = { TOUGH: "T", BARRIER: "B", QUICK_ATTACK: "Q", OVERWHELM: "O" };

/** The units of a waiting row as short chips: name, attack, health, keywords. Units the card table does not know are left out. */
export function reserveChips(units: UnitInstance[]): ReserveChip[] {
  return units
    .filter((unit) => hasCard(unit.cardId))
    .map((unit) => {
      const keywords = new Set<Keyword>([...(unit.keywords ?? []), ...(unit.temporaryKeywords ?? [])]);
      return {
        unit,
        name: getCardDefinition(unit.cardId).name,
        attack: getUnitAttack(unit),
        health: getUnitHealth(unit),
        marks: (Object.keys(MARK) as Keyword[]).filter((k) => keywords.has(k)).map((k) => MARK[k])
      };
    });
}
