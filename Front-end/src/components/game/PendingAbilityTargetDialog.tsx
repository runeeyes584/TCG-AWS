"use client";

import type {
  CardInstance,
  GameState,
  GraveyardEntry,
  PendingChoice,
  PlayerId,
  SpellTarget,
  TargetDefinition,
  UnitInstance
} from "@backend/game/types";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { Button } from "../ui/button";
import { BoardDialog } from "../ui/modal";
import { PickerCard } from "./PickerCard";

interface Props {
  gameState: GameState;
  pendingChoice: PendingChoice;
  canControl: boolean;
  onSelectTarget: (targetId: string, target: SpellTarget) => void;
  onCancel: () => void;
}

type Candidate =
  | { zone: "unit"; playerId: PlayerId; unit: UnitInstance; target: SpellTarget }
  | { zone: "deck" | "hand"; playerId: PlayerId; card: CardInstance; target: SpellTarget }
  | { zone: "graveyard"; playerId: PlayerId; entry: GraveyardEntry; target: SpellTarget; selectable: boolean };

const opponentOf = (playerId: PlayerId): PlayerId => playerId === "P1" ? "P2" : "P1";

function cardMatchesFilter(card: CardInstance, targetDefinition: TargetDefinition): boolean {
  if (!hasCard(card.cardId)) return false;
  const filter = targetDefinition.filter;
  if (!filter) return true;
  const definition = getCardDefinition(card.cardId);
  return (
    (!filter.archetype || definition.archetype === filter.archetype) &&
    (!filter.cardType || definition.type === filter.cardType) &&
    (!filter.cardTypes || filter.cardTypes.includes(definition.type)) &&
    (!filter.spellSpeed || definition.spellSpeed === filter.spellSpeed) &&
    (filter.maxCost === undefined || definition.cost <= filter.maxCost) &&
    definition.level !== 2
  );
}

function getCandidates(
  gameState: GameState,
  pendingChoice: PendingChoice,
  targetDefinition: TargetDefinition | undefined
): Candidate[] {
  if (!targetDefinition) return [];
  const sourcePlayerId = pendingChoice.playerId;
  const enemyPlayerId = opponentOf(sourcePlayerId);
  const chosenUnitIds = new Set(
    Object.values(pendingChoice.chosenTargets)
      .filter((target): target is Extract<SpellTarget, { type: "UNIT" }> => target.type === "UNIT")
      .map((target) => `${target.playerId}:${target.unitId}`)
  );
  const chosenHandIds = new Set(
    Object.values(pendingChoice.chosenTargets)
      .filter((target): target is Extract<SpellTarget, { type: "HAND_CARD" }> => target.type === "HAND_CARD")
      .map((target) => `${target.playerId}:${target.cardInstanceId}`)
  );

  const unitPlayers: PlayerId[] = targetDefinition.kind === "ALLY_UNIT" ? [sourcePlayerId]
    : targetDefinition.kind === "ENEMY_UNIT" ? [enemyPlayerId]
    : targetDefinition.kind === "ANY_UNIT" || targetDefinition.kind === "ANY_TARGET" ? ["P1", "P2"] : [];
  const deckPlayers: PlayerId[] = targetDefinition.kind === "ALLY_DECK_CARD" ? [sourcePlayerId]
    : targetDefinition.kind === "ANY_DECK_CARD" ? ["P1", "P2"] : [];
  const handPlayers: PlayerId[] = targetDefinition.kind === "ALLY_HAND_CARD" ? [sourcePlayerId]
    : targetDefinition.kind === "ENEMY_HAND_CARD" ? [enemyPlayerId]
    : targetDefinition.kind === "ANY_HAND_CARD" ? ["P1", "P2"] : [];
  const graveyardPlayers: PlayerId[] = targetDefinition.kind === "ALLY_GRAVEYARD" ? [sourcePlayerId]
    : targetDefinition.kind === "ENEMY_GRAVEYARD" ? [enemyPlayerId]
    : targetDefinition.kind === "ANY_GRAVEYARD" ? ["P1", "P2"] : [];

  return [
    ...unitPlayers.flatMap((playerId): Candidate[] => gameState.players[playerId].board
      .filter((unit) => !chosenUnitIds.has(`${playerId}:${unit.instanceId}`))
      .map((unit) => ({ zone: "unit", playerId, unit,
        target: { type: "UNIT", playerId, unitId: unit.instanceId } }))),
    ...deckPlayers.flatMap((playerId): Candidate[] => gameState.players[playerId].deck
      .filter((card) => cardMatchesFilter(card, targetDefinition))
      .map((card) => ({ zone: "deck", playerId, card,
        target: { type: "DECK_CARD", playerId, cardInstanceId: card.instanceId } }))),
    ...handPlayers.flatMap((playerId): Candidate[] => gameState.players[playerId].hand
      .filter((card) => !chosenHandIds.has(`${playerId}:${card.instanceId}`))
      .filter((card) => cardMatchesFilter(card, targetDefinition))
      .map((card) => ({ zone: "hand", playerId, card,
        target: { type: "HAND_CARD", playerId, cardInstanceId: card.instanceId } }))),
    ...graveyardPlayers.flatMap((playerId): Candidate[] => gameState.players[playerId].graveyard
      .map((entry) => ({ zone: "graveyard", playerId, entry,
        target: { type: "GRAVEYARD", playerId, cardInstanceId: entry.instanceId },
        selectable: entry.type === "UNIT" || entry.type === "CHAMPION" })))
  ];
}

