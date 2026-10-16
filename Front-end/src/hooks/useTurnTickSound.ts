import { useEffect, useRef } from "react";
import { useGlobalAudio } from "../contexts/AudioContext";
import type { TurnUrgency } from "../components/game/hud/infoBoard/turnRail";

/**
 * Ticks once per second while `active` and the clock is in its warning or critical stretch:
 * a soft tick for the last ten seconds, a sharper one for the last five.
 */
export function useTurnTickSound(active: boolean, urgency: TurnUrgency, seconds: number) {
  const { playSfx } = useGlobalAudio();
  const lastTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active || urgency === "calm") {
      lastTickRef.current = null;
      return;
    }
    if (lastTickRef.current === seconds) return;
    lastTickRef.current = seconds;
    playSfx(urgency === "critical" ? "tick_urgent" : "tick");
  }, [active, urgency, seconds, playSfx]);
}
