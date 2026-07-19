import React from "react";
import clsx from "clsx";
import { Heart, Shield, Sparkles, Swords, Zap } from "lucide-react";
import type { PlayerId, PlayerState } from "@backend/game/types";

const MAX_MANA_PIPS = 10;
const MAX_SPELL_MANA = 3;

export interface NexusPanelProps {
  playerId: PlayerId;
  player: PlayerState;
  label: string;
  playerName: string;
  playerAvatar?: string;
  playerElo?: number;
  bottomAligned?: boolean;
  isAttacker: boolean;
  hasPriority: boolean;
  attackTokenAvailable: boolean;
  resourcePreview: { manaUsed: number; spellManaUsed: number };
}

/** Production nexus data rendered with the v2 status-card presentation. */
export const NexusPanel: React.FC<NexusPanelProps> = ({
  playerId,
  player,
  label,
  playerName,
  playerAvatar,
  playerElo,
  bottomAligned = false,
  isAttacker,
  hasPriority,
  attackTokenAvailable,
  resourcePreview
}) => {
  const RoleIcon = isAttacker ? Swords : Shield;
  const roleLabel = isAttacker ? (attackTokenAvailable ? "Attack" : "Spent") : "Defense";
  const accessibleMana = `${playerName} mana ${player.mana}/${player.maxMana}, spell mana ${player.spellMana}/${MAX_SPELL_MANA}`;
  const initial = playerName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <section
      className={clsx("nexus-panel-v2 flex w-[104px] flex-col items-stretch gap-2", bottomAligned && "nexus-panel-v2--bottom")}
      data-effect-target-id={`nexus-${playerId}`}
      aria-label={`${label} status`}
    >
      <div className="nexus-panel-v2__identity flex min-w-0 items-center justify-center gap-2 px-1">
        <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-primary/50 bg-card text-[10px] font-bold text-primary">
          {initial}
          {playerAvatar ? (
            <img
              src={playerAvatar}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => event.currentTarget.remove()}
            />
          ) : null}
        </span>
        <span className="min-w-0 leading-tight">
          <strong className="block truncate text-[10px] font-bold text-foreground" title={playerName}>{playerName}</strong>
          {playerElo !== undefined ? <small className="block text-[9px] text-muted-foreground">{playerElo.toLocaleString()} ELO</small> : null}
        </span>
      </div>
      <div
        className={clsx(
          "nexus-panel-v2__core rounded-lg border bg-card/70 px-3 py-2 text-center backdrop-blur-sm transition-all",
          hasPriority
            ? "border-primary/70 shadow-[0_0_16px_oklch(0.62_0.19_300/0.4)]"
            : "border-border"
        )}
      >
        <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </div>
        <div className="flex items-center justify-center gap-1 font-serif text-3xl font-bold text-foreground">
          <Heart size={14} className="text-hp" aria-hidden="true" />
          {player.nexusHp}
        </div>
        <div
          className={clsx(
            "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            isAttacker ? "bg-attack/15 text-attack" : "bg-mana/15 text-mana"
          )}
        >
          <RoleIcon size={11} aria-hidden="true" />
          {roleLabel}
        </div>
      </div>

      <div
        className={clsx(
          "nexus-panel-v2__resources flex flex-col items-center gap-2 rounded-lg border bg-card/60 px-3 py-3 backdrop-blur-sm transition-colors",
          hasPriority ? "border-primary/50" : "border-border"
        )}
        aria-label={accessibleMana}
        title={accessibleMana}
      >
        <span
          className={clsx(
            "h-3 w-3 rounded-full transition-all",
            hasPriority ? "bg-hp shadow-[0_0_10px_var(--hp)]" : "bg-muted-foreground/40"
          )}
          title={hasPriority ? "Has priority" : "Waiting"}
        />

        <div className="grid grid-cols-2 gap-1" aria-hidden="true">
          {Array.from({ length: MAX_MANA_PIPS }, (_, index) => {
            const pipNumber = index + 1;
            const isAvailable = pipNumber <= player.mana;
            const isUnlocked = pipNumber <= player.maxMana;
            const isPreviewed =
              isAvailable && pipNumber > player.mana - resourcePreview.manaUsed;

            return (
              <span
                className={clsx(
                  "h-2.5 w-2.5 rounded-full border transition-colors",
                  isAvailable
                    ? "border-mana bg-mana shadow-[0_0_6px_var(--mana)]"
                    : isUnlocked
                      ? "border-mana/25 bg-mana/5"
                      : "border-border/40 bg-muted/30",
                  isPreviewed && "border-primary bg-primary/30 shadow-[0_0_8px_var(--primary)]"
                )}
                key={`mana-${pipNumber}`}
              />
            );
          })}
        </div>

        <div className="flex w-full items-center justify-between gap-2 border-t border-border/60 pt-2 text-[10px] font-mono">
          <span className="flex items-center gap-0.5 text-mana">
            <Zap size={10} aria-hidden="true" />
            {player.mana}
          </span>
          <span className="flex items-center gap-0.5 text-primary">
            <Sparkles size={10} aria-hidden="true" />
            {Array.from({ length: MAX_SPELL_MANA }, (_, index) => {
              const isAvailable = index < player.spellMana;
              const isPreviewed =
                isAvailable && index >= player.spellMana - resourcePreview.spellManaUsed;
              return (
                <i
                  className={clsx(
                    "h-2 w-1 rounded-sm border transition-colors",
                    isAvailable ? "border-primary bg-primary" : "border-primary/30 bg-primary/10",
                    isPreviewed && "border-destructive bg-destructive"
                  )}
                  key={`spell-${index}`}
                />
              );
            })}
          </span>
        </div>
      </div>
    </section>
  );
};
