/** The rules of an operative callsign. The server enforces the same ones (Back-end `auth/validators.ts`, `http/user.route.ts`). */
export const CALLSIGN_MIN_LENGTH = 3;
export const CALLSIGN_MAX_LENGTH = 20;

const DISALLOWED = /[^A-Za-z0-9_]/g;
const ALLOWED = /^[A-Za-z0-9_]+$/;

/**
 * What a callsign field accepts while it is typed or pasted: letters, digits and underscores only (no spaces or
 * punctuation), at most 20 of them. The case is kept as it was written.
 */
export function sanitizeCallsign(raw: string): string {
  return raw.replace(DISALLOWED, "").slice(0, CALLSIGN_MAX_LENGTH);
}

/** Why `value` cannot be a callsign, or `undefined` when it can. */
export function validateCallsign(value: string): string | undefined {
  if (value.length < CALLSIGN_MIN_LENGTH) return `Use at least ${CALLSIGN_MIN_LENGTH} characters.`;
  if (value.length > CALLSIGN_MAX_LENGTH) return `Use at most ${CALLSIGN_MAX_LENGTH} characters.`;
  if (!ALLOWED.test(value)) return "Only letters, numbers, and underscores are allowed.";
  return undefined;
}
