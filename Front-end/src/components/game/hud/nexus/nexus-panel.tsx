import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { PlayerId, PlayerState, UnitInstance } from "@backend/game/types";
import { arenaEventBus, type ScreenRect } from "../../../../libs/arenaEventBus";
import { ReserveStrip } from "./reserve-strip";
import {
  MAX_MANA,
  MAX_SPELL_MANA,
  carryOver,
  hpDelta,
  manaCount,
  manaGemStates,
  spellCount,
  spellShardStates,
  type Resources
} from "./nexusPanel";

export interface NexusPanelProps {
  playerId: PlayerId;
  player: PlayerState;
  label: string;
  playerName: string;
  playerAvatar?: string;
  playerElo?: number;
  /** The local player's side (bottom of the column) is tinted violet, the opponent's blood-red. */
  side: "viewer" | "opponent";
  /** Round counter: left-over mana turns into spell mana when it changes. */
  round: number;
  isAttacker: boolean;
  hasPriority: boolean;
  attackTokenAvailable: boolean;
  resourcePreview: { manaUsed: number; spellManaUsed: number };
  /** The units in this player's waiting row, listed under the resources (shown for the opponent). */
  reserve?: UnitInstance[];
}

const useBrowserLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const FLIGHT_MS = 520;
const STAGGER_MS = 160;
const FRESH_MS = 900;
const HP_FLASH_MS = 1400;

const reducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

const rectOf = (element: Element | undefined): ScreenRect | undefined => {
  if (!element) return undefined;
  const box = element.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
};

/** The HP as shown: it counts towards the real value, and the change is flashed beside it. */
function useHpDisplay(hp: number) {
  const [shown, setShown] = useState(hp);
  const [flash, setFlash] = useState<{ delta: number; key: number } | undefined>();
  const previousRef = useRef<number>(hp);

  useEffect(() => {
    const delta = hpDelta(previousRef.current, hp);
    previousRef.current = hp;
    if (delta === 0) return;

    setFlash({ delta, key: Date.now() });
    const flashTimer = window.setTimeout(() => setFlash(undefined), HP_FLASH_MS);
    const step = Math.max(1, Math.ceil(Math.abs(delta) / 8));
    const counter = window.setInterval(() => {
      setShown((current) => {
        const next = current + Math.sign(hp - current) * Math.min(step, Math.abs(hp - current));
        if (next === hp) window.clearInterval(counter);
        return next;
      });
    }, 45);
    return () => {
      window.clearTimeout(flashTimer);
      window.clearInterval(counter);
      setShown(hp);
    };
  }, [hp]);

  return { shown, flash };
}

/**
 * The mana and spell mana as shown. The engine adds the left-over mana to the spell mana and
 * refills the mana the moment a round starts, so the old values are held for the length of the
 * flight (`NEXUS_CARRY`, drawn by Phaser from gem to shard) and then released, lighting the new shards.
 */
