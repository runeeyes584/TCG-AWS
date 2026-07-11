"use client";

import { useEffect, useMemo, useRef } from "react";
import { getCardDefinition } from "@backend/game/cardRegistry";
import type { GameState, PlayerId } from "@backend/game/types";

type MusicStage = "begin" | "keycard" | "climax";

const TRACKS: Record<MusicStage, string> = {
  begin: "/audio/begin-duel.mp3",
  keycard: "/audio/keycard-duel.mp3",
  climax: "/audio/climax-duel.mp3"
};

export function useBattleMusic(gameState: GameState) {
  const audioByStage = useMemo(() => {
    if (typeof Audio === "undefined") {
      return undefined;
    }

    const entries = Object.entries(TRACKS).map(([stage, src]) => {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = stage === "climax" ? 0.62 : 0.48;
      return [stage, audio] as const;
    });

    return Object.fromEntries(entries) as Record<MusicStage, HTMLAudioElement>;
  }, []);

  const activeStageRef = useRef<MusicStage | undefined>(undefined);
  const keycardUnlockedRef = useRef(false);
  const previousChampionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!audioByStage) {
      return;
    }

    return () => {
      stopAll(audioByStage);
    };
  }, [audioByStage]);

  useEffect(() => {
    if (!audioByStage) {
      return;
    }

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
      stopAll(audioByStage);
      return;
    }

    if (championWasSummoned || championLeveled) {
      keycardUnlockedRef.current = true;
    }

    const nextStage = getNextStage(gameState, keycardUnlockedRef.current);
    switchTrack(audioByStage, activeStageRef.current, nextStage);
    activeStageRef.current = nextStage;
    previousChampionIdsRef.current = championIds;
  }, [audioByStage, gameState]);
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

function switchTrack(
  audioByStage: Record<MusicStage, HTMLAudioElement>,
  currentStage: MusicStage | undefined,
  nextStage: MusicStage
) {
  if (currentStage === nextStage && !audioByStage[nextStage].paused) {
    return;
  }

  if (currentStage) {
    pauseAndRewind(audioByStage[currentStage]);
  }

  const nextAudio = audioByStage[nextStage];
  nextAudio.currentTime = 0;
  void nextAudio.play().catch(() => {
    // Browsers can block autoplay until the first user gesture. The next
    // game action will re-run this hook and retry playback.
  });
}

function stopAll(audioByStage: Record<MusicStage, HTMLAudioElement>) {
  for (const audio of Object.values(audioByStage)) {
    pauseAndRewind(audio);
  }
}

function pauseAndRewind(audio: HTMLAudioElement) {
  audio.pause();
  audio.currentTime = 0;
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
