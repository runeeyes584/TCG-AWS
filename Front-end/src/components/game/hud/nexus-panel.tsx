// src/components/game/hud/nexus-panel.tsx
import React from "react";
import { Shield, Swords } from "lucide-react";
import type { PlayerId, PlayerState } from "@backend/game/types";

export interface NexusPanelProps {
  playerId: PlayerId;
  player: PlayerState;
  label: string;
  isAttacker: boolean;
  hasPriority: boolean;
  attackTokenAvailable: boolean;
  resourcePreview: { manaUsed: number; spellManaUsed: number };
}

export const NexusPanel: React.FC<NexusPanelProps> = ({
  playerId,
  player,
  label,
  isAttacker,
  hasPriority,
  attackTokenAvailable,
  resourcePreview
}) => {
  const RoleIcon = isAttacker ? Swords : Shield;
  const roleLabel = isAttacker
    ? attackTokenAvailable
      ? "Attack"
      : "Spent"
    : "Defense";

  return (
    <div className="player-resource-panel">
      <div
        className={`nexus-orb ${hasPriority ? "is-priority" : ""} ${
          isAttacker ? "is-attacker" : "is-defender"
        }`}
      >
        <span>{label}</span>
        <strong>{player.nexusHp}</strong>
        <small className={`combat-role ${isAttacker ? "is-attacker" : "is-defender"}`}>
          <RoleIcon size={11} aria-hidden="true" />
          {roleLabel}
        </small>
      </div>
      <div
        className="mana-rack"
        aria-label={`${playerId} mana ${player.mana}/${player.maxMana}, spell mana ${player.spellMana}/3`}
        title={`${player.mana}/${player.maxMana} mana · ${player.spellMana}/3 spell mana`}
      >
        <div className="mana-pips" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, index) => {
            const pipNumber = index + 1;
            const pipState =
              pipNumber <= player.mana
                ? "is-filled"
                : pipNumber <= player.maxMana
                ? "is-empty"
                : "is-locked";
            const isPreviewed =
              pipNumber <= player.mana &&
              pipNumber > player.mana - resourcePreview.manaUsed;

            return (
              <span
                key={`mana-${pipNumber}`}
                className={`mana-pip ${pipState} ${isPreviewed ? "is-previewed" : ""}`}
              />
            );
          })}
        </div>
        <div className="spell-mana-bars" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, index) => {
            const isFilled = index < player.spellMana;
            const isPreviewed =
              isFilled &&
              index >= player.spellMana - resourcePreview.spellManaUsed;

            return (
              <span
                key={`spell-${index}`}
                className={`spell-mana-bar ${isFilled ? "is-filled" : "is-empty"} ${
                  isPreviewed ? "is-previewed" : ""
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
