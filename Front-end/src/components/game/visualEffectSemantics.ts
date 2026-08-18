import type { VisualEvent } from "@backend/game/types";

export type SpellEffectKind = "arcane" | "dark" | "explosion";

/** Shared effect vocabulary for the DOM overlay and Phaser VFX. */
export function getEffectKind(event: VisualEvent): SpellEffectKind | undefined {
  switch (event.type) {
    case "DAMAGE":
      return "explosion";
    case "DEBUFF":
      return "dark";
    case "BANISH":
      return "dark";
    case "HEAL":
    case "BUFF":
    case "SUMMON":
    case "TRIGGER_ACTIVATED":
    case "GRAVEYARD_RESTORE":
      return "arcane";
    default:
      return undefined;
  }
}

/** Maps engine targets to the DOM/Phaser target identity used on the board. */
export function getEffectTargetId(event: VisualEvent): string | undefined {
  switch (event.type) {
    case "DAMAGE":
    case "HEAL":
      return event.isNexus
        ? event.targetId.startsWith("nexus-")
          ? event.targetId
          : `nexus-${event.targetId}`
        : event.targetId;
    case "BUFF":
    case "DEBUFF":
      return event.targetId;
    case "SUMMON":
      return event.instanceId;
    case "BANISH":
      return `graveyard-${event.playerId}`;
    case "GRAVEYARD_RESTORE":
      return `graveyard-${event.playerId}`;
    case "TRIGGER_ACTIVATED":
      return event.sourceId;
    default:
      return undefined;
  }
}

export function getEffectColor(kind: SpellEffectKind): number {
  switch (kind) {
    case "explosion":
      return 0xf97316;
    case "dark":
      return 0x7c3aed;
    case "arcane":
      return 0x22d3ee;
  }
}
