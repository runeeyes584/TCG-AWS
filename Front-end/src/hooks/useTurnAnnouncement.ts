import { useEffect, useRef } from "react";
import { useGlobalAudio } from "../contexts/AudioContext";
import { arenaEventBus } from "../libs/arenaEventBus";
import { nextAnnouncement, type AnnouncementState } from "../components/game/hud/infoBoard/turnAnnouncement";
import type { TurnRailModel } from "../components/game/hud/infoBoard/turnRail";

/**
 * Tells the arena who acts now (`TURN_OWNER`, which the rift glows for all turn long) and when the
 * turn changes hands (`TURN_BANNER`), and rings the turn sound with the full banner. What to show
 * for a change (the full banner, or only a flash for turns in quick succession) is
 * `nextAnnouncement`'s call.
 */
export function useTurnAnnouncement(rail: Pick<TurnRailModel, "turn" | "owner" | "started">, over: boolean) {
  const { playSfx } = useGlobalAudio();
  const stateRef = useRef<AnnouncementState | undefined>(undefined);
  const { turn, owner, started } = rail;

  useEffect(() => {
    arenaEventBus.emit("TURN_OWNER", started && !over ? owner : undefined);
    const { mode, state } = nextAnnouncement(stateRef.current, { turn, owner, started, over }, Date.now());
    stateRef.current = state;
    if (!mode) return;
    arenaEventBus.emit("TURN_BANNER", { owner, mode });
    if (mode === "full") playSfx(owner === "you" ? "turn_you" : "turn_enemy");
  }, [turn, owner, started, over, playSfx]);
}