function useResourceDisplay(
  round: number,
  resources: Resources,
  side: "viewer" | "opponent",
  gemsRef: React.RefObject<HTMLDivElement | null>,
  shardsRef: React.RefObject<HTMLDivElement | null>
) {
  const [hold, setHold] = useState<{ resources: Resources; leaving: number[] } | undefined>();
  const [fresh, setFresh] = useState<number[]>([]);
  const previousRef = useRef<{ round: number } & Resources>({ round, ...resources });
  const timersRef = useRef<number[]>([]);
  const { mana, maxMana, spellMana } = resources;

  useBrowserLayoutEffect(() => {
    const previous = previousRef.current;
    previousRef.current = { round, mana, maxMana, spellMana };
    const carried = carryOver(previous, { spellMana }, round > previous.round);
    if (!carried) return;

    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    const stores = carried.from.length;
    const animate = !reducedMotion();

    if (animate) {
      const gems = Array.from(gemsRef.current?.children ?? []);
      const shards = Array.from(shardsRef.current?.children ?? []);
      const steps: Array<
        { kind: "store"; from: ScreenRect; to: ScreenRect } | { kind: "dissolve"; from: ScreenRect }
      > = [];
      carried.from.forEach((gemIndex, i) => {
        const from = rectOf(gems[gemIndex]);
        const to = rectOf(shards[carried.to[i]]);
        if (from && to) steps.push({ kind: "store", from, to });
      });
      const dust = carried.dissolve !== undefined ? rectOf(gems[carried.dissolve]) : undefined;
      if (dust) steps.push({ kind: "dissolve", from: dust });

      if (steps.length > 0) {
        setHold({
          resources: previous,
          leaving: [...carried.from, ...(carried.dissolve !== undefined ? [carried.dissolve] : [])]
        });
        arenaEventBus.emit("NEXUS_CARRY", { tone: side, steps });
        const flightMs = FLIGHT_MS + STAGGER_MS * Math.max(0, stores - 1);
        timersRef.current.push(
          window.setTimeout(() => {
            setHold(undefined);
            setFresh(carried.to);
            timersRef.current.push(window.setTimeout(() => setFresh([]), FRESH_MS));
          }, flightMs)
        );
        return;
      }
    }

    setFresh(carried.to);
    timersRef.current.push(window.setTimeout(() => setFresh([]), FRESH_MS));
  }, [round, mana, maxMana, spellMana, side, gemsRef, shardsRef]);

  useEffect(() => () => timersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  return { display: hold?.resources ?? resources, leaving: hold?.leaving ?? [], fresh, holding: Boolean(hold) };
}

/**
 * A player's identity and resources, set straight on the board (no box): who they are, the Nexus
 * HP as one large number, the mana (ten gems) and the spell mana (three shards). Both sides use
 * the same layout so the eye learns it once; only the tint differs. The Nexus HP is also in the
 * accessible label.
 */
export const NexusPanel: React.FC<NexusPanelProps> = ({
  player,
  label,
  playerName,
  playerAvatar,
  playerElo,
  side,
  round,
  isAttacker,
  hasPriority,
  attackTokenAvailable,
  resourcePreview,
  reserve
}) => {
  const gemsRef = useRef<HTMLDivElement>(null);
  const shardsRef = useRef<HTMLDivElement>(null);
  const hp = useHpDisplay(player.nexusHp);
  const { display, leaving, fresh, holding } = useResourceDisplay(
    round,
    { mana: player.mana, maxMana: player.maxMana, spellMana: player.spellMana },
    side,
    gemsRef,
    shardsRef
  );

  const gems = manaGemStates(display, holding ? 0 : resourcePreview.manaUsed);
  const shards = spellShardStates(display.spellMana, holding ? 0 : resourcePreview.spellManaUsed);
  const initial = playerName.trim().slice(0, 1).toUpperCase() || "?";
  const token = isAttacker ? (attackTokenAvailable ? "ready" : "spent") : "defense";
  const tokenText = token === "ready" ? "Ready" : token === "spent" ? "Spent" : "Def";
  const accessible = `${playerName}: ${label} ${player.nexusHp} HP, mana ${player.mana}/${MAX_MANA}, spell mana ${player.spellMana}/${MAX_SPELL_MANA}`;

  return (
    <section
      className={clsx("nx-hud", `nx-hud--${side}`, hasPriority && "nx-hud--priority")}
      aria-label={accessible}
    >
      <header className="nx-id">
        <span className="nx-avatar" aria-hidden="true">
          {initial}
          {playerAvatar ? (
            <img src={playerAvatar} alt="" onError={(event) => event.currentTarget.remove()} />
          ) : null}
        </span>
        <span className="nx-who">
          <strong className="nx-name" title={playerName}>{playerName}</strong>
          {playerElo !== undefined ? <small className="nx-elo">{playerElo.toLocaleString()} ELO</small> : null}
          <i className="nx-sweep" aria-hidden="true" />
        </span>
        <span className={clsx("nx-token", `nx-token--${token}`)} aria-hidden="true">
          <i />
          <b>{tokenText}</b>
        </span>
      </header>

      <div className={clsx("nx-hp", hp.flash && hp.flash.delta < 0 && "nx-hp--hit")}>
        <span className="nx-label">{label}</span>
        <div className="nx-hp__line">
          <strong className="nx-hp__num">{hp.shown}</strong>
          {hp.flash ? (
            <em
              className={clsx("nx-hp__delta", hp.flash.delta > 0 && "nx-hp__delta--heal")}
              key={hp.flash.key}
            >
              {hp.flash.delta > 0 ? "+" : "−"}
              {Math.abs(hp.flash.delta)}
            </em>
          ) : null}
        </div>
      </div>

      <div className="nx-row" aria-hidden="true">
        <span className="nx-label">Mana</span>
        <div className="nx-gems" ref={gemsRef}>
          {gems.map((state, index) => (
            <i
              className={clsx("nx-gem", `nx-gem--${state}`, leaving.includes(index) && "nx-gem--leaving")}
              key={index}
            />
          ))}
        </div>
        <span className="nx-count">{manaCount(display.mana)}</span>
      </div>

      <div className="nx-row" aria-hidden="true">
        <span className="nx-label">Spell</span>
        <div className="nx-shards" ref={shardsRef}>
          {shards.map((state, index) => (
            <i
              className={clsx("nx-shard", `nx-shard--${state}`, fresh.includes(index) && "nx-shard--fresh")}
              key={index}
            />
          ))}
        </div>
        <span className="nx-count">{spellCount(display.spellMana)}</span>
      </div>
      {reserve ? <ReserveStrip units={reserve} /> : null}
    </section>
  );
};

