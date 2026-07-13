import { emitEvent } from "../mechanics/triggers";
import { GameState, SpellTarget } from "../types";
import { findUnit, STARTING_NEXUS_HP } from "../rules/gameRules";

export function healTarget(state: GameState, target: SpellTarget, amount: number): void {
  if (amount <= 0) {
    return;
  }

  if (target.type === "UNIT") {
    const unit = findUnit(state, target.playerId, target.unitId);
    const healed = Math.min(unit.damage, amount);
    unit.damage = Math.max(0, unit.damage - amount);
    if (healed > 0) {
      state.visualEvents.push({
        type: "HEAL",
        targetId: unit.instanceId,
        amount: healed,
        isNexus: false
      });
      emitEvent(state, {
        type: "UNIT_HEALED",
        playerId: unit.ownerId,
        unitInstanceId: unit.instanceId,
        amount: healed
      });
    }
    return;
  }

  if (target.type === "NEXUS" || target.type === "SELF") {
    const player = state.players[target.playerId];
    const healed = Math.min(STARTING_NEXUS_HP - player.nexusHp, amount);
    if (healed > 0) {
      player.nexusHp += healed;
      state.visualEvents.push({
        type: "HEAL",
        targetId: `nexus-${target.playerId}`,
        amount: healed,
        isNexus: true
      });
    }
  }
}

export function healUnitById(
  state: GameState,
  playerId: "P1" | "P2",
  unitId: string,
  amount: number
): void {
  const unit = findUnit(state, playerId, unitId);
  healTarget(state, { type: "UNIT", playerId, unitId: unit.instanceId }, amount);
}
