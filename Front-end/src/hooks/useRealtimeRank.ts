"use client";

import { useEffect, useState } from "react";
import { getMyRank } from "../libs/api";
import { socketManager } from "../libs/socket";

export function useRealtimeRank(enabled: boolean) {
  const [rank, setRank] = useState<number>();

  useEffect(() => {
    if (!enabled) {
      setRank(undefined);
      return;
    }

    let cancelled = false;
    let socket: ReturnType<typeof socketManager.connect> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    const refresh = async () => {
      try {
        const { player } = await getMyRank();
        if (!cancelled) setRank(player?.rank);
      } catch {
        // The lobby keeps its last known value if a background refresh fails.
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => void refresh(), 350);
    };

    void refresh().finally(() => {
      if (cancelled) return;
      const token = window.localStorage.getItem("accessToken");
      if (!token) return;

      try {
        socket = socketManager.connect(
          token,
          window.localStorage.getItem("email") || "Player"
        );
        socket.on("rank:changed", scheduleRefresh);
        socket.on("profile:updated", scheduleRefresh);
      } catch {
        // Initial HTTP data still works when realtime is not configured.
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimer) clearTimeout(refreshTimer);
      socket?.off("rank:changed", scheduleRefresh);
      socket?.off("profile:updated", scheduleRefresh);
    };
  }, [enabled]);

  return rank;
}
