"use client";

import { RotateCcw, Shield, Swords, X, Zap } from "lucide-react";
import { useState } from "react";
import type React from "react";
import {
  AbilityTargetMap,
  CardInstance,
  PlayerId,
  SpellTarget,
  SpellTargetKind,
  TargetDefinition,
  UnitInstance
} from "../game/types";
import { useLocalGame } from "../hooks/useLocalGame";
import type { GameAction } from "../game/types";
import { ActionLog } from "./ActionLog";
import { CardView } from "./CardView";
import { getUnitAttack, getUnitHealth } from "../game/cards";
import { hasKeyword } from "../game/engine";
import { HoverProvider } from "../contexts/HoverContext";
import { CardInspector } from "./CardInspector";
import { HandView } from "./HandView";
import { getCardDefinition } from "../game/cardRegistry";

export function GameBoard() {
  const { gameState, actionLog, dispatch, dispatchChain, resetGame } = useLocalGame();
  const [selectedBlockerId, setSelectedBlockerId] = useState<string>();
  const [selectedSpell, setSelectedSpell] = useState<CardInstance>();
  const [selectedSpellTarget, setSelectedSpellTarget] = useState<SpellTarget>();
  const [viewingGraveyard, setViewingGraveyard] = useState<PlayerId>();
  const attackPlayerId = gameState.attackTokenPlayerId;
  const defenderId: PlayerId = attackPlayerId === "P1" ? "P2" : "P1";
  const attackerCount = gameState.combat.attackers.length;
  const selectedBlocker = selectedBlockerId
    ? gameState.players[defenderId].board.find(
        (unit) => unit.instanceId === selectedBlockerId
      )
    : undefined;
  const attackerIds = gameState.combat.attackers.map((lane) => lane.attackerId);
  const assignedBlockerIds = gameState.combat.attackers
    .map((lane) => lane.blockerId)
    .filter((blockerId): blockerId is string => Boolean(blockerId));

  const cardDef = (card: CardInstance) => getCardDefinition(card.cardId);
  const unitDef = (unit: UnitInstance) => getCardDefinition(unit.cardId);

  function canPlay(playerId: PlayerId, card: CardInstance) {
    const player = gameState.players[playerId];
    const definition = cardDef(card);
    const isSpell = definition.type === "spell";
    if (gameState.phase === "DISCARD") {
      return (
        gameState.pendingDiscard?.playerId === playerId &&
        card.ownerId === playerId &&
        player.hand.length > gameState.pendingDiscard.downTo
      );
    }

    return (
      gameState.started &&
      !gameState.winnerId &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === playerId &&
      (isSpell
        ? player.mana + player.spellMana >= definition.cost
        : player.mana >= definition.cost)
    );
  }

  function playCard(playerId: PlayerId, card: CardInstance) {
    const definition = cardDef(card);
    if (gameState.phase === "DISCARD") {
      dispatch(
        { type: "DISCARD_CARD", playerId, cardInstanceId: card.instanceId },
        `${playerId} discarded ${definition.name}.`
      );
      return;
    }

    if (definition.supertype?.toLowerCase() === "champion") {
      if (!window.confirm(`Are you sure you want to play Champion ${definition.name}?`)) {
        return;
      }
    }

    if (definition.type === "spell") {
      playOrSelectSpell(playerId, card);
      return;
    }

    if ((definition.type === "unit" || definition.type === "champion") && gameState.players[playerId].board.length >= 6) {
      setSelectedSpell(card); // Treat as spell to select replacement target
      return;
    }

    dispatch(
      { type: "PLAY_UNIT", playerId, cardInstanceId: card.instanceId },
      `${playerId} played ${definition.name}.`
    );
  }

  function playOrSelectSpell(playerId: PlayerId, card: CardInstance) {
    if (selectedSpell?.instanceId === card.instanceId) {
      setSelectedSpell(undefined);
      setSelectedSpellTarget(undefined);
      return;
    }

    const targetKind = getPrimarySpellTarget(card);
    setSelectedSpell(card);

    if (targetKind === "SELF") {
      setSelectedSpellTarget({ type: "SELF", playerId });
      return;
    }

    if (targetKind === "NEXUS") {
      const targetPlayerId =
        cardDef(card).effects?.[0]?.type === "HEAL" ? playerId : opponentOf(playerId);
      setSelectedSpellTarget({ type: "NEXUS", playerId: targetPlayerId });
      return;
    }

    setSelectedSpellTarget(undefined);
  }

  function getDamagePreview(attacker: UnitInstance, blocker?: UnitInstance) {
    if (!blocker) {
      return { attackerTakes: 0, blockerTakes: 0, nexusTakes: getUnitAttack(attacker) };
    }
    const atk = getUnitAttack(attacker);
    const blkAtk = getUnitAttack(blocker);
    
    let attackerTakes = 0;
    let blockerTakes = 0;
    let nexusTakes = 0;
    
    const calcDamage = (amount: number, unit: UnitInstance) => {
      if (amount <= 0) return 0;
      if (hasKeyword(unit, "BARRIER")) return 0;
      return hasKeyword(unit, "TOUGH") ? Math.max(0, amount - 1) : amount;
    };
    
    if (hasKeyword(attacker, "QUICK_ATTACK")) {
      const dmgToBlocker = calcDamage(atk, blocker);
      blockerTakes = Math.min(getUnitHealth(blocker), dmgToBlocker);
      if (hasKeyword(attacker, "OVERWHELM")) {
        nexusTakes = Math.max(0, dmgToBlocker - getUnitHealth(blocker));
      }
      if (getUnitHealth(blocker) - blockerTakes > 0) {
        attackerTakes = calcDamage(blkAtk, attacker);
      }
    } else {
      const dmgToBlocker = calcDamage(atk, blocker);
      blockerTakes = Math.min(getUnitHealth(blocker), dmgToBlocker);
      attackerTakes = calcDamage(blkAtk, attacker);
      if (hasKeyword(attacker, "OVERWHELM")) {
        nexusTakes = Math.max(0, dmgToBlocker - getUnitHealth(blocker));
      }
    }
    
    return { attackerTakes, blockerTakes, nexusTakes };
  }

  function getPrimarySpellTarget(card: CardInstance): SpellTargetKind | undefined {
    const target = cardDef(card).effects?.[0]?.target;
    if (
      target === "ENEMY_UNIT" ||
      target === "ALLY_UNIT" ||
      target === "NEXUS" ||
      target === "SELF" ||
      target === "ALLY_GRAVEYARD" ||
      target === "ENEMY_GRAVEYARD"
    ) {
      return target;
    }
    return undefined;
  }

  function assignBlocker(attacker: UnitInstance, blockerId: string) {
    const blockerName =
      gameState.players[defenderId].board.find(
        (candidate) => candidate.instanceId === blockerId
      );
    const blockerLabel = blockerName ? unitDef(blockerName).name : "a unit";

    dispatch(
      {
        type: "DECLARE_BLOCKER",
        playerId: defenderId,
        attackerId: attacker.instanceId,
        blockerId
      },
      `${defenderId} blocked ${unitDef(attacker).name} with ${blockerLabel}.`
    );
    setSelectedBlockerId(undefined);
  }

  function selectBoardUnit(playerId: PlayerId, unit: UnitInstance) {
    if (!gameState.started || gameState.winnerId) {
      return;
    }

    if (selectedSpell && gameState.phase === "ACTION") {
      const casterId = selectedSpell.ownerId;
      
      const selectedDefinition = cardDef(selectedSpell);
      if (selectedDefinition.type === "unit" || selectedDefinition.type === "champion") {
        if (playerId === casterId) {
          dispatch(
            { type: "PLAY_UNIT", playerId: casterId, cardInstanceId: selectedSpell.instanceId, replaceUnitId: unit.instanceId },
            `${casterId} played ${selectedDefinition.name}, replacing ${unitDef(unit).name}.`
          );
          setSelectedSpell(undefined);
          setSelectedSpellTarget(undefined);
        }
        return;
      }

      const targetKind = getPrimarySpellTarget(selectedSpell);
      const isValidUnitTarget =
        (targetKind === "ALLY_UNIT" && playerId === casterId) ||
        (targetKind === "ENEMY_UNIT" && playerId !== casterId);

      if (!isValidUnitTarget) {
        return;
      }

      setSelectedSpellTarget({ type: "UNIT", playerId, unitId: unit.instanceId });
      return;
    }

    if (
      playerId === attackPlayerId &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId &&
      selectedBlockerId &&
      gameState.combat.attackers.some(
        (lane) => lane.attackerId === unit.instanceId && !lane.blockerId
      )
    ) {
      assignBlocker(unit, selectedBlockerId);
      return;
    }

    if (playerId === attackPlayerId && gameState.priorityPlayerId === playerId) {
      if (gameState.phase !== "ACTION" || !gameState.attackTokenAvailable) {
        return;
      }
      if (gameState.combat.attackers.some((lane) => lane.attackerId === unit.instanceId)) {
        dispatch(
          { type: "REMOVE_ATTACKER", playerId, unitInstanceId: unit.instanceId },
          `${playerId} removed ${unitDef(unit).name} from the attack.`
        );
        return;
      }
      dispatch(
        { type: "DECLARE_ATTACKER", playerId, unitInstanceId: unit.instanceId },
        `${playerId} sent ${unitDef(unit).name} to attack.`
      );
      return;
    }

    if (playerId === defenderId && gameState.priorityPlayerId === playerId) {
      if (gameState.phase !== "BLOCK") {
        return;
      }
      if (gameState.combat.attackers.some((lane) => lane.blockerId === unit.instanceId)) {
        dispatch(
          { type: "REMOVE_BLOCKER", playerId, blockerId: unit.instanceId },
          `${playerId} removed ${unitDef(unit).name} from blocking.`
        );
        setSelectedBlockerId(undefined);
        return;
      }

      const unblockedAttackers = gameState.combat.attackers
        .filter((lane) => !lane.blockerId)
        .map((lane) =>
          gameState.players[attackPlayerId].board.find(
            (attacker) => attacker.instanceId === lane.attackerId
          )
        )
        .filter((attacker): attacker is UnitInstance => Boolean(attacker));

      if (unblockedAttackers.length === 1) {
        assignBlocker(unblockedAttackers[0], unit.instanceId);
        return;
      }

      setSelectedBlockerId(
        unit.instanceId === selectedBlockerId ? undefined : unit.instanceId
      );
    }
  }

  function commitAttack() {
    setSelectedBlockerId(undefined);
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    dispatch(
      { type: "COMMIT_ATTACK", playerId: attackPlayerId },
      `${attackPlayerId} committed attackers. ${defenderId} may block.`
    );
  }

  function passPriority() {
    setSelectedBlockerId(undefined);
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    dispatch(
      { type: "END_TURN", playerId: gameState.priorityPlayerId },
      `${gameState.priorityPlayerId} passed priority.`
    );
  }

  function commitBlocks() {
    setSelectedBlockerId(undefined);
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    dispatch(
      { type: "COMMIT_BLOCKS", playerId: defenderId },
      `${defenderId} committed blocks. Combat is ready.`
    );
  }

  function startRound() {
    setSelectedBlockerId(undefined);
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    dispatch({ type: "START_ROUND" }, "Round advanced. Mana refilled and attack token rotated.");
  }

  function resolveCombat() {
    setSelectedBlockerId(undefined);
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    dispatch({ type: "RESOLVE_COMBAT" }, "Combat resolved.");
  }

  // --- Smart Action Orb logic ---
  type SmartAction = {
    label: string;
    sublabel: string;
    mode: "attack" | "defend" | "round" | "idle";
    enabled: boolean;
    onClick: () => void;
  };

  function getSmartAction(): SmartAction {
    const started = gameState.started && !gameState.winnerId;

    // ATTACK/PASS: attacker has priority, action phase, attack token still available.
    if (
      started &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === attackPlayerId &&
      gameState.attackTokenAvailable
    ) {
      if (attackerCount === 0) {
        return {
          label: "PASS",
          sublabel: "No attack",
          mode: "idle",
          enabled: true,
          onClick: passPriority
        };
      }

      return {
        label: "ATTACK",
        sublabel: `${attackerCount} unit${attackerCount > 1 ? "s" : ""}`,
        mode: "attack",
        enabled: true,
        onClick: commitAttack
      };
    }

    // DEFEND: block phase, defender has priority, no pending manual assignment
    if (
      started &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId &&
      !selectedBlockerId
    ) {
      const hasBlocks = assignedBlockerIds.length > 0;

      return {
        label: hasBlocks ? "DEFEND" : "PASS",
        sublabel: hasBlocks
          ? `${assignedBlockerIds.length} block${assignedBlockerIds.length > 1 ? "s" : ""}`
          : "No blocks",
        mode: "defend",
        enabled: true,
        // Commit blocks then auto-resolve in one atomic step
        onClick: () => {
          setSelectedBlockerId(undefined);
          setSelectedSpell(undefined);
          setSelectedSpellTarget(undefined);
          dispatchChain([
            { action: { type: "COMMIT_BLOCKS", playerId: defenderId }, label: `${defenderId} committed blocks.` },
            { action: { type: "RESOLVE_COMBAT" }, label: "Combat resolved." }
          ]);
        }
      };
    }

    // ROUND: action phase — advance the round
    if (started && gameState.phase === "ACTION") {
      return {
        label: "ROUND",
        sublabel: `#${gameState.round}`,
        mode: "round",
        enabled: true,
        onClick: startRound
      };
    }

    return {
      label: "ROUND",
      sublabel: `#${gameState.round}`,
      mode: "idle",
      enabled: false,
      onClick: () => {}
    };
  }

  function castSelectedSpell() {
    if (!selectedSpell || !selectedSpellTarget) {
      return;
    }

    dispatch(
      {
        type: "PLAY_SPELL",
        playerId: selectedSpell.ownerId,
        cardInstanceId: selectedSpell.instanceId,
        target: selectedSpellTarget
      },
      `${selectedSpell.ownerId} played ${cardDef(selectedSpell).name}.`
    );
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
  }

  function submitPendingAbilityTarget(targetId: string, target: SpellTarget) {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return;
    }

    const targets: AbilityTargetMap = {
      [targetId]: target
    };
    dispatch(
      {
        type: "SUBMIT_ABILITY_TARGETS",
        playerId: pendingChoice.playerId,
        targets
      },
      `${pendingChoice.playerId} chose an ability target.`
    );
  }

  function cancelPendingChoice() {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return;
    }

    dispatch(
      { type: "CANCEL_PENDING_CHOICE", playerId: pendingChoice.playerId },
      `${pendingChoice.playerId} cancelled the ability choice.`
    );
  }

  function getPendingTargetUnits(targetDefinition: TargetDefinition): Array<{
    playerId: PlayerId;
    unit: UnitInstance;
  }> {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return [];
    }

    const sourcePlayerId = pendingChoice.playerId;
    const enemyPlayerId = opponentOf(sourcePlayerId);
    const playerIds: PlayerId[] =
      targetDefinition.kind === "ALLY_UNIT"
        ? [sourcePlayerId]
        : targetDefinition.kind === "ENEMY_UNIT"
          ? [enemyPlayerId]
          : targetDefinition.kind === "ANY_UNIT" || targetDefinition.kind === "ANY_TARGET"
            ? ["P1", "P2"]
            : [];

    return playerIds.flatMap((playerId) =>
      gameState.players[playerId].board.map((unit) => ({ playerId, unit }))
    );
  }

  function renderPendingChoice() {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return null;
    }

    const targetDefinition = pendingChoice.requiredTargets[0];
    const sourceName = getCardDefinition(pendingChoice.sourceCardId).name;

    return (
      <div
        className="pending-choice-overlay"
        role="dialog"
        aria-modal="true"
        onClick={cancelPendingChoice}
      >
        <div className="pending-choice-panel" onClick={(event) => event.stopPropagation()}>
          <div className="pending-choice-header">
            <strong>{sourceName}</strong>
            <span>{describeAbilityTargetNeed(targetDefinition)}</span>
          </div>

          {targetDefinition ? (
            <div className="pending-choice-grid">
              {getPendingTargetUnits(targetDefinition).map(({ playerId, unit }) => (
                <CardView
                  key={unit.instanceId}
                  unit={unit}
                  onClick={() =>
                    submitPendingAbilityTarget(targetDefinition.id, {
                      type: "UNIT",
                      playerId,
                      unitId: unit.instanceId
                    })
                  }
                  visualEvents={[]}
                />
              ))}
            </div>
          ) : null}

          {targetDefinition && getPendingTargetUnits(targetDefinition).length === 0 ? (
            <div className="empty-message">No valid targets.</div>
          ) : null}

        </div>
      </div>
    );
  }

  function renderPlayerStatus(playerId: PlayerId, label: string) {
    const player = gameState.players[playerId];
    const isAttacker = gameState.attackTokenPlayerId === playerId;
    const hasPriority = gameState.priorityPlayerId === playerId;
    const RoleIcon = isAttacker ? Swords : Shield;
    const roleLabel = isAttacker
      ? gameState.attackTokenAvailable
        ? "Attack"
        : "Spent"
      : "Defense";

    return (
      <div
        className={`nexus-orb ${hasPriority ? "is-priority" : ""} ${
          isAttacker ? "is-attacker" : "is-defender"
        }`}
      >
        <span>{label}</span>
        <strong>{player.nexusHp}</strong>
        <small>
          {player.mana}/{player.maxMana} mana · {player.spellMana} spell
        </small>
        <small
          className={`combat-role ${
            isAttacker ? "is-attacker" : "is-defender"
          }`}
        >
          <RoleIcon size={11} aria-hidden="true" />
          {roleLabel}
        </small>
      </div>
    );
  }

  function renderDeckStack(playerId: PlayerId, label: string) {
    const player = gameState.players[playerId];

    return (
      <div className="deck-stack">
        <span>{label}</span>
        <strong>{player.deck.length}</strong>
      </div>
    );
  }

  function renderGraveyard(playerId: PlayerId, label: string) {
    const entryCount = gameState.players[playerId].graveyard.length;
    return (
      <div 
        className={`deck-stack graveyard-stack ${entryCount > 0 ? "has-cards" : ""}`}
        onClick={() => setViewingGraveyard(playerId)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setViewingGraveyard(playerId);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span>{label}</span>
        <strong>{entryCount}</strong>
      </div>
    );
  }

  function renderSpellStack(label: string) {
    if (!selectedSpell) {
      return <div className="spell-stack spell-stack--empty" aria-hidden="true" />;
    }

    return (
      <div className="spell-stack">
        <span>{label}</span>
        <strong>{cardDef(selectedSpell).name}</strong>
      </div>
    );
  }

  function getRecallUnits(playerId: PlayerId) {
    const combatUnitIds = new Set([...attackerIds, ...assignedBlockerIds]);
    return gameState.players[playerId].board.filter(
      (unit) => !combatUnitIds.has(unit.instanceId)
    );
  }

  function getActiveUnits(playerId: PlayerId): Array<UnitInstance | undefined> {
    if (playerId === attackPlayerId) {
      return gameState.combat.attackers.map((lane) =>
        gameState.players[playerId].board.find(
          (unit) => unit.instanceId === lane.attackerId
        )
      );
    }

    return gameState.combat.attackers.map((lane) =>
      lane.blockerId
        ? gameState.players[playerId].board.find(
            (unit) => unit.instanceId === lane.blockerId
          )
        : undefined
    );
  }

  function renderSixSlots(
    slots: Array<UnitInstance | undefined>,
    options: {
      playerId: PlayerId;
      rowClassName: string;
      selectedUnitIds?: string[];
      isEmptySlotEnabled?: (index: number) => boolean;
      onEmptySlotClick?: (index: number) => void;
      renderUnit?: (unit: UnitInstance, index: number) => React.ReactNode;
    }
  ) {
    return (
      <div className={`battle-row ${options.rowClassName}`}>
        {Array.from({ length: 6 }).map((_, index) => {
          const unit = slots[index];

          if (!unit) {
            const canUseEmptySlot =
              Boolean(options.onEmptySlotClick) &&
              (options.isEmptySlotEnabled?.(index) ?? true);

            return (
              <button
                className="battle-slot battle-slot--empty"
                type="button"
                key={`${options.rowClassName}-empty-${index}`}
                onClick={() => options.onEmptySlotClick?.(index)}
                disabled={!canUseEmptySlot}
                aria-label={`Empty slot ${index + 1}`}
              />
            );
          }

          return (
            <div className="battle-slot" key={unit.instanceId}>
              {options.renderUnit ? (
                options.renderUnit(unit, index)
              ) : (
                <CardView
                  unit={unit}
                  selected={
                    unit.instanceId === selectedBlockerId ||
                    Boolean(options.selectedUnitIds?.includes(unit.instanceId))
                  }
                  onClick={() => selectBoardUnit(options.playerId, unit)}
                  visualEvents={gameState.visualEvents.filter(
                    (event) =>
                      (event as any).targetId === unit.instanceId ||
                      (event as any).sourceId === unit.instanceId
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderWaitingRow(playerId: PlayerId) {
    const units = getRecallUnits(playerId);
    const isEnemy = playerId === "P2";
    const selectedIds = playerId === attackPlayerId ? attackerIds : assignedBlockerIds;

    return (
      <div
        className={`battle-row-wrap waiting-row-wrap ${
          isEnemy ? "opponent-waiting" : "own-waiting"
        }`}
        aria-label={`${playerId} waiting row`}
      >
        <div className="battle-row-label">
          {isEnemy ? "Opponent waiting row" : "Your waiting row"}{" "}
          <strong>{units.length}/6</strong>
        </div>
        {renderSixSlots(units, {
          playerId,
          rowClassName: isEnemy ? "opponent-waiting-row" : "own-waiting-row",
          selectedUnitIds: selectedIds
        })}
      </div>
    );
  }

  function renderActiveRow(playerId: PlayerId) {
    const isEnemy = playerId === "P2";
    const slots = getActiveUnits(playerId);
    const canAssignToEmptyLane =
      playerId === defenderId &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId &&
      Boolean(selectedBlockerId);

    return (
      <div
        className={`battle-row-wrap active-row-wrap ${
          isEnemy ? "opponent-active" : "own-active"
        }`}
        aria-label={`${playerId} active row`}
      >
        <div className="battle-row-label">
          {isEnemy ? "Opponent active row" : "Your active row"}
        </div>
        {renderSixSlots(slots, {
          playerId,
          rowClassName: isEnemy ? "opponent-active-row" : "own-active-row",
          isEmptySlotEnabled: canAssignToEmptyLane
            ? (index) => {
                const lane = gameState.combat.attackers[index];
                return Boolean(lane && !lane.blockerId);
              }
            : undefined,
          onEmptySlotClick: canAssignToEmptyLane
            ? (index) => {
                const lane = gameState.combat.attackers[index];
                if (!lane || lane.blockerId || !selectedBlockerId) {
                  return;
                }

                const attacker = gameState.players[attackPlayerId].board.find(
                  (candidate) => candidate.instanceId === lane.attackerId
                );
                if (attacker) {
                  assignBlocker(attacker, selectedBlockerId);
                }
              }
            : undefined,
          renderUnit: (unit, index) => renderActiveUnit(playerId, unit, index)
        })}
      </div>
    );
  }

  function renderActiveUnit(playerId: PlayerId, unit: UnitInstance, index: number) {
    const lane = gameState.combat.attackers[index];
    const canToggleAttacker =
      playerId === attackPlayerId &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === attackPlayerId &&
      gameState.attackTokenAvailable;
    const canRemoveBlocker =
      playerId === defenderId &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId;

    return (
      <div className="active-unit-card">
        <CardView
          unit={unit}
          selected={
            unit.instanceId === selectedBlockerId ||
            attackerIds.includes(unit.instanceId) ||
            assignedBlockerIds.includes(unit.instanceId)
          }
          onClick={
            canToggleAttacker
              ? () => selectBoardUnit(playerId, unit)
              : canRemoveBlocker
                ? () => {
                    dispatch(
                      {
                        type: "REMOVE_BLOCKER",
                        playerId: defenderId,
                        blockerId: unit.instanceId
                      },
                      `${defenderId} removed ${unitDef(unit).name} from blocking.`
                    );
                  }
                : undefined
          }
          visualEvents={gameState.visualEvents.filter(
            (event) =>
              (event as any).targetId === unit.instanceId ||
              (event as any).sourceId === unit.instanceId
          )}
        />
        {playerId === defenderId && lane ? (
          <div className="damage-preview">
            {(() => {
              const attacker = gameState.players[attackPlayerId].board.find(
                (candidate) => candidate.instanceId === lane.attackerId
              );
              if (!attacker) {
                return "No damage";
              }
              const preview = getDamagePreview(attacker, unit);
              const parts = [];
              if (preview.attackerTakes > 0) parts.push(`Atk ${preview.attackerTakes}`);
              if (preview.blockerTakes > 0) parts.push(`Blk ${preview.blockerTakes}`);
              if (preview.nexusTakes > 0) parts.push(`Nexus ${preview.nexusTakes}`);
              return parts.length > 0 ? parts.join(" · ") : "No damage";
            })()}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <HoverProvider>
      <main className="app-shell board-layout">
        <aside className="left-rail">
          {viewingGraveyard ? (
            <div className="graveyard-modal-overlay" onClick={() => setViewingGraveyard(undefined)}>
              <div className="graveyard-modal-content" onClick={(e) => e.stopPropagation()}>
                <header>
                  <h2>{viewingGraveyard}'s Graveyard</h2>
                  <button onClick={() => setViewingGraveyard(undefined)}><X size={20} /></button>
                </header>
                <div className="graveyard-grid">
                  {gameState.players[viewingGraveyard].graveyard.length === 0 ? (
                    <div className="empty-message">Graveyard is empty.</div>
                  ) : (
                    gameState.players[viewingGraveyard].graveyard.map((entry) => (
                      <div key={entry.id} className="graveyard-entry">
                        <CardView card={{ instanceId: entry.id, cardId: entry.cardId, ownerId: entry.ownerId }} />
                        <div className="cause-tag">{entry.cause} (R{entry.round})</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <ActionLog entries={actionLog} />
          <section className="quick-controls" aria-label="Game controls">
            <div className="button-row">
              <button
                type="button"
                onClick={() => dispatch({ type: "START_GAME", firstPlayerId: "P1" })}
                disabled={gameState.started}
              >
                <Zap size={16} aria-hidden="true" /> Start
              </button>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "DRAW_CARD", playerId: gameState.priorityPlayerId })
                }
                disabled={!gameState.started || Boolean(gameState.winnerId)}
              >
                Draw
              </button>
              <button
                type="button"
                onClick={startRound}
                disabled={
                  !gameState.started ||
                  Boolean(gameState.winnerId) ||
                  gameState.phase !== "ACTION"
                }
              >
                <RotateCcw size={16} aria-hidden="true" /> Round
              </button>
              <button
                type="button"
                onClick={passPriority}
                disabled={
                  !gameState.started ||
                  Boolean(gameState.winnerId) ||
                  gameState.phase !== "ACTION"
                }
              >
                Pass
              </button>
              <button type="button" onClick={resetGame}>
                Reset
              </button>
            </div>
          </section>
        </aside>

        <section className="battle-table lor-table" aria-label="Local battle board">
          <header className="topbar compact-topbar">
            <div className="stat-row">
              <span className="stat-pill">Round <strong>{gameState.round}</strong></span>
              <span className="stat-pill">Turn <strong>{gameState.turn}</strong></span>
              <span className="stat-pill">Priority <strong>{gameState.priorityPlayerId}</strong></span>
              <span className="stat-pill">Phase <strong>{gameState.phase}</strong></span>
              {gameState.pendingDiscard ? (
                <span className="stat-pill">
                  Discard{" "}
                  <strong>
                    {gameState.pendingDiscard.playerId}{" "}
                    {gameState.players[gameState.pendingDiscard.playerId].hand.length}/
                    {gameState.pendingDiscard.downTo}
                  </strong>
                </span>
              ) : null}
              <span className="stat-pill">
                Attack <strong>{gameState.attackTokenPlayerId}{gameState.attackTokenAvailable ? "" : " spent"}</strong>
              </span>
            </div>
            {gameState.winnerId ? (
              <div className="winner-banner">{gameState.winnerId} wins.</div>
            ) : null}
          </header>

          <HandView
            cards={gameState.players.P2.hand}
            selectedCardId={
              selectedSpell?.ownerId === "P2" ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay("P2", card)}
            onPlayCard={(card) => playCard("P2", card)}
          />

          <div className="arena-grid">
            <div className="side-counters">
              {renderGraveyard("P2", "GY")}
              {renderDeckStack("P2", "Deck")}
              {renderDeckStack("P1", "Deck")}
              {renderGraveyard("P1", "GY")}
            </div>

            <div className="center-board">
              {renderWaitingRow("P2")}
              {renderActiveRow("P2")}

              <div className="combat-status-bar">
                {gameState.phase === "BLOCK" && attackerCount > 0 ? (
                  <span className="stat-pill">
                    <Swords size={12} aria-hidden="true" /> <strong>{attackerCount}</strong> attacking
                  </span>
                ) : null}
                {selectedBlocker ? (
                  <span className="stat-pill">
                    <Shield size={12} aria-hidden="true" /> <strong>{unitDef(selectedBlocker).name}</strong>
                  </span>
                ) : null}
              </div>

              {renderActiveRow("P1")}
              {renderWaitingRow("P1")}
            </div>

            <div className="status-column">
              {renderPlayerStatus("P2", "Nexus")}
              {renderSpellStack("Spell")}
              {(() => {
                const action = getSmartAction();
                return (
                  <button
                    type="button"
                    className={`action-orb action-orb--${action.mode} ${
                      action.enabled ? "action-orb--active" : ""
                    }`}
                    onClick={action.onClick}
                    disabled={!action.enabled}
                    aria-label={action.label}
                  >
                    <span className="action-orb__label">{action.label}</span>
                    <span className="action-orb__sub">{action.sublabel}</span>
                  </button>
                );
              })()}
              {renderSpellStack("Spell")}
              {renderPlayerStatus("P1", "Nexus")}
            </div>
          </div>

          <HandView
            cards={gameState.players.P1.hand}
            selectedCardId={
              selectedSpell?.ownerId === "P1" ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay("P1", card)}
            onPlayCard={(card) => playCard("P1", card)}
          />

          {selectedSpell ? (
            <section className="spell-panel floating-spell-panel" aria-label="Selected spell">
              <div className="spell-summary">
                <strong>{cardDef(selectedSpell).name}</strong>
                <span>
                  Target:{" "}
                  {cardDef(selectedSpell).type === "unit" ||
                  cardDef(selectedSpell).type === "champion"
                    ? "click one of your 6 units to replace it"
                    : selectedSpellTarget
                      ? describeSpellTarget(selectedSpellTarget)
                      : describeNeededTarget(getPrimarySpellTarget(selectedSpell))}
                </span>
              </div>
              <div className="button-row">
                {cardDef(selectedSpell).type === "spell" ? (
                  <button
                    type="button"
                    onClick={castSelectedSpell}
                    disabled={!selectedSpellTarget}
                  >
                    Cast Spell
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}
        </section>

        <aside className="right-panel inspector-panel">
          <CardInspector />
        </aside>

        {renderPendingChoice()}
      </main>
    </HoverProvider>
  );
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function describeNeededTarget(targetKind: SpellTargetKind | undefined): string {
  switch (targetKind) {
    case "ALLY_UNIT":
      return "click an allied unit";
    case "ENEMY_UNIT":
      return "click an enemy unit";
    case "NEXUS":
      return "nexus";
    case "SELF":
      return "self";
    case "ALLY_GRAVEYARD":
      return "click a card in your graveyard";
    case "ENEMY_GRAVEYARD":
      return "click a card in enemy graveyard";
    default:
      return "none";
  }
}

function describeAbilityTargetNeed(targetDefinition: TargetDefinition | undefined): string {
  if (!targetDefinition) {
    return "Resolve ability choice";
  }

  switch (targetDefinition.kind) {
    case "ALLY_UNIT":
      return "Choose an allied unit";
    case "ENEMY_UNIT":
      return "Choose an enemy unit";
    case "ANY_UNIT":
    case "ANY_TARGET":
      return "Choose a unit";
    case "ALLY_NEXUS":
      return "Choose your nexus";
    case "ENEMY_NEXUS":
      return "Choose the enemy nexus";
    case "SELF":
      return "Choose self";
    case "ALLY_HAND_CARD":
      return "Choose a card in your hand";
    case "ENEMY_HAND_CARD":
      return "Choose a card in enemy hand";
    case "ANY_HAND_CARD":
      return "Choose a hand card";
  }
}

function describeSpellTarget(target: SpellTarget): string {
  switch (target.type) {
    case "UNIT":
      return `${target.playerId} unit`;
    case "NEXUS":
      return `${target.playerId} nexus`;
    case "SELF":
      return `${target.playerId}`;
    case "GRAVEYARD":
      return `${target.playerId} graveyard`;
    case "HAND_CARD":
      return `${target.playerId} hand card`;
  }
}
