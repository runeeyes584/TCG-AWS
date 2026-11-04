import type { GraveyardCause, GraveyardEntry, GraveyardEntryType } from "@backend/game/types";

/** How a graveyard is shown: how heavy its pile looks, how each card says what killed it, and how the list is read. */

/** 0 empty, 1 a few cards, 2 a crowd, 3 a heap. Sets how bright the pile glows and when it turns red. */
export type GraveyardTier = 0 | 1 | 2 | 3;

export function graveyardTier(count: number): GraveyardTier {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 9) return 2;
  return 3;
}

export type CauseIcon = "sword" | "sparkles" | "trash" | "hourglass" | "flame" | "layers";
export type CauseTone = "blood" | "violet" | "lilac" | "gold";

export interface CauseInfo {
  /** The short word on the card's tag. */
  label: string;
  icon: CauseIcon;
  tone: CauseTone;
}

const CAUSES: Record<GraveyardCause, CauseInfo> = {
  COMBAT: { label: "Slain", icon: "sword", tone: "blood" },
  SPELL: { label: "Spell", icon: "sparkles", tone: "violet" },
  EFFECT: { label: "Effect", icon: "flame", tone: "gold" },
  MODIFIER_EXPIRED: { label: "Faded", icon: "hourglass", tone: "gold" },
  DISCARD: { label: "Discard", icon: "trash", tone: "lilac" },
  MILL: { label: "Mill", icon: "layers", tone: "lilac" }
};

export function causeInfo(cause: GraveyardCause): CauseInfo {
  return CAUSES[cause] ?? { label: String(cause), icon: "flame", tone: "gold" };
}

/** The graveyard is read from its top: the card that fell last comes first. */
export function sortNewestFirst<T>(entries: readonly T[]): T[] {
  return entries.slice().reverse();
}

export type GraveyardFilter = "ALL" | GraveyardEntryType;

export const FILTER_ORDER: readonly GraveyardFilter[] = ["ALL", "UNIT", "CHAMPION", "SPELL"];

export const FILTER_LABEL: Record<GraveyardFilter, string> = {
  ALL: "All",
  UNIT: "Units",
  CHAMPION: "Champions",
  SPELL: "Spells"
};

export type TypeCounts = Record<GraveyardFilter, number>;

export function typeCounts(entries: readonly Pick<GraveyardEntry, "type">[]): TypeCounts {
  const counts: TypeCounts = { ALL: entries.length, UNIT: 0, CHAMPION: 0, SPELL: 0 };
  for (const entry of entries) counts[entry.type] += 1;
  return counts;
}

export function filterByType<T extends Pick<GraveyardEntry, "type">>(entries: readonly T[], filter: GraveyardFilter): T[] {
  return filter === "ALL" ? entries.slice() : entries.filter((entry) => entry.type === filter);
}

/** The filters worth offering: none unless the graveyard holds at least two kinds of card. */
export function availableFilters(counts: TypeCounts): GraveyardFilter[] {
  const kinds = FILTER_ORDER.filter((filter) => filter !== "ALL" && counts[filter] > 0);
  return kinds.length >= 2 ? ["ALL", ...kinds] : [];
}

/** The filter to use now: the chosen one if the graveyard still has such cards, otherwise all of them. */
export function activeFilter(chosen: GraveyardFilter, counts: TypeCounts): GraveyardFilter {
  return counts[chosen] > 0 ? chosen : "ALL";
}
