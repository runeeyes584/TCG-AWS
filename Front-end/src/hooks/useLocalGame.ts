"use client";

import { useMemo, useState } from "react";
import { buildDefaultDeck } from "@backend/game/entities/defaultDeck";
import { applyAction, createInitialGameState } from "@backend/game/core/engine";
import {
  GameAction,
  GameState,
  GameValidationError,
  VisualEvent
} from "@backend/game/types";

export interface LogEntry {
  id: number;
  message: string;
}

export function useLocalGame() {
  const initialState = useMemo(
    () => createInitialGameState(buildDeck("P1"), buildDeck("P2"), Date.now()),
    []
  );
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [actionLog, setActionLog] = useState<LogEntry[]>([
    { id: 1, message: "Local battle loaded." }
  ]);

  function dispatch(action: GameAction, label = describeAction(action)): boolean {
    try {
      const nextState = applyAction(gameState, action);
      setGameState(nextState);
      
      const newLogs = nextState.visualEvents.map(describeVisualEvent).filter((s): s is string => Boolean(s));
      const allMessages = [label, ...newLogs].reverse();
      allMessages.forEach(msg => {
         if (msg) setActionLog(current => [{ id: Date.now() + Math.random(), message: msg }, ...current]);
      });
      
      return true;
    } catch (error) {
      addLog(error instanceof GameValidationError ? error.message : "Action failed.");
      return false;
    }
  }

  /** Chain multiple actions: each acts on the result of the previous one. */
  function dispatchChain(actions: Array<{ action: GameAction; label?: string }>): boolean {
    let state = gameState;
    const allMessages: string[] = [];
    for (const { action, label } of actions) {
      try {
        state = applyAction(state, action);
        const msg = label ?? describeAction(action);
        if (msg) allMessages.push(msg);
        const newLogs = state.visualEvents.map(describeVisualEvent).filter((s): s is string => Boolean(s));
        allMessages.push(...newLogs);
      } catch (error) {
        addLog(error instanceof GameValidationError ? error.message : "Action failed.");
        return false;
      }
    }
    setGameState(state);
    [...allMessages].reverse().forEach(msg => {
      if (msg) setActionLog(current => [{ id: Date.now() + Math.random(), message: msg }, ...current]);
    });
    return true;
  }

  function resetGame() {
    setGameState(createInitialGameState(buildDeck("P1"), buildDeck("P2"), Date.now()));
    setActionLog([{ id: Date.now(), message: "New local battle created." }]);
  }

  function addLog(message: string) {
    setActionLog((current) => [{ id: Date.now() + Math.random(), message }, ...current]);
  }

  return {
    gameState,
    actionLog,
    dispatch,
    dispatchChain,
    resetGame
  };
}

const buildDeck = buildDefaultDeck;

function describeAction(action: GameAction): string {
  switch (action.type) {
    case "START_GAME":
      return `Started game with ${action.firstPlayerId ?? "P1"} attacking first.`;
    case "DRAW_CARD":
      return `${action.playerId} drew ${action.count ?? 1} card(s).`;
    case "DISCARD_CARD":
      return `${action.playerId} discarded a card.`;
    case "START_ROUND":
      return "Started a new round.";
    case "PLAY_UNIT":
      return `${action.playerId} played a unit.`;
    case "PLAY_SPELL":
      return `${action.playerId} played a spell.`;
    case "SUBMIT_ABILITY_TARGETS":
      return `${action.playerId} submitted ability targets.`;
    case "CANCEL_PENDING_CHOICE":
      return `${action.playerId} cancelled an ability choice.`;
    case "DECLARE_ATTACKER":
      return `${action.playerId} declared an attacker.`;
    case "REMOVE_ATTACKER":
      return `${action.playerId} removed an attacker.`;
    case "COMMIT_ATTACK":
      return `${action.playerId} committed attackers.`;
    case "DECLARE_BLOCKER":
      return `${action.playerId} declared a blocker.`;
    case "REMOVE_BLOCKER":
      return `${action.playerId} removed a blocker.`;
    case "COMMIT_BLOCKS":
      return `${action.playerId} committed blocks.`;
    case "RESOLVE_COMBAT":
      return "Resolved combat.";
    case "END_TURN":
      return `${action.playerId} passed priority.`;
    case "TIME_OUT":
      return `${action.playerId} timed out.`;
    case "SURRENDER":
      return `${action.playerId} surrendered.`;
  }
}

function describeVisualEvent(event: VisualEvent): string | undefined {
  switch (event.type) {
    case "TRIGGER_ACTIVATED":
      return `Trigger activated: ${event.effectName}`;
    case "HAND_LIMIT_DISCARD_REQUIRED":
      return `${event.playerId} must discard from ${event.handSize} to ${event.downTo} cards.`;
    case "AFK_WARNING":
      return `${event.playerId} timed out (${event.afkCount}/3).`;
    case "DAMAGE":
      return `${event.targetId} took ${event.amount} damage.`;
    case "HEAL":
      return `${event.targetId} healed ${event.amount}.`;
    case "DRAW":
      return `${event.playerId} drew ${event.count} card(s).`;
    case "BUFF":
      return `${event.targetId} gained ${event.attackDelta > 0 ? '+' : ''}${event.attackDelta}/${event.healthDelta > 0 ? '+' : ''}${event.healthDelta}.`;
    case "CHAMPION_LEVELED_UP":
      return `${event.playerId}'s champion leveled up to level ${event.newLevel}!`;
    case "SUMMON":
      return `${event.playerId} revived a unit.`;
  }
}
