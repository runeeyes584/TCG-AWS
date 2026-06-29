"use client";

import { useMemo, useState } from "react";
import { createCardInstance } from "../game/cards";
import { applyAction, createInitialGameState } from "../game/engine";
import { sampleDeckCards } from "../game/sampleCards";
import { GameAction, GameState, GameValidationError, PlayerId, VisualEvent } from "../game/types";

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
      
      // We want to add them in order. The addLog function prepends to the array, 
      // so to keep them chronologically appearing top-to-bottom, we add the action label, then the triggers.
      // Wait, addLog uses `[{...}, ...current]`. 
      // So the most recent event is at the top.
      
      // Let's add the action log first, then the visual events in order.
      // Actually, if we reverse the array and add them, the last event will be at the top.
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
    resetGame
  };
}

function buildDeck(playerId: PlayerId) {
  return Array.from({ length: 24 }, (_, index) => {
    const definition = sampleDeckCards[index % sampleDeckCards.length];
    return createCardInstance(
      definition,
      playerId,
      `${playerId}-${definition.id}-${index}`
    );
  });
}

function describeAction(action: GameAction): string {
  switch (action.type) {
    case "START_GAME":
      return `Started game with ${action.firstPlayerId ?? "P1"} attacking first.`;
    case "DRAW_CARD":
      return `${action.playerId} drew ${action.count ?? 1} card(s).`;
    case "START_ROUND":
      return "Started a new round.";
    case "PLAY_UNIT":
      return `${action.playerId} played a unit.`;
    case "PLAY_SPELL":
      return `${action.playerId} played a spell.`;
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
  }
}

function describeVisualEvent(event: VisualEvent): string | undefined {
  switch (event.type) {
    case "TRIGGER_ACTIVATED":
      return `Trigger activated: ${event.effectName}`;
    case "DAMAGE":
      return `${event.targetId} took ${event.amount} damage.`;
    case "HEAL":
      return `${event.targetId} healed ${event.amount}.`;
    case "DRAW":
      return `${event.playerId} drew ${event.count} card(s).`;
    case "BUFF":
      return `${event.targetId} gained ${event.attackDelta > 0 ? '+' : ''}${event.attackDelta}/${event.healthDelta > 0 ? '+' : ''}${event.healthDelta}.`;
  }
}
