"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useHover } from "../../../contexts/HoverContext";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { GameCard } from "../cards/game-card";
import { StatPip, type StatKind } from "../stat-pip";

/**
 * Shared card inspector for hover and selection. Playing a card deliberately
 * remains in the hand interaction layer, so this panel is read-only.
 */
export function DetailPanel() {
  const { hoveredCard, hoveredUnit, selectedCard, selectedUnit, selectCard } = useHover();
  const card = selectedCard ?? hoveredCard;
  const unit = selectedUnit ?? hoveredUnit;
  const cardId = unit?.cardId ?? card?.cardId;
  const definition = cardId && hasCard(cardId) ? getCardDefinition(cardId) : undefined;
  const pinned = Boolean(selectedCard || selectedUnit);

  if (!definition) {
    return null;
  }

  const attack = unit ? getUnitAttack(unit) : definition.attack;
  const health = unit ? getUnitHealth(unit) : definition.health;

  return (
    <AnimatePresence>
      <motion.aside
        key={unit?.instanceId ?? card?.instanceId ?? definition.id}
        initial={{ x: 360, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 360, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="card-inspector pointer-events-auto"
        aria-label={`${definition.name} details`}
      >
        <div className="inspector-header">
          <div>
            <h2>{definition.name}</h2>
          </div>
          <div className="inspector-actions">
            {pinned ? (
              <button
                type="button"
                className="panel-close"
                onClick={() => selectCard(undefined, undefined)}
                aria-label="Close card details"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto aspect-[5/7] w-[250px] max-w-full">
          <GameCard card={card} unit={unit} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <DetailStat kind="mana" label="Mana" value={definition.cost} />
          {definition.type !== "spell" ? (
            <>
              <DetailStat kind="attack" label="Attack" value={attack ?? "-"} />
              <DetailStat kind="hp" label="HP" value={health ?? "-"} />
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center rounded-lg border border-border bg-card/50 px-2 text-center text-[11px] text-muted-foreground">
              No combat stats
            </div>
          )}
        </div>

        {definition.keywords?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {definition.keywords.map((keyword) => (
              <span key={keyword} className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {keyword}
              </span>
            ))}
          </div>
        ) : null}

        {definition.description ? (
          <div className="rounded-lg border border-border bg-card/50 p-3 text-sm leading-relaxed text-foreground/90">
            {definition.description}
          </div>
        ) : null}
      </motion.aside>
    </AnimatePresence>
  );
}

function DetailStat({
  kind,
  label,
  value
}: {
  kind: StatKind;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-card/50 py-2">
      <StatPip kind={kind} value={value} size="lg" />
      <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
