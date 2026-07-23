"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureFreshAccessToken,
  getLeaderboard,
  type LeaderboardPlayer
} from "../libs/api";
import { socketManager } from "../libs/socket";

const PAGE_SIZE = 50;

interface Options {
  enabled: boolean;
  onCurrentPlayerChange?: (player: LeaderboardPlayer | null) => void;
}

export function useLeaderboard({ enabled, onCurrentPlayerChange }: Options) {
  const [entries, setEntries] = useState<LeaderboardPlayer[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<LeaderboardPlayer | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const requestSequence = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (nextCursor?: string, append = false) => {
    if (!enabled) return;
    const sequence = ++requestSequence.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError(undefined);

    try {
      const response = await getLeaderboard(PAGE_SIZE, nextCursor);
      if (!mounted.current || sequence !== requestSequence.current) return;

      setEntries((previous) => {
        if (!append) return response.entries;
        const players = new Map(previous.map((player) => [player.userId, player]));
        response.entries.forEach((player) => players.set(player.userId, player));
        return Array.from(players.values());
      });
      setCurrentPlayer(response.currentPlayer);
      onCurrentPlayerChange?.(response.currentPlayer);
      setCursor(response.nextCursor);
    } catch (requestError) {
      if (!mounted.current || sequence !== requestSequence.current) return;
      setError(requestError instanceof Error ? requestError.message : "Unable to load leaderboard.");
    } finally {
      if (mounted.current && sequence === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [enabled, onCurrentPlayerChange]);

  useEffect(() => {
    if (enabled) {
      void load();
      return;
    }

    requestSequence.current += 1;
    setLoading(false);
    setLoadingMore(false);
    setEntries([]);
    setCurrentPlayer(null);
    setCursor(null);
    setError(undefined);
    onCurrentPlayerChange?.(null);
  }, [enabled, load, onCurrentPlayerChange]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let socket: ReturnType<typeof socketManager.connect> | undefined;

    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void load(), 350);
    };

    void ensureFreshAccessToken()
      .then((token) => {
        if (cancelled) return;
        socket = socketManager.connect(
          token,
          window.localStorage.getItem("email") || "Player"
        );
        socket.on("rank:changed", refresh);
        socket.on("profile:updated", refresh);
      })
      .catch(() => {
        // HTTP errors are surfaced by load(); realtime is an optional enhancement.
      });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      socket?.off("rank:changed", refresh);
      socket?.off("profile:updated", refresh);
    };
  }, [enabled, load]);

  return {
    entries,
    currentPlayer,
    cursor,
    loading,
    loadingMore,
    error,
    refresh: () => load(),
    loadMore: () => cursor ? load(cursor, true) : Promise.resolve()
  };
}
