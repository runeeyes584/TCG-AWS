import { getUnitHealth } from "../cards";
import { emitEvent } from "../triggers";
import { GameState, PlayerId, SpellTarget, UnitInstance } from "../types";
import { findUnit } from "../rules/gameRules";

export type DamageSource =
  | {
      playerId?: PlayerId;
      sourceId?: string;
      sourceInstanceId?: string;
      sourceCardId?: string;
      damageType?: "COMBAT" | "SPELL" | "EFFECT" | "COST" | "FATIGUE";
    }
  | undefined;

export function dealDamage(
  state: GameState,
  source: DamageSource,
  target: SpellTarget,
  amount: number
): void {
  if (amount <= 0) {
    return;
  }

  if (target.type === "UNIT") {
    const unit = findUnit(state, target.playerId, target.unitId);
    dealDamageToUnitState(state, unit, amount, source);
    return;
  }

  if (target.type === "NEXUS" || target.type === "SELF") {
    const playerId = target.playerId;
    state.players[playerId].nexusHp -= amount;
    state.visualEvents.push({
      type: "DAMAGE",
      targetId: `nexus-${playerId}`,
      amount,
      isNexus: true
    });
    emitEvent(state, {
      type: "NEXUS_DAMAGED",
      playerId,
      targetPlayerId: playerId,
      sourcePlayerId: source?.playerId,
      sourceInstanceId: source?.sourceInstanceId ?? source?.sourceId,
      sourceCardId: source?.sourceCardId,
      amount,
      damageType: source?.damageType
    });
  }
}

export function dealDamageToUnitState(
  state: GameState,
  unit: UnitInstance,
  amount: number,
  source?: DamageSource
): { damageDealt: number; excessDamage: number } {
  if (amount <= 0) {
    return { damageDealt: 0, excessDamage: 0 };
  }

  if (removeKeyword(unit, "BARRIER")) {
    return { damageDealt: 0, excessDamage: 0 };
  }

  const modifiedDamage = unit.keywords.includes("TOUGH")
    ? Math.max(0, amount - 1)
    : amount;
  const healthBefore = getUnitHealth(unit);
  const damageDealt = Math.min(healthBefore, modifiedDamage);
  unit.damage += modifiedDamage;

  state.visualEvents.push({
    type: "DAMAGE",
    targetId: unit.instanceId,
    amount: modifiedDamage,
    isNexus: false
  });
  emitEvent(state, {
    type: "UNIT_DAMAGED",
    playerId: unit.ownerId,
    unitInstanceId: unit.instanceId,
    targetPlayerId: unit.ownerId,
    targetUnitId: unit.instanceId,
    targetInstanceId: unit.instanceId,
    targetCardId: unit.cardId,
    sourcePlayerId: source?.playerId,
    sourceInstanceId: source?.sourceInstanceId ?? source?.sourceId,
    sourceCardId: source?.sourceCardId,
    damageType: source?.damageType,
    amount: damageDealt
  });

  return {
    damageDealt,
    excessDamage: Math.max(0, modifiedDamage - healthBefore)
  };
}

function removeKeyword(unit: UnitInstance, keyword: UnitInstance["keywords"][number]): boolean {
  const index = unit.keywords.indexOf(keyword);
  if (index === -1) {
    return false;
  }
  unit.keywords.splice(index, 1);
  return true;
}