function describeTarget(targetDefinition: TargetDefinition | undefined): string {
  if (!targetDefinition) return "Resolve ability choice";
  switch (targetDefinition.kind) {
    case "ALLY_UNIT": return "Choose an allied unit";
    case "ENEMY_UNIT": return "Choose an enemy unit";
    case "ANY_UNIT":
    case "ANY_TARGET": return "Choose a unit";
    case "ALLY_NEXUS": return "Choose your nexus";
    case "ENEMY_NEXUS": return "Choose the enemy nexus";
    case "SELF": return "Choose self";
    case "ALLY_DECK_CARD": return "Choose a card from your deck";
    case "ANY_DECK_CARD": return "Choose a card from a deck";
    case "ALLY_HAND_CARD": return "Choose a card in your hand";
    case "ENEMY_HAND_CARD": return "Choose a card in enemy hand";
    case "ANY_HAND_CARD": return "Choose a hand card";
    case "ALLY_GRAVEYARD": return "Choose an allied unit or champion from the graveyard";
    case "ENEMY_GRAVEYARD": return "Choose an enemy unit or champion from the graveyard";
    case "ANY_GRAVEYARD": return "Choose a unit or champion from a graveyard";
  }
}

export function PendingAbilityTargetDialog({
  gameState, pendingChoice, canControl, onSelectTarget, onCancel
}: Props) {
  if (!canControl) {
    return (
      <BoardDialog badge="Opponent" title="Choosing a target" titleId="pending-wait-title" maxWidth={420}>
        Please wait for the action to resolve.
      </BoardDialog>
    );
  }

  const targetDefinition = pendingChoice.requiredTargets[0];
  const candidates = getCandidates(gameState, pendingChoice, targetDefinition);
  const onTable = gameState.players[pendingChoice.playerId].board.some(
    (unit) => unit.instanceId === pendingChoice.sourceInstanceId
  );

  return (
    <BoardDialog
      badge={onTable ? "On play · choose a target" : "Choose a target"}
      title={getCardDefinition(pendingChoice.sourceCardId).name}
      titleId="pending-choice-title"
      maxWidth={760}
      scrollBody
      actions={
        <Button chamfer size="md" tone="accent" onClick={onCancel}>
          {onTable ? "No activate buff/debuff" : "Cancel"}
        </Button>
      }
    >
      <p className="pending-choice-need">{describeTarget(targetDefinition)}</p>
      {targetDefinition ? (
        <div className="pending-choice-grid">
          {candidates.map((candidate) => {
            const key = `${candidate.zone}:${candidate.playerId}:${candidate.zone === "unit"
              ? candidate.unit.instanceId : candidate.zone === "graveyard"
                ? candidate.entry.id : candidate.card.instanceId}`;
            const onClick = candidate.zone === "graveyard" && !candidate.selectable
              ? undefined
              : () => onSelectTarget(targetDefinition.id, candidate.target);
            if (candidate.zone === "unit") {
              return <PickerCard key={key} unit={candidate.unit} label={`${candidate.playerId} Board`} onClick={onClick} />;
            }
            const card = candidate.zone === "graveyard"
              ? { instanceId: candidate.entry.instanceId, cardId: candidate.entry.cardId, ownerId: candidate.entry.ownerId }
              : candidate.card;
            const zoneLabel = candidate.zone === "graveyard" ? "Graveyard"
              : candidate.zone === "deck" ? "Deck" : "Hand";
            return (
              <PickerCard
                key={key}
                card={card}
                label={`${candidate.playerId} ${zoneLabel}`}
                blocked={!onClick}
                onClick={onClick}
              />
            );
          })}
        </div>
      ) : null}
      {targetDefinition && !candidates.some((candidate) => candidate.zone !== "graveyard" || candidate.selectable)
        ? <div className="empty-message">No valid targets.</div> : null}
    </BoardDialog>
  );
}
