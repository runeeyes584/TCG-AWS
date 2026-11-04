/**
 * The turn clock is stamped by the server, so the browser reads it against the server's time rather than its own.
 * The offset is measured on each message from the server and ignores the time the message spent in transit, which
 * can only make the browser's reading of the server clock a little late, never early.
 */
export function clockOffset(serverTime: number | undefined, now = Date.now()): number {
  return typeof serverTime === "number" && Number.isFinite(serverTime) ? serverTime - now : 0;
}

/** The server's time as the browser reads it, given the offset measured by `clockOffset`. */
export function serverNow(offsetMs = 0, now = Date.now()): number {
  return now + offsetMs;
}
