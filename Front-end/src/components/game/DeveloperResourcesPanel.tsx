"use client";

import { Minus, Plus, Sparkles, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameState, PlayerId } from "@backend/game/types";
import type { DeveloperResourceUpdate } from "@backend/shared/multiplayer";

const MAX_MANA = 10;
const MAX_SPELL_MANA = 3;

interface ResourceDraft {
  mana: number;
  spellMana: number;
}

interface Props {
  gameState: GameState;
  onApply: (updates: DeveloperResourceUpdate[]) => void;
}

function createDraft(gameState: GameState): Record<PlayerId, ResourceDraft> {
  return {
    P1: {
      mana: gameState.players.P1.mana,
      spellMana: gameState.players.P1.spellMana
    },
    P2: {
      mana: gameState.players.P2.mana,
      spellMana: gameState.players.P2.spellMana
    }
  };
}

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, Math.round(value)));
}

export function DeveloperResourcesPanel({ gameState, onApply }: Props) {
  const [draft, setDraft] = useState(() => createDraft(gameState));

  useEffect(() => {
    setDraft(createDraft(gameState));
  }, [gameState.players.P1.mana, gameState.players.P1.spellMana, gameState.players.P2.mana, gameState.players.P2.spellMana]);

  function adjust(playerId: PlayerId, field: keyof ResourceDraft, delta: number) {
    const max = field === "mana" ? MAX_MANA : MAX_SPELL_MANA;
    setDraft((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: clamp(current[playerId][field] + delta, max)
      }
    }));
  }

  function setValue(playerId: PlayerId, field: keyof ResourceDraft, value: string) {
    const max = field === "mana" ? MAX_MANA : MAX_SPELL_MANA;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return;
    }
    setDraft((current) => ({
      ...current,
      [playerId]: {
        ...current[playerId],
        [field]: clamp(parsed, max)
      }
    }));
  }

  function applyResources() {
    onApply([
      { playerId: "P1", ...draft.P1 },
      { playerId: "P2", ...draft.P2 }
    ]);
  }

  return (
    <section className="developer-resources" aria-label="Developer resources">
      <header className="developer-resources__header">
        <span>Resources</span>
        <Sparkles size={15} aria-hidden="true" />
      </header>
      <div className="developer-resources__players">
        {(["P1", "P2"] as const).map((playerId) => (
          <section className="developer-resources__player" key={playerId} aria-label={`${playerId} resources`}>
            <strong>{playerId}</strong>
            <ResourceControl
              icon={<Zap size={14} aria-hidden="true" />}
              label="Mana"
              value={draft[playerId].mana}
              max={MAX_MANA}
              onChange={(value) => setValue(playerId, "mana", value)}
              onAdjust={(delta) => adjust(playerId, "mana", delta)}
            />
            <ResourceControl
              icon={<Sparkles size={14} aria-hidden="true" />}
              label="Spell mana"
              value={draft[playerId].spellMana}
              max={MAX_SPELL_MANA}
              onChange={(value) => setValue(playerId, "spellMana", value)}
              onAdjust={(delta) => adjust(playerId, "spellMana", delta)}
            />
          </section>
        ))}
      </div>
      <button type="button" className="developer-resources__apply" onClick={applyResources}>
        Apply resources
      </button>
    </section>
  );
}

interface ResourceControlProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  max: number;
  onChange: (value: string) => void;
  onAdjust: (delta: number) => void;
}

function ResourceControl({ icon, label, value, max, onChange, onAdjust }: ResourceControlProps) {
  return (
    <label className="developer-resources__control">
      <span className="developer-resources__label">{icon}{label}</span>
      <span className="developer-resources__stepper">
        <button type="button" onClick={() => onAdjust(-1)} aria-label={`Decrease ${label}`}>
          <Minus size={13} aria-hidden="true" />
        </button>
        <input
          type="number"
          min={0}
          max={max}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <button type="button" onClick={() => onAdjust(1)} aria-label={`Increase ${label}`}>
          <Plus size={13} aria-hidden="true" />
        </button>
      </span>
    </label>
  );
}
