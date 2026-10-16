/** A turn change flashed again within this long of the last banner is only a flash of the rift. */
export const BANNER_COOLDOWN_MS = 3000;

export type BannerMode = "full" | "flash";

export interface AnnouncementState {
  /** `${turn}:${owner}` of the last turn that was seen. */
  key: string;
  /** When the last banner was announced (ms). */
  announcedAt: number;
}

export interface AnnouncementInput {
  turn: number;
  owner: "you" | "opponent";
  started: boolean;
  over: boolean;
}

export const turnKey = (input: Pick<AnnouncementInput, "turn" | "owner">) => `${input.turn}:${input.owner}`;

/**
 * Decides what to show when the turn may have changed. Nothing before the match starts or after it
 * is over, nor while the same player still holds the same turn. The first turn of a match, and a
 * change after a quiet spell, get the full banner; changes in quick succession (a pass answered at
 * once) only make the rift flash, so the banner never turns into noise.
 */
export function nextAnnouncement(
  previous: AnnouncementState | undefined,
  input: AnnouncementInput,
  now: number
): { mode: BannerMode | null; state: AnnouncementState | undefined } {
  if (!input.started || input.over) return { mode: null, state: previous };
  const key = turnKey(input);
  if (previous?.key === key) return { mode: null, state: previous };

  const quick = previous !== undefined && now - previous.announcedAt < BANNER_COOLDOWN_MS;
  const mode: BannerMode = quick ? "flash" : "full";
  return {
    mode,
    // Only a full banner restarts the cooldown, so a long chain of passes still shows one now and then.
    state: { key, announcedAt: quick ? previous.announcedAt : now }
  };
}
