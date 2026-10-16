/** Rules of the resource tracks (mirrors the engine's MAX_MANA / MAX_SPELL_MANA). */
export const MAX_MANA = 10;
export const MAX_SPELL_MANA = 3;

/** One mana gem: available, about to be spent by the previewed card, spent, or not unlocked yet. */
export type ManaGemState = "on" | "preview" | "spent" | "locked";
export type SpellShardState = "on" | "preview" | "empty";

export interface Resources {
  mana: number;
  maxMana: number;
  spellMana: number;
}

/**
 * The ten gems of a mana track, left to right. The first `mana` are available (the last
 * `previewUsed` of those light up as the cost of the previewed card); the rest of the unlocked
 * ones are spent; the ones past `maxMana` are not unlocked yet (max mana grows each round).
 */
export function manaGemStates(resources: Pick<Resources, "mana" | "maxMana">, previewUsed = 0): ManaGemState[] {
  const { mana, maxMana } = resources;
  return Array.from({ length: MAX_MANA }, (_, index) => {
    if (index < mana) return index >= mana - previewUsed ? "preview" : "on";
    return index < maxMana ? "spent" : "locked";
  });
}

/** The three spell-mana shards, left to right. */
export function spellShardStates(spellMana: number, previewUsed = 0): SpellShardState[] {
  return Array.from({ length: MAX_SPELL_MANA }, (_, index) => {
    if (index < spellMana) return index >= spellMana - previewUsed ? "preview" : "on";
    return "empty";
  });
}

export interface CarryOver {
  /** Gem indices the stored mana leaves from, in flight order. */
  from: number[];
  /** Shard indices that light up, in the same order. */
  to: number[];
  /** Gem index of the left-over mana that is lost because the track is full, if any. */
  dissolve?: number;
}

/**
 * What happens to the mana left over when a round ends. The engine adds the leftover mana to the
 * spell mana (capped at 3) and refills the mana, so a change of round with leftover mana means
 * `gained` gems turn into shards, and whatever did not fit is lost. `prev` is the player before
 * the round changed, `next` after.
 */
export function carryOver(prev: Resources, next: Pick<Resources, "spellMana">, roundChanged: boolean): CarryOver | null {
  if (!roundChanged || prev.mana <= 0) return null;
  const gained = Math.max(0, Math.min(MAX_SPELL_MANA - prev.spellMana, next.spellMana - prev.spellMana));
  const lost = prev.mana - gained > 0 && prev.spellMana + gained >= MAX_SPELL_MANA;
  if (gained === 0 && !lost) return null;

  const lastGem = prev.mana - 1;
  return {
    from: Array.from({ length: gained }, (_, i) => lastGem - i),
    to: Array.from({ length: gained }, (_, i) => prev.spellMana + i),
    dissolve: lost ? lastGem - gained : undefined
  };
}

/** The change of HP to flash next to the number: negative for damage, positive for healing, 0 for none. */
export function hpDelta(previous: number | undefined, current: number): number {
  return previous === undefined ? 0 : current - previous;
}

/** The mana count as shown: available over the rules' ceiling, so the player sees their own cap. */
export const manaCount = (mana: number) => `${mana}/${MAX_MANA}`;
export const spellCount = (spellMana: number) => `${spellMana}/${MAX_SPELL_MANA}`;
