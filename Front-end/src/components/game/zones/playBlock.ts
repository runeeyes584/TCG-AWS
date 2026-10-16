/** Why a card of the hand cannot be played now. */
export type PlayBlock = "mana" | "turn" | "other";

/** The short line shown over a card that was clicked and could not be played. */
export const BLOCK_TEXT: Record<PlayBlock, string> = {
  mana: "NOT ENOUGH MANA",
  turn: "NOT YOUR TURN",
  other: "NOT NOW"
};

export interface PlayContext {
  /** The viewer plays this hand and can see it. */
  controllable: boolean;
  started: boolean;
  over: boolean;
  /** It is the action phase (not a discard, not a pending choice). */
  inAction: boolean;
  hasPriority: boolean;
  mana: number;
  spellMana: number;
  cost: number;
  isSpell: boolean;
}

/**
 * Why a card that cannot be played is blocked, for the cases the player can act on: it is not their turn, or they
 * cannot pay. The caller asks only after its own check said the card cannot be played.
 */
export function playBlockReason(context: PlayContext): PlayBlock {
  if (!context.controllable || !context.started || context.over || !context.inAction) return "other";
  if (!context.hasPriority) return "turn";
  const available = context.isSpell ? context.mana + context.spellMana : context.mana;
  return available < context.cost ? "mana" : "other";
}
