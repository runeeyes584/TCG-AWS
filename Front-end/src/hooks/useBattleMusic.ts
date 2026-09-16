"use client";

import { useEffect, useRef } from "react";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import type { GameState, PlayerId } from "@backend/game/types";
import { audioManager } from "../libs/audioManager";


type MusicStage = "begin" | "keycard" | "climax";

const TRACKS: Record<MusicStage, string> = {
  begin: "/audio/begin-duel.mp3",
  keycard: "/audio/keycard-duel.mp3",
  climax: "/audio/climax-duel.mp3"
};

export function useBattleMusic(gameState: GameState) {
  const activeStageRef = useRef<MusicStage | undefined>(undefined);
  const keycardUnlockedRef = useRef(false);
  const previousChampionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const championIds = collectChampionInstanceIds(gameState);
    const championWasSummoned = [...championIds].some(
      (instanceId) => !previousChampionIdsRef.current.has(instanceId)
    );
    const championLeveled = gameState.visualEvents.some(
      (event) => event.type === "CHAMPION_LEVELED_UP"
    );

    if (!gameState.started || gameState.winnerId) {
      keycardUnlockedRef.current = false;
      previousChampionIdsRef.current = championIds;
      activeStageRef.current = undefined;
      audioManager.stopBgm();
      return;
    }

    if (championWasSummoned || championLeveled) {
      keycardUnlockedRef.current = true;
    }

    const nextStage = getNextStage(gameState, keycardUnlockedRef.current);
    if (activeStageRef.current !== nextStage) {
      activeStageRef.current = nextStage;
      audioManager.playBgm(TRACKS[nextStage]);
    }
    previousChampionIdsRef.current = championIds;
  }, [gameState]);

  useEffect(() => {
    return () => {
      audioManager.stopBgm();
    };
  }, []);
}

function getNextStage(gameState: GameState, keycardUnlocked: boolean): MusicStage {
  const isClimax = Object.values(gameState.players).some(
    (player) => player.nexusHp > 0 && player.nexusHp < 5
  );
  if (isClimax) {
    return "climax";
  }

  return keycardUnlocked ? "keycard" : "begin";
}

function collectChampionInstanceIds(gameState: GameState): Set<string> {
  const ids = new Set<string>();
  for (const playerId of Object.keys(gameState.players) as PlayerId[]) {
    for (const unit of gameState.players[playerId].board) {
      const definition = getCardDefinition(unit.cardId);
      if (definition.type === "champion") {
        ids.add(unit.instanceId);
      }
    }
  }
  return ids;
}
