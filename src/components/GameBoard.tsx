"use client";

import { RotateCcw, Shield, Swords, Zap } from "lucide-react";
import { useState } from "react";
import {
  CardInstance,
  PlayerId,
  SpellTarget,
  SpellTargetKind,
  UnitInstance
} from "../game/types";
import { useLocalGame } from "../hooks/useLocalGame";
import { ActionLog } from "./ActionLog";
import { PlayerZone } from "./PlayerZone";
import { CardView } from "./CardView";
import { getUnitAttack, getUnitHealth } from "../game/cards";
import { hasKeyword } from "../game/engine";
import { HoverProvider } from "../contexts/HoverContext";
import { CardInspector } from "./CardInspector";

export function GameBoard() {
  const { gameState, actionLog, dispatch, resetGame } = useLocalGame();
  const [selectedBlockerId, setSelectedBlockerId] = useState<string>();
  const [selectedSpell, setSelectedSpell] = useState<CardInstance>();
  const [selectedSpellTarget, setSelectedSpellTarget] = useState<SpellTarget>();
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

  function canPlay(playerId: PlayerId, card: CardInstance) {
    const player = gameState.players[playerId];
    return (
      gameState.started &&
      !gameState.winnerId &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === playerId &&
      (card.definition.type === "spell"
        ? player.mana + player.spellMana >= card.definition.cost
        : player.mana >= card.definition.cost && player.board.length < 6)
    );
  }

  function playCard(playerId: PlayerId, card: CardInstance) {
    if (card.definition.supertype?.toLowerCase() === "champion") {
      if (!window.confirm(`Are you sure you want to play Champion ${card.definition.name}?`)) {
        return;
      }
    }

    if (card.definition.type === "spell") {
      playOrSelectSpell(playerId, card);
      return;
    }

    dispatch(
      { type: "PLAY_UNIT", playerId, cardInstanceId: card.instanceId },
      `${playerId} played ${card.definition.name}.`
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
        card.definition.effects?.[0]?.type === "HEAL" ? playerId : opponentOf(playerId);
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
    return card.definition.effects?.[0]?.target;
  }

  function assignBlocker(attacker: UnitInstance, blockerId: string) {
    const blockerName =
      gameState.players[defenderId].board.find(
        (candidate) => candidate.instanceId === blockerId
      )?.definition.name ?? "a unit";

    dispatch(
      {
        type: "DECLARE_BLOCKER",
        playerId: defenderId,
        attackerId: attacker.instanceId,
        blockerId
      },
      `${defenderId} blocked ${attacker.definition.name} with ${blockerName}.`
    );
    setSelectedBlockerId(undefined);
  }

  function selectBoardUnit(playerId: PlayerId, unit: UnitInstance) {
    if (!gameState.started || gameState.winnerId) {
      return;
    }

    if (selectedSpell && gameState.phase === "ACTION") {
      const casterId = selectedSpell.ownerId;
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
          `${playerId} removed ${unit.definition.name} from the attack.`
        );
        return;
      }
      dispatch(
        { type: "DECLARE_ATTACKER", playerId, unitInstanceId: unit.instanceId },
        `${playerId} sent ${unit.definition.name} to attack.`
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
          `${playerId} removed ${unit.definition.name} from blocking.`
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
      `${selectedSpell.ownerId} played ${selectedSpell.definition.name}.`
    );
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
  }

  function cancelSelectedSpell() {
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
  }

  return (
    <HoverProvider>
      <main className="app-shell">
        <div className="battle-table">
        <header className="topbar">
          <div className="stat-row">
            <span className="stat-pill">
              Round <strong>{gameState.round}</strong>
            </span>
            <span className="stat-pill">
              Turn <strong>{gameState.turn}</strong>
            </span>
            <span className="stat-pill">
              Priority <strong>{gameState.priorityPlayerId}</strong>
            </span>
            <span className="stat-pill">
              Phase <strong>{gameState.phase}</strong>
            </span>
            <span className="stat-pill">
              Attack Token{" "}
              <strong>
                {gameState.attackTokenPlayerId}
                {gameState.attackTokenAvailable ? "" : " spent"}
              </strong>
            </span>
            <span className="stat-pill">
              Passes <strong>{gameState.consecutivePasses}</strong>
            </span>
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={() => dispatch({ type: "START_GAME", firstPlayerId: "P1" })}
              disabled={gameState.started}
            >
              <Zap size={16} aria-hidden="true" /> Start Game
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
              <RotateCcw size={16} aria-hidden="true" /> Start Round
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
              Pass Priority
            </button>
            <button type="button" onClick={resetGame}>
              Reset
            </button>
          </div>
        </header>

        {gameState.winnerId ? (
          <div className="winner-banner">{gameState.winnerId} wins the battle.</div>
        ) : null}

        <PlayerZone
          player={gameState.players.P2}
          gameState={gameState}
          selectedBlockerId={selectedBlockerId}
          selectedUnitIds={
            gameState.players.P2.id === attackPlayerId ? attackerIds : assignedBlockerIds
          }
          selectedCardId={
            selectedSpell?.ownerId === gameState.players.P2.id
              ? selectedSpell.instanceId
              : undefined
          }
          canPlay={canPlay}
          onPlayCard={playCard}
          onSelectBoardUnit={selectBoardUnit}
        />

        <section className="combat-controls" aria-label="Combat controls">
          <div className="stat-row">
            <span className="stat-pill">
              <Swords size={14} aria-hidden="true" /> Attackers{" "}
              <strong>{attackerCount}</strong>
            </span>
            <span className="stat-pill">
              <Shield size={14} aria-hidden="true" /> Defender <strong>{defenderId}</strong>
            </span>
            {gameState.phase === "BLOCK" ? (
              <span className="stat-pill">
                Blocker{" "}
                <strong>{selectedBlocker ? selectedBlocker.definition.name : "None"}</strong>
              </span>
            ) : null}
            {selectedSpell ? (
              <span className="stat-pill">
                Spell <strong>{selectedSpell.definition.name}</strong>
              </span>
            ) : null}
          </div>
          <div className="button-row">
            <button
              type="button"
              onClick={commitAttack}
              disabled={
                !gameState.started ||
                Boolean(gameState.winnerId) ||
                gameState.phase !== "ACTION" ||
                gameState.priorityPlayerId !== attackPlayerId ||
                !gameState.attackTokenAvailable ||
                attackerCount === 0
              }
            >
              Commit Attack
            </button>
            <button
              type="button"
              onClick={commitBlocks}
              disabled={
                !gameState.started ||
                Boolean(gameState.winnerId) ||
                gameState.phase !== "BLOCK" ||
                gameState.priorityPlayerId !== defenderId ||
                Boolean(selectedBlockerId)
              }
            >
              Commit Blocks
            </button>
            <button
              type="button"
              onClick={resolveCombat}
              disabled={
                !gameState.started ||
                Boolean(gameState.winnerId) ||
                gameState.phase !== "COMBAT" ||
                attackerCount === 0
              }
            >
              Resolve Combat
            </button>
          </div>
        </section>

        {selectedSpell ? (
          <section className="spell-panel" aria-label="Selected spell">
            <div>
              <div className="lane-label">Selected Spell</div>
              <div className="spell-summary">
                <strong>{selectedSpell.definition.name}</strong>
                <span>
                  Target:{" "}
                  {selectedSpellTarget
                    ? describeSpellTarget(selectedSpellTarget)
                    : describeNeededTarget(getPrimarySpellTarget(selectedSpell))}
                </span>
              </div>
            </div>
            <div className="button-row">
              <button
                type="button"
                onClick={castSelectedSpell}
                disabled={!selectedSpellTarget}
              >
                Cast Spell
              </button>
              <button type="button" onClick={cancelSelectedSpell}>
                Cancel
              </button>
            </div>
          </section>
        ) : null}

        <section className="attack-lanes" aria-label="Attack lanes">
          <div className="lane-heading">
            <div className="lane-label">Attack Lanes</div>
            {gameState.phase === "BLOCK" ? (
              <div className="lane-help">
                Select a {defenderId} board unit, then click an unblocked attacker lane.
                {selectedBlocker ? " Assign the selected blocker before committing." : ""}
              </div>
            ) : null}
          </div>
          <div className="attack-lane-grid">
            {gameState.combat.attackers.length === 0 ? (
              <div className="empty-slot">No attackers committed</div>
            ) : (
              gameState.combat.attackers.map((lane) => {
                const attacker = gameState.players[attackPlayerId].board.find(
                  (unit) => unit.instanceId === lane.attackerId
                );
                const blocker = lane.blockerId
                  ? gameState.players[defenderId].board.find(
                      (unit) => unit.instanceId === lane.blockerId
                    )
                  : undefined;

                if (!attacker) {
                  return null;
                }

                return (
                  <button
                    className={`attack-lane ${
                      selectedBlockerId && !lane.blockerId ? "can-assign-blocker" : ""
                    }`}
                    type="button"
                    key={lane.attackerId}
                    onClick={() => selectBoardUnit(attackPlayerId, attacker)}
                    disabled={
                      gameState.phase !== "BLOCK" ||
                      gameState.priorityPlayerId !== defenderId ||
                      !selectedBlockerId ||
                      Boolean(lane.blockerId)
                    }
                  >
                    <CardView 
                       unit={attacker} 
                       visualEvents={gameState.visualEvents.filter(e => (e as any).targetId === attacker.instanceId || (e as any).sourceId === attacker.instanceId)}
                    />
                    
                    {gameState.phase === "BLOCK" && (
                      <div className="damage-preview" style={{ fontSize: '12px', margin: '8px 0', padding: '4px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', color: '#fff', textAlign: 'center' }}>
                        {(() => {
                           const preview = getDamagePreview(attacker, blocker);
                           const parts = [];
                           if (preview.attackerTakes > 0) parts.push(`Atk takes ${preview.attackerTakes}`);
                           if (preview.blockerTakes > 0) parts.push(`Blk takes ${preview.blockerTakes}`);
                           if (preview.nexusTakes > 0) parts.push(`Nexus takes ${preview.nexusTakes}`);
                           return parts.length > 0 ? parts.join(" | ") : "No Damage";
                        })()}
                      </div>
                    )}

                    <div className="blocker-slot">
                      {blocker ? (
                        <CardView 
                          unit={blocker} 
                          visualEvents={gameState.visualEvents.filter(e => (e as any).targetId === blocker.instanceId || (e as any).sourceId === blocker.instanceId)}
                        />
                      ) : (
                        <span>
                          {selectedBlockerId ? "Click to block here" : "Unblocked"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <PlayerZone
          player={gameState.players.P1}
          gameState={gameState}
          selectedBlockerId={selectedBlockerId}
          selectedUnitIds={
            gameState.players.P1.id === attackPlayerId ? attackerIds : assignedBlockerIds
          }
          selectedCardId={
            selectedSpell?.ownerId === gameState.players.P1.id
              ? selectedSpell.instanceId
              : undefined
          }
          canPlay={canPlay}
          onPlayCard={playCard}
          onSelectBoardUnit={selectBoardUnit}
        />
      </div>

      <aside className="right-panel">
        <CardInspector />
        <ActionLog entries={actionLog} />
      </aside>
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
    default:
      return "none";
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
  }
}
