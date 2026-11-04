import { getUnitAttack, getUnitMaxHealth } from "@backend/game/entities/cards";
import type { CardDefinition, UnitInstance } from "@backend/game/types";

export type Trend = "up" | "down";
export type Tone = "up" | "down";

export interface StatTrends {
  attack?: Trend;
  health?: Trend;
}

/**
 * How a unit on the table stands against the numbers printed on its card. A card in hand has no
 * modifiers, so it has no trend. The colours of the stats never change; the trend is a small arrow.
 *
 * Attack: above the printed value is up, below it is down.
 * Health: a unit that is wounded is down, whatever its maximum; otherwise its maximum against the printed value.
 */
export function statTrends(definition: Pick<CardDefinition, "attack" | "health">, unit?: UnitInstance): StatTrends {
  if (!unit) return {};
  const trends: StatTrends = {};

  if (definition.attack !== undefined) {
    const attack = getUnitAttack(unit);
    if (attack > definition.attack) trends.attack = "up";
    else if (attack < definition.attack) trends.attack = "down";
  }

  if (definition.health !== undefined) {
    const maxHealth = getUnitMaxHealth(unit);
    if (unit.damage > 0 || maxHealth < definition.health) trends.health = "down";
    else if (maxHealth > definition.health) trends.health = "up";
  }

  return trends;
}

/** A short code of the trends, for cache keys. */
export function trendKey(trends: StatTrends) {
  return `${trends.attack ?? "-"}${trends.health ?? "-"}`;
}

export interface TextPart {
  text: string;
  tone?: Tone;
}

// A signed number (+1, -2), with the stat word right after it when there is one ("-1 Attack"), or a
// [Buff] / [Debuff] tag. The sign must not follow a letter or digit, so "Round-1" is left alone.
const CHANGE = /(^|[^\w])([+\-−]\d+(?:\s+(?:attack|health|atk|hp)\b)?|\[(?:buff|debuff)\])/gi;

/**
 * Cuts a card's text into parts so that what raises a stat reads green and what lowers it reads red:
 * "+1|+0" gives "+1" (up), "|", "+0" (no tone); "-3|-3" gives two down parts. A zero changes nothing.
 */
export function tintDescription(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let cursor = 0;
  const push = (part: TextPart) => {
    if (part.text) parts.push(part);
  };

  for (const match of text.matchAll(CHANGE)) {
    const lead = match[1];
    const found = match[2];
    const start = (match.index ?? 0) + lead.length;
    push({ text: text.slice(cursor, start) });
    push({ text: found, tone: toneOf(found) });
    cursor = start + found.length;
  }
  push({ text: text.slice(cursor) });
  return parts;
}

function toneOf(found: string): Tone | undefined {
  const lowered = found.toLowerCase();
  if (lowered === "[buff]") return "up";
  if (lowered === "[debuff]") return "down";
  const amount = parseInt(found.slice(1), 10);
  if (amount === 0) return undefined;
  return found[0] === "+" ? "up" : "down";
}
