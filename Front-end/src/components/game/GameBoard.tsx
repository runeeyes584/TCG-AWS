"use client";

import { List, RotateCcw, Settings, Shield, Swords, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import {
  AbilityTargetMap,
  CardInstance,
  GraveyardEntryType,
  PlayerId,
  SpellTarget,
  SpellTargetKind,
  TargetDefinition,
  UnitInstance
} from "@backend/game/types";
import { useLocalGame } from "../../hooks/useLocalGame";
import type { GameAction } from "@backend/game/types";
import { ActionLog } from "./ActionLog";
import { GameCard } from "./cards/game-card";
import { BoardRow } from "./zones/board-row";
import { CenterInfo } from "./zones/center-info";
import { Hand } from "./zones/hand";
import { NexusPanel } from "./hud/nexus-panel";
import { PassButton } from "./hud/pass-button";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import { hasKeyword } from "@backend/game/core/engine";
import { HoverProvider } from "../../contexts/HoverContext";
import { DetailPanel } from "./hud/detail-panel";
import { GraveyardPickerModal } from "./GraveyardPickerModal";
import { DeckPile, GraveyardPile } from "./hud/side-piles";
import { SpellEffectLayer } from "./spell-effect-layer";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { useBattleMusic } from "../../hooks/useBattleMusic";

interface Props {
  controller: GameController;
}

export interface GameController {
  gameState: ReturnType<typeof useLocalGame>["gameState"];
  actionLog: ReturnType<typeof useLocalGame>["actionLog"];
  dispatch: ReturnType<typeof useLocalGame>["dispatch"];
  dispatchChain: ReturnType<typeof useLocalGame>["dispatchChain"];
  resetGame: ReturnType<typeof useLocalGame>["resetGame"];
}

interface GameBoardViewProps {
  controller: GameController;
  localPlayerId?: PlayerId;
  connectionStatus?: string;
  opponentConnected?: boolean;
}

export function GameBoard({ controller }: Props) {
  // const controller = useLocalGame();
  return <GameBoardView controller={controller} />;
}

export function GameBoardView({
  controller,
  localPlayerId,
  connectionStatus,
  opponentConnected = true
}: GameBoardViewProps) {
  const { gameState, actionLog, dispatch, dispatchChain, resetGame } = controller;
  useBattleMusic(gameState);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string>();
  const [selectedSpell, setSelectedSpell] = useState<CardInstance>();
  const [selectedSpellTarget, setSelectedSpellTarget] = useState<SpellTarget>();
  const [selectedCostTargets, setSelectedCostTargets] = useState<SpellTarget[]>([]);
  const [viewingGraveyard, setViewingGraveyard] = useState<PlayerId>();
  const [openPanel, setOpenPanel] = useState<"log" | "dev" | undefined>();
  const [previewCard, setPreviewCard] = useState<CardInstance>();
  const [championEntrance, setChampionEntrance] = useState<{
    instanceId: string;
    name: string;
    imageUrl?: string;
    ownerId: PlayerId;
    attack?: number;
    health?: number;
  }>();
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const battleTableRef = useRef<HTMLElement>(null);
  const [afkNotice, setAfkNotice] = useState<{
    level: "warning" | "danger";
    message: string;
  }>();
  const previousChampionIdsRef = useRef<Set<string>>(new Set());
  const attackPlayerId = gameState.attackTokenPlayerId;
  const defenderId: PlayerId = attackPlayerId === "P1" ? "P2" : "P1";
  const attackerCount = gameState.combat.attackers.length;
  const selectedBlocker = selectedBlockerId
    ? gameState.players[defenderId].board.find(
      (unit) => unit.instanceId === selectedBlockerId
    )
    : undefined;
  const attackerIds = gameState.combat.attackers.map((lane) => lane.attackerId);
  const assignedBlockerIds = gameState.combat.attackers
    .map((lane) => lane.blockerId)
    .filter((blockerId): blockerId is string => Boolean(blockerId));
  const selectedCostUnitIds = selectedCostTargets
    .filter((target): target is Extract<SpellTarget, { type: "UNIT" }> => target.type === "UNIT")
    .map((target) => target.unitId);

  const cardDef = (card: CardInstance) => getCardDefinition(card.cardId);
  const unitDef = (unit: UnitInstance) => getCardDefinition(unit.cardId);
  const canControl = (playerId: PlayerId) => !localPlayerId || localPlayerId === playerId;
  const shouldHideHand = (playerId: PlayerId) => Boolean(localPlayerId && localPlayerId !== playerId);

  useEffect(() => {
    if (!gameState.started || gameState.winnerId) {
      previousChampionIdsRef.current = new Set();
      setChampionEntrance(undefined);
      return;
    }

    const champions = (["P1", "P2"] as PlayerId[]).flatMap((playerId) =>
      gameState.players[playerId].board
        .map((unit) => ({ unit, definition: getCardDefinition(unit.cardId) }))
        .filter(({ definition }) => definition.type === "champion")
        .map(({ unit, definition }) => ({
          instanceId: unit.instanceId,
          name: definition.name,
          imageUrl: definition.imageUrl,
          ownerId: playerId,
          attack: getUnitAttack(unit),
          health: getUnitHealth(unit)
        }))
    );
    const currentIds = new Set(champions.map((champion) => champion.instanceId));
    const enteringChampion = champions.find(
      (champion) => !previousChampionIdsRef.current.has(champion.instanceId)
    );

    previousChampionIdsRef.current = currentIds;
    if (!enteringChampion) {
      return;
    }

    setChampionEntrance(enteringChampion);
    const timeout = window.setTimeout(() => {
      setChampionEntrance((current) =>
        current?.instanceId === enteringChampion.instanceId ? undefined : current
      );
    }, 2400);

    return () => window.clearTimeout(timeout);
  }, [gameState]);

  useEffect(() => {
    const updateCountdown = () => {
      setTimeRemainingMs(Math.max(
        0,
        gameState.turnDuration - (Date.now() - gameState.turnStartTime)
      ));
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 100);
    return () => window.clearInterval(interval);
  }, [gameState.turnDuration, gameState.turnStartTime]);

  useEffect(() => {
    const warning = gameState.visualEvents.find(
      (event): event is Extract<typeof event, { type: "AFK_WARNING" }> =>
        event.type === "AFK_WARNING" && event.playerId === localPlayerId
    );
    if (!warning) {
      return;
    }

    setAfkNotice(
      warning.afkCount === 1
        ? { level: "warning", message: "Bạn đã bỏ lỡ lượt. Lượt sau chỉ còn 15s." }
        : {
          level: "danger",
          message: "Cảnh báo AFK! Lượt sau bạn sẽ bị xử thua nếu tiếp tục không thao tác."
        }
    );
  }, [gameState.visualEvents, localPlayerId]);

  function canPlay(playerId: PlayerId, card: CardInstance) {
    if (!canControl(playerId) || shouldHideHand(playerId)) {
      return false;
    }

    if (card.cardId === "hidden-card") {
      return false;
    }

    const player = gameState.players[playerId];
    const definition = cardDef(card);
    const isSpell = definition.type === "spell";
    if (gameState.phase === "DISCARD") {
      return (
        gameState.pendingDiscard?.playerId === playerId &&
        card.ownerId === playerId &&
        player.hand.length > gameState.pendingDiscard.downTo
      );
    }

    return (
      gameState.started &&
      !gameState.winnerId &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === playerId &&
      (isSpell
        ? player.mana + player.spellMana >= definition.cost
        : player.mana >= definition.cost)
    );
  }

  function surrender() {
    if (!localPlayerId || !window.confirm("Bạn có chắc muốn đầu hàng không?")) {
      return;
    }

    dispatch({ type: "SURRENDER", playerId: localPlayerId });
  }

  function playCard(playerId: PlayerId, card: CardInstance) {
    if (!canControl(playerId) || shouldHideHand(playerId)) {
      return;
    }

    const definition = cardDef(card);
    if (gameState.phase === "DISCARD") {
      dispatch(
        { type: "DISCARD_CARD", playerId, cardInstanceId: card.instanceId },
        `${playerId} discarded ${definition.name}.`
      );
      return;
    }

    if (definition.supertype?.toLowerCase() === "champion") {
      if (!window.confirm(`Are you sure you want to play Champion ${definition.name}?`)) {
        return;
      }
    }

    if (definition.type === "spell") {
      playOrSelectSpell(playerId, card);
      return;
    }

    if (definition.additionalCost) {
      selectCardForCosts(playerId, card);
      return;
    }

    if ((definition.type === "unit" || definition.type === "champion") && gameState.players[playerId].board.length >= 6) {
      setSelectedSpell(card); // Treat as spell to select replacement target
      setSelectedSpellTarget(undefined);
      setSelectedCostTargets([]);
      setViewingGraveyard(undefined);
      return;
    }

    dispatch(
      { type: "PLAY_UNIT", playerId, cardInstanceId: card.instanceId },
      `${playerId} played ${definition.name}.`
    );
  }

  function playOrSelectSpell(playerId: PlayerId, card: CardInstance) {
    if (!canControl(playerId)) {
      return;
    }

    if (selectedSpell?.instanceId === card.instanceId) {
      clearSelectedCard();
      return;
    }

    setSelectedSpell(card);
    setSelectedSpellTarget(undefined);
    setSelectedCostTargets([]);

    if (cardDef(card).additionalCost) {
      setViewingGraveyard(undefined);
      return;
    }

    beginPrimaryTargetSelection(playerId, card);
  }

  function selectCardForCosts(playerId: PlayerId, card: CardInstance) {
    if (!canControl(playerId)) {
      return;
    }

    if (selectedSpell?.instanceId === card.instanceId) {
      clearSelectedCard();
      return;
    }

    setSelectedSpell(card);
    setSelectedSpellTarget(undefined);
    setSelectedCostTargets([]);
    setViewingGraveyard(undefined);
  }

  function beginPrimaryTargetSelection(playerId: PlayerId, card: CardInstance) {
    const targetKind = getPrimarySpellTarget(card);

    if (!targetKind) {
      setSelectedSpellTarget({ type: "SELF", playerId });
      return;
    }

    if (targetKind === "SELF") {
      setSelectedSpellTarget({ type: "SELF", playerId });
      return;
    }

    if (targetKind === "NEXUS") {
      const targetPlayerId =
        cardDef(card).effects?.[0]?.type === "HEAL" ? playerId : opponentOf(playerId);
      setSelectedSpellTarget({ type: "NEXUS", playerId: targetPlayerId });
      return;
    }

    if (targetKind === "ALLY_GRAVEYARD" || targetKind === "ENEMY_GRAVEYARD") {
      const graveyardPlayerId = getGraveyardTargetPlayer(playerId, targetKind);
      setSelectedSpellTarget(undefined);
      setViewingGraveyard(graveyardPlayerId);
      return;
    }

    setSelectedSpellTarget(undefined);
  }

  function clearSelectedCard() {
    setSelectedSpell(undefined);
    setSelectedSpellTarget(undefined);
    setSelectedCostTargets([]);
    setViewingGraveyard(undefined);
    setPreviewCard(undefined);
  }

  function getDamagePreview(attacker: UnitInstance, blocker?: UnitInstance) {
    if (!blocker) {
      return { attackerTakes: 0, blockerTakes: 0, nexusTakes: getUnitAttack(attacker) };
    }
    const atk = getUnitAttack(attacker);
    const blkAtk = getUnitAttack(blocker);

    let attackerTakes = 0;
    let blockerTakes = 0;
    let nexusTakes = 0;

    const calcDamage = (amount: number, unit: UnitInstance) => {
      if (amount <= 0) return 0;
      if (hasKeyword(unit, "BARRIER")) return 0;
      return hasKeyword(unit, "TOUGH") ? Math.max(0, amount - 1) : amount;
    };

    if (hasKeyword(attacker, "QUICK_ATTACK")) {
      const dmgToBlocker = calcDamage(atk, blocker);
      blockerTakes = Math.min(getUnitHealth(blocker), dmgToBlocker);
      if (hasKeyword(attacker, "OVERWHELM")) {
        nexusTakes = Math.max(0, dmgToBlocker - getUnitHealth(blocker));
      }
      if (getUnitHealth(blocker) - blockerTakes > 0) {
        attackerTakes = calcDamage(blkAtk, attacker);
      }
    } else {
      const dmgToBlocker = calcDamage(atk, blocker);
      blockerTakes = Math.min(getUnitHealth(blocker), dmgToBlocker);
      attackerTakes = calcDamage(blkAtk, attacker);
      if (hasKeyword(attacker, "OVERWHELM")) {
        nexusTakes = Math.max(0, dmgToBlocker - getUnitHealth(blocker));
      }
    }

    return { attackerTakes, blockerTakes, nexusTakes };
  }

  function getPrimarySpellTarget(card: CardInstance): SpellTargetKind | undefined {
    const effects = cardDef(card).effects ?? [];
    const target = effects
      .map((effect) => effect.target)
      .find((candidate) =>
        candidate === "ENEMY_UNIT" ||
        candidate === "ALLY_UNIT" ||
        candidate === "NEXUS" ||
        candidate === "SELF" ||
        candidate === "ALLY_GRAVEYARD" ||
        candidate === "ENEMY_GRAVEYARD" ||
        candidate === "RECALL_UNIT"
      );

    if (target === "RECALL_UNIT") {
      return "ALLY_UNIT";
    }

    if (
      target === "ENEMY_UNIT" ||
      target === "ALLY_UNIT" ||
      target === "NEXUS" ||
      target === "SELF" ||
      target === "ALLY_GRAVEYARD" ||
      target === "ENEMY_GRAVEYARD"
    ) {
      return target;
    }
    return undefined;
  }

  function assignBlocker(attacker: UnitInstance, blockerId: string) {
    const blockerName =
      gameState.players[defenderId].board.find(
        (candidate) => candidate.instanceId === blockerId
      );
    const blockerLabel = blockerName ? unitDef(blockerName).name : "a unit";

    dispatch(
      {
        type: "DECLARE_BLOCKER",
        playerId: defenderId,
        attackerId: attacker.instanceId,
        blockerId
      },
      `${defenderId} blocked ${unitDef(attacker).name} with ${blockerLabel}.`
    );
    setSelectedBlockerId(undefined);
  }

  function selectBoardUnit(playerId: PlayerId, unit: UnitInstance) {
    if (!gameState.started || gameState.winnerId) {
      return;
    }

    if (selectedSpell && gameState.phase === "ACTION") {
      const casterId = selectedSpell.ownerId;

      const selectedDefinition = cardDef(selectedSpell);
      const additionalCost = selectedDefinition.additionalCost;
      if (
        additionalCost?.type === "SACRIFICE_UNITS" &&
        selectedCostTargets.length < additionalCost.count
      ) {
        if (playerId !== casterId) {
          return;
        }
        if (
          selectedCostTargets.some(
            (target) => target.type === "UNIT" && target.unitId === unit.instanceId
          )
        ) {
          return;
        }

        const nextCostTargets: SpellTarget[] = [
          ...selectedCostTargets,
          { type: "UNIT", playerId, unitId: unit.instanceId }
        ];
        setSelectedCostTargets(nextCostTargets);

        if (nextCostTargets.length === additionalCost.count) {
          if (selectedDefinition.type === "spell") {
            beginPrimaryTargetSelection(casterId, selectedSpell);
          } else if (selectedDefinition.type === "unit" || selectedDefinition.type === "champion") {
            dispatch(
              {
                type: "PLAY_UNIT",
                playerId: casterId,
                cardInstanceId: selectedSpell.instanceId,
                costTargets: nextCostTargets
              },
              `${casterId} played ${selectedDefinition.name}.`
            );
            clearSelectedCard();
          }
        }
        return;
      }

      if (selectedDefinition.type === "unit" || selectedDefinition.type === "champion") {
        if (playerId === casterId) {
          dispatch(
            {
              type: "PLAY_UNIT",
              playerId: casterId,
              cardInstanceId: selectedSpell.instanceId,
              replaceUnitId: unit.instanceId,
              costTargets: selectedCostTargets
            },
            `${casterId} played ${selectedDefinition.name}, replacing ${unitDef(unit).name}.`
          );
          clearSelectedCard();
        }
        return;
      }

      const targetKind = getPrimarySpellTarget(selectedSpell);
      const isValidUnitTarget =
        (targetKind === "ALLY_UNIT" && playerId === casterId) ||
        (targetKind === "ENEMY_UNIT" && playerId !== casterId);

      if (!isValidUnitTarget) {
        return;
      }

      setSelectedSpellTarget({ type: "UNIT", playerId, unitId: unit.instanceId });
      return;
    }

    if (
      canControl(defenderId) &&
      playerId === attackPlayerId &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId &&
      selectedBlockerId &&
      gameState.combat.attackers.some(
        (lane) => lane.attackerId === unit.instanceId && !lane.blockerId
      )
    ) {
      assignBlocker(unit, selectedBlockerId);
      return;
    }

    if (playerId === attackPlayerId && gameState.priorityPlayerId === playerId) {
      if (!canControl(playerId)) {
        return;
      }

      if (gameState.phase !== "ACTION" || !gameState.attackTokenAvailable) {
        return;
      }
      if (gameState.combat.attackers.some((lane) => lane.attackerId === unit.instanceId)) {
        dispatch(
          { type: "REMOVE_ATTACKER", playerId, unitInstanceId: unit.instanceId },
          `${playerId} removed ${unitDef(unit).name} from the attack.`
        );
        return;
      }
      dispatch(
        { type: "DECLARE_ATTACKER", playerId, unitInstanceId: unit.instanceId },
        `${playerId} sent ${unitDef(unit).name} to attack.`
      );
      return;
    }

    if (playerId === defenderId && gameState.priorityPlayerId === playerId) {
      if (!canControl(playerId)) {
        return;
      }

      if (gameState.phase !== "BLOCK") {
        return;
      }
      if (gameState.combat.attackers.some((lane) => lane.blockerId === unit.instanceId)) {
        dispatch(
          { type: "REMOVE_BLOCKER", playerId, blockerId: unit.instanceId },
          `${playerId} removed ${unitDef(unit).name} from blocking.`
        );
        setSelectedBlockerId(undefined);
        return;
      }

      setSelectedBlockerId(
        unit.instanceId === selectedBlockerId ? undefined : unit.instanceId
      );
    }
  }

  function commitAttack() {
    if (!canControl(attackPlayerId)) {
      return;
    }

    setSelectedBlockerId(undefined);
    clearSelectedCard();
    dispatch(
      { type: "COMMIT_ATTACK", playerId: attackPlayerId },
      `${attackPlayerId} committed attackers. ${defenderId} may block.`
    );
  }

  function passPriority() {
    if (!canControl(gameState.priorityPlayerId)) {
      return;
    }

    setSelectedBlockerId(undefined);
    clearSelectedCard();
    dispatch(
      { type: "END_TURN", playerId: gameState.priorityPlayerId },
      `${gameState.priorityPlayerId} passed priority.`
    );
  }

  function commitBlocks() {
    if (!canControl(defenderId)) {
      return;
    }

    setSelectedBlockerId(undefined);
    clearSelectedCard();
    dispatch(
      { type: "COMMIT_BLOCKS", playerId: defenderId },
      `${defenderId} committed blocks. Combat is ready.`
    );
  }

  function resolveCombat() {
    setSelectedBlockerId(undefined);
    clearSelectedCard();
    dispatch({ type: "RESOLVE_COMBAT" }, "Combat resolved.");
  }

  // --- Smart Action Orb logic ---
  type SmartAction = {
    label: string;
    sublabel: string;
    mode: "attack" | "defend" | "idle";
    enabled: boolean;
    onClick: () => void;
  };

  function getSmartAction(): SmartAction {
    const started = gameState.started && !gameState.winnerId;

    // ATTACK/PASS: attacker has priority, action phase, attack token still available.
    if (
      started &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === attackPlayerId &&
      gameState.attackTokenAvailable
    ) {
      if (attackerCount === 0) {
        return {
          label: "PASS",
          sublabel: "No attack",
          mode: "idle",
          enabled: canControl(attackPlayerId),
          onClick: passPriority
        };
      }

      return {
        label: "ATTACK",
        sublabel: `${attackerCount} unit${attackerCount > 1 ? "s" : ""}`,
        mode: "attack",
        enabled: canControl(attackPlayerId),
        onClick: commitAttack
      };
    }

    // DEFEND: block phase, defender has priority, no pending manual assignment
    if (
      started &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId &&
      !selectedBlockerId
    ) {
      const hasBlocks = assignedBlockerIds.length > 0;

      return {
        label: hasBlocks ? "DEFEND" : "PASS",
        sublabel: hasBlocks
          ? `${assignedBlockerIds.length} block${assignedBlockerIds.length > 1 ? "s" : ""}`
          : "No blocks",
        mode: "defend",
        enabled: canControl(defenderId),
        // Commit blocks then auto-resolve in one atomic step
        onClick: () => {
          setSelectedBlockerId(undefined);
          clearSelectedCard();
          dispatchChain([
            { action: { type: "COMMIT_BLOCKS", playerId: defenderId }, label: `${defenderId} committed blocks.` },
            { action: { type: "RESOLVE_COMBAT" }, label: "Combat resolved." }
          ]);
        }
      };
    }

    // ROUND: action phase — advance the round
    if (started && gameState.phase === "ACTION") {
      return {
        label: "PASS",
        sublabel: "Pass priority",
        mode: "idle",
        enabled: canControl(gameState.priorityPlayerId),
        onClick: passPriority
      };
    }

    return {
      label: "WAITING",
      sublabel: `#${gameState.round}`,
      mode: "idle",
      enabled: false,
      onClick: () => { }
    };
  }

  function castSelectedSpell() {
    if (!selectedSpell || !selectedSpellTarget) {
      return;
    }

    dispatch(
      {
        type: "PLAY_SPELL",
        playerId: selectedSpell.ownerId,
        cardInstanceId: selectedSpell.instanceId,
        target: selectedSpellTarget,
        costTargets: selectedCostTargets.length > 0 ? selectedCostTargets : undefined
      },
      `${selectedSpell.ownerId} played ${cardDef(selectedSpell).name}.`
    );
    clearSelectedCard();
  }

  function getGraveyardTargetPlayer(
    casterId: PlayerId,
    targetKind: SpellTargetKind | undefined
  ): PlayerId | undefined {
    if (targetKind === "ALLY_GRAVEYARD") {
      return casterId;
    }

    if (targetKind === "ENEMY_GRAVEYARD") {
      return opponentOf(casterId);
    }

    return undefined;
  }

  function canSelectGraveyardCard(playerId: PlayerId) {
    if (!selectedSpell || gameState.phase !== "ACTION") {
      return false;
    }

    const targetKind = getPrimarySpellTarget(selectedSpell);
    const targetPlayerId = getGraveyardTargetPlayer(selectedSpell.ownerId, targetKind);
    return targetPlayerId === playerId;
  }

  function selectGraveyardCard(playerId: PlayerId, cardInstanceId: string) {
    if (!canSelectGraveyardCard(playerId)) {
      return;
    }

    const target: SpellTarget = {
      type: "GRAVEYARD",
      playerId,
      cardInstanceId
    };

    if (selectedSpell && isReviveCardSpell(selectedSpell)) {
      dispatch(
        {
          type: "PLAY_SPELL",
          playerId: selectedSpell.ownerId,
          cardInstanceId: selectedSpell.instanceId,
          target,
          costTargets: selectedCostTargets.length > 0 ? selectedCostTargets : undefined
        },
        `${selectedSpell.ownerId} played ${cardDef(selectedSpell).name}.`
      );
      clearSelectedCard();
      return;
    }

    setSelectedSpellTarget(target);
    setViewingGraveyard(undefined);
  }

  function isReviveCardSpell(card: CardInstance) {
    return cardDef(card).effects?.some((effect) => effect.type === "REVIVE_CARD" || effect.type === "REBIRTH_CARD") ?? false;
  }

  function getGraveyardAllowedTypes(): GraveyardEntryType[] | undefined {
    if (!selectedSpell) return undefined;
    const reviveEffect = cardDef(selectedSpell).effects?.find((effect) => effect.type === "REVIVE_CARD" || effect.type === "REBIRTH_CARD");
    if (reviveEffect && (reviveEffect.type === "REVIVE_CARD" || reviveEffect.type === "REBIRTH_CARD")) {
      return reviveEffect.allowedTypes as GraveyardEntryType[];
    }
    return undefined;
  }

  function submitPendingAbilityTarget(targetId: string, target: SpellTarget) {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return;
    }

    const targets: AbilityTargetMap = {
      [targetId]: target
    };
    dispatch(
      {
        type: "SUBMIT_ABILITY_TARGETS",
        playerId: pendingChoice.playerId,
        targets
      },
      `${pendingChoice.playerId} chose an ability target.`
    );
  }

  function cancelPendingChoice() {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return;
    }

    dispatch(
      { type: "CANCEL_PENDING_CHOICE", playerId: pendingChoice.playerId },
      `${pendingChoice.playerId} cancelled the ability choice.`
    );
  }

  function getPendingTargetUnits(targetDefinition: TargetDefinition): Array<{
    playerId: PlayerId;
    unit: UnitInstance;
  }> {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return [];
    }

    const sourcePlayerId = pendingChoice.playerId;
    const enemyPlayerId = opponentOf(sourcePlayerId);
    const playerIds: PlayerId[] =
      targetDefinition.kind === "ALLY_UNIT"
        ? [sourcePlayerId]
        : targetDefinition.kind === "ENEMY_UNIT"
          ? [enemyPlayerId]
          : targetDefinition.kind === "ANY_UNIT" || targetDefinition.kind === "ANY_TARGET"
            ? ["P1", "P2"]
            : [];

    const chosenUnitIds = new Set(
      Object.values(pendingChoice.chosenTargets)
        .filter((target): target is Extract<SpellTarget, { type: "UNIT" }> => target.type === "UNIT")
        .map((target) => `${target.playerId}:${target.unitId}`)
    );

    return playerIds.flatMap((playerId) =>
      gameState.players[playerId].board
        .filter((unit) => !chosenUnitIds.has(`${playerId}:${unit.instanceId}`))
        .map((unit) => ({ playerId, unit }))
    );
  }

  function getPendingTargetDeckCards(targetDefinition: TargetDefinition): Array<{
    playerId: PlayerId;
    card: CardInstance;
  }> {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return [];
    }

    const sourcePlayerId = pendingChoice.playerId;
    const playerIds: PlayerId[] =
      targetDefinition.kind === "ALLY_DECK_CARD"
        ? [sourcePlayerId]
        : targetDefinition.kind === "ANY_DECK_CARD"
          ? ["P1", "P2"]
          : [];

    return playerIds.flatMap((playerId) =>
      gameState.players[playerId].deck
        .filter((card) => doesCardMatchTargetFilter(card, targetDefinition))
        .map((card) => ({ playerId, card }))
    );
  }

  function getPendingTargetHandCards(targetDefinition: TargetDefinition): Array<{
    playerId: PlayerId;
    card: CardInstance;
  }> {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return [];
    }

    const sourcePlayerId = pendingChoice.playerId;
    const enemyPlayerId = opponentOf(sourcePlayerId);
    const playerIds: PlayerId[] =
      targetDefinition.kind === "ALLY_HAND_CARD"
        ? [sourcePlayerId]
        : targetDefinition.kind === "ENEMY_HAND_CARD"
          ? [enemyPlayerId]
          : targetDefinition.kind === "ANY_HAND_CARD"
            ? ["P1", "P2"]
            : [];

    const chosenCardIds = new Set(
      Object.values(pendingChoice.chosenTargets)
        .filter((target): target is Extract<SpellTarget, { type: "HAND_CARD" }> => target.type === "HAND_CARD")
        .map((target) => `${target.playerId}:${target.cardInstanceId}`)
    );

    return playerIds.flatMap((playerId) =>
      gameState.players[playerId].hand
        .filter((card) => !chosenCardIds.has(`${playerId}:${card.instanceId}`))
        .filter((card) => doesCardMatchTargetFilter(card, targetDefinition))
        .map((card) => ({ playerId, card }))
    );
  }

  function getPendingTargetGraveyardCards(targetDefinition: TargetDefinition): Array<{
    playerId: PlayerId;
    entry: typeof gameState.players.P1.graveyard[number];
  }> {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return [];
    }

    const sourcePlayerId = pendingChoice.playerId;
    const playerIds: PlayerId[] =
      targetDefinition.kind === "ALLY_GRAVEYARD"
        ? [sourcePlayerId]
        : targetDefinition.kind === "ENEMY_GRAVEYARD"
          ? [opponentOf(sourcePlayerId)]
          : targetDefinition.kind === "ANY_GRAVEYARD"
            ? ["P1", "P2"]
            : [];

    return playerIds.flatMap((playerId) =>
      gameState.players[playerId].graveyard.map((entry) => ({ playerId, entry }))
    );
  }

  function doesCardMatchTargetFilter(
    card: CardInstance,
    targetDefinition: TargetDefinition
  ): boolean {
    if (!hasCard(card.cardId)) {
      return false;
    }
    const filter = targetDefinition.filter;
    if (!filter) {
      return true;
    }

    const definition = cardDef(card);
    return (
      (!filter.archetype || definition.archetype === filter.archetype) &&
      (!filter.cardType || definition.type === filter.cardType) &&
      (!filter.cardTypes || filter.cardTypes.includes(definition.type)) &&
      (!filter.spellSpeed || definition.spellSpeed === filter.spellSpeed) &&
      (filter.maxCost === undefined || definition.cost <= filter.maxCost) &&
      definition.level !== 2
    );
  }

  function renderPendingChoice() {
    const pendingChoice = gameState.pendingChoice;
    if (!pendingChoice) {
      return null;
    }

    if (!canControl(pendingChoice.playerId)) {
      return (
        <div className="pending-choice-overlay" role="dialog" aria-modal="true">
          <div className="pending-choice-panel">
            <div className="pending-choice-header">
              <strong>Opponent is choosing a target</strong>
              <span>Please wait for the action to resolve.</span>
            </div>
          </div>
        </div>
      );
    }

    const targetDefinition = pendingChoice.requiredTargets[0];
    const sourceName = getCardDefinition(pendingChoice.sourceCardId).name;

    return (
      <div
        className="pending-choice-overlay"
        role="dialog"
        aria-modal="true"
        onClick={cancelPendingChoice}
      >
        <div className="pending-choice-panel" onClick={(event) => event.stopPropagation()}>
          <div className="pending-choice-header">
            <strong>{sourceName}</strong>
            <span>{describeAbilityTargetNeed(targetDefinition)}</span>
          </div>

          {targetDefinition ? (
            <div className="pending-choice-grid">
              {getPendingTargetUnits(targetDefinition).map(({ playerId, unit }) => (
                <GameCard
                  key={unit.instanceId}
                  unit={unit}
                  onClick={() =>
                    submitPendingAbilityTarget(targetDefinition.id, {
                      type: "UNIT",
                      playerId,
                      unitId: unit.instanceId
                    })
                  }
                  visualEvents={[]}
                />
              ))}
              {getPendingTargetDeckCards(targetDefinition).map(({ playerId, card }) => (
                <div className="pending-choice-card" key={card.instanceId}>
                  <span className="pending-choice-zone-label">{playerId} Deck</span>
                  <GameCard
                    card={card}
                    onClick={() =>
                      submitPendingAbilityTarget(targetDefinition.id, {
                        type: "DECK_CARD",
                        playerId,
                        cardInstanceId: card.instanceId
                      })
                    }
                    visualEvents={[]}
                  />
                </div>
              ))}
              {getPendingTargetHandCards(targetDefinition).map(({ playerId, card }) => (
                <div className="pending-choice-card" key={card.instanceId}>
                  <span className="pending-choice-zone-label">{playerId} Hand</span>
                  <GameCard
                    card={card}
                    onClick={() =>
                      submitPendingAbilityTarget(targetDefinition.id, {
                        type: "HAND_CARD",
                        playerId,
                        cardInstanceId: card.instanceId
                      })
                    }
                    visualEvents={[]}
                  />
                </div>
              ))}
              {getPendingTargetGraveyardCards(targetDefinition).map(({ playerId, entry }) => {
                const canRevive = entry.type === "UNIT" || entry.type === "CHAMPION";
                return (
                  <div
                    className={`pending-choice-card ${canRevive ? "" : "is-disabled"}`}
                    key={entry.id}
                  >
                    <span className="pending-choice-zone-label">{playerId} Graveyard</span>
                    <GameCard
                      card={{
                        instanceId: entry.instanceId,
                        cardId: entry.cardId,
                        ownerId: entry.ownerId
                      }}
                      onClick={
                        canRevive
                          ? () =>
                            submitPendingAbilityTarget(targetDefinition.id, {
                              type: "GRAVEYARD",
                              playerId,
                              cardInstanceId: entry.instanceId
                            })
                          : undefined
                      }
                      visualEvents={[]}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}

          {targetDefinition &&
            getPendingTargetUnits(targetDefinition).length === 0 &&
            getPendingTargetDeckCards(targetDefinition).length === 0 &&
            getPendingTargetHandCards(targetDefinition).length === 0 &&
            getPendingTargetGraveyardCards(targetDefinition).some(({ entry }) =>
              entry.type === "UNIT" || entry.type === "CHAMPION"
            ) === false ? (
            <div className="empty-message">No valid targets.</div>
          ) : null}

        </div>
      </div>
    );
  }


  function renderPendingDiscard() {
    const pendingDiscard = gameState.pendingDiscard;
    if (!pendingDiscard) {
      return null;
    }

    const player = gameState.players[pendingDiscard.playerId];
    const cardsToDiscard = Math.max(0, player.hand.length - pendingDiscard.downTo);
    const hidden = shouldHideHand(pendingDiscard.playerId);

    return (
      <div className="pending-choice-overlay" role="dialog" aria-modal="true">
        <div className="pending-choice-panel hand-limit-panel">
          <div className="pending-choice-header">
            <strong>{pendingDiscard.playerId} Hand Limit</strong>
            <span>
              Attack token changed. Discard {cardsToDiscard} card
              {cardsToDiscard === 1 ? "" : "s"} to keep {pendingDiscard.downTo}.
            </span>
          </div>

          <div className="pending-choice-grid hand-limit-grid">
            {hidden
              ? player.hand.map((card, index) => (
                <div
                  aria-label={`Hidden discard card ${index + 1}`}
                  className="hidden-card-back"
                  key={card.instanceId}
                >
                  <span>K</span>
                </div>
              ))
              : player.hand.map((card) => (
                <div className="pending-choice-card" key={card.instanceId}>
                  <span className="pending-choice-zone-label">Discard</span>
                <GameCard
                  card={card}
                  compact
                  onClick={() => playCard(pendingDiscard.playerId, card)}
                    visualEvents={[]}
                  />
                </div>
              ))}
          </div>
          {hidden ? (
            <div className="empty-message">
              Waiting for {pendingDiscard.playerId} to discard down to {pendingDiscard.downTo}.
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function getResourcePreview(playerId: PlayerId, card: CardInstance) {
    if (card.cardId === "hidden-card") {
      return {
        manaUsed: 0,
        spellManaUsed: 0
      };
    }
    const player = gameState.players[playerId];
    const definition = cardDef(card);
    if (definition.type === "spell") {
      const spellManaUsed = Math.min(player.spellMana, definition.cost);
      const manaUsed = Math.min(player.mana, Math.max(0, definition.cost - spellManaUsed));
      return { manaUsed, spellManaUsed };
    }

    return {
      manaUsed: Math.min(player.mana, definition.cost),
      spellManaUsed: 0
    };
  }

  function renderDeckStack(playerId: PlayerId, label: string) {
    const player = gameState.players[playerId];
    const canDraw =
      gameState.started &&
      !gameState.winnerId &&
      gameState.priorityPlayerId === playerId &&
      player.deck.length > 0 &&
      canControl(playerId);

    return (
      <DeckPile
        count={player.deck.length}
        label={label}
        interactive={canDraw}
        onDraw={
          canDraw
            ? () => dispatch({ type: "DRAW_CARD", playerId }, `${playerId} drew a card.`)
            : undefined
        }
      />
    );
  }

  function renderGraveyard(playerId: PlayerId, label: string) {
    return (
      <GraveyardPile
        entries={gameState.players[playerId].graveyard}
        label={label}
        onOpen={() => setViewingGraveyard(playerId)}
      />
    );
  }

  function renderSpellStack(label: string) {
    if (!selectedSpell) {
      return <div className="spell-stack spell-stack--empty" aria-hidden="true" />;
    }

    return (
      <div className="spell-stack">
        <span>{label}</span>
        <strong>{cardDef(selectedSpell).name}</strong>
      </div>
    );
  }

  function getRecallUnits(playerId: PlayerId) {
    const combatUnitIds = new Set([...attackerIds, ...assignedBlockerIds]);
    const activeUnitIds = new Set(
      getActiveUnits(playerId)
        .filter((unit): unit is UnitInstance => Boolean(unit))
        .map((unit) => unit.instanceId)
    );
    return gameState.players[playerId].board.filter(
      (unit) => !combatUnitIds.has(unit.instanceId) && !activeUnitIds.has(unit.instanceId)
    );
  }

  function getActiveUnits(playerId: PlayerId): Array<UnitInstance | undefined> {
    if (gameState.combat.attackers.length === 0) {
      return gameState.players[playerId].board.filter(
        (unit) => unit.boardRow === "ACTIVE"
      );
    }

    if (playerId === attackPlayerId) {
      return gameState.combat.attackers.map((lane) =>
        gameState.players[playerId].board.find(
          (unit) => unit.instanceId === lane.attackerId
        )
      );
    }

    const slots: Array<UnitInstance | undefined> = Array(6).fill(undefined);
    const assignedBlockerIds = new Set<string>();

    gameState.combat.attackers.forEach((lane, index) => {
      if (!lane.blockerId) {
        return;
      }

      const blocker = gameState.players[playerId].board.find(
        (unit) => unit.instanceId === lane.blockerId
      );
      if (blocker) {
        slots[index] = blocker;
        assignedBlockerIds.add(blocker.instanceId);
      }
    });

    // Keep unassigned revived units visible without occupying attacker lanes,
    // so the defender can select one and then choose a blocking slot.
    const activeUnits = gameState.players[playerId].board.filter(
      (unit) => unit.boardRow === "ACTIVE" && !assignedBlockerIds.has(unit.instanceId)
    );
    let activeIndex = activeUnits.length - 1;
    for (let index = slots.length - 1; index >= 0 && activeIndex >= 0; index -= 1) {
      if (!slots[index]) {
        slots[index] = activeUnits[activeIndex];
        activeIndex -= 1;
      }
    }

    return slots;
  }

  function canSelectWaitingUnit(playerId: PlayerId): boolean {
    if (!gameState.started || gameState.winnerId) {
      return false;
    }

    if (selectedSpell) {
      return canSelectSpellUnit(playerId);
    }

    if (!canControl(playerId)) {
      return false;
    }

    if (
      gameState.phase === "ACTION" &&
      playerId === attackPlayerId &&
      gameState.priorityPlayerId === attackPlayerId &&
      gameState.attackTokenAvailable
    ) {
      return true;
    }

    if (
      gameState.phase === "BLOCK" &&
      playerId === defenderId &&
      gameState.priorityPlayerId === defenderId
    ) {
      return true;
    }

    return false;
  }

  function canSelectSpellUnit(playerId: PlayerId): boolean {
    if (!selectedSpell || gameState.phase !== "ACTION") {
      return false;
    }

    const casterId = selectedSpell.ownerId;
    if (!canControl(casterId)) {
      return false;
    }

    const definition = cardDef(selectedSpell);
    const additionalCost = definition.additionalCost;
    if (
      additionalCost?.type === "SACRIFICE_UNITS" &&
      selectedCostTargets.length < additionalCost.count
    ) {
      return playerId === casterId;
    }

    if (definition.type === "unit" || definition.type === "champion") {
      return playerId === casterId;
    }

    const targetKind = getPrimarySpellTarget(selectedSpell);
    return (
      (targetKind === "ALLY_UNIT" && playerId === casterId) ||
      (targetKind === "ENEMY_UNIT" && playerId !== casterId)
    );
  }

  function renderWaitingUnit(playerId: PlayerId, unit: UnitInstance) {
    return (
      <div className="active-unit-card" data-effect-target-id={unit.instanceId}>
        <GameCard
          unit={unit}
          compact
          selected={
            unit.instanceId === selectedBlockerId ||
            attackerIds.includes(unit.instanceId) ||
            assignedBlockerIds.includes(unit.instanceId) ||
            selectedCostUnitIds.includes(unit.instanceId)
          }
          onClick={
            canSelectWaitingUnit(playerId)
              ? () => selectBoardUnit(playerId, unit)
              : undefined
          }
        />
      </div>
    );
  }

  function startRound() {
    if (!canControl(gameState.priorityPlayerId)) {
      return;
    }

    setSelectedBlockerId(undefined);
    clearSelectedCard();
    dispatch(
      { type: "START_ROUND" },
      "Round advanced. Mana refilled and attack token rotated."
    );
  }

  function renderActiveUnit(playerId: PlayerId, unit: UnitInstance, _index: number) {
    const lane = gameState.combat.attackers.find(
      (candidate) => candidate.blockerId === unit.instanceId
    );
    const canToggleAttacker =
      playerId === attackPlayerId &&
      gameState.phase === "ACTION" &&
      gameState.priorityPlayerId === attackPlayerId &&
      gameState.attackTokenAvailable;
    const canSelectDefender =
      playerId === defenderId &&
      gameState.phase === "BLOCK" &&
      gameState.priorityPlayerId === defenderId;
    const canSelectForSpell = canSelectSpellUnit(playerId);

    return (
      <div className="active-unit-card" data-effect-target-id={unit.instanceId}>
        <GameCard
          unit={unit}
          compact
          selected={
            unit.instanceId === selectedBlockerId ||
            attackerIds.includes(unit.instanceId) ||
            assignedBlockerIds.includes(unit.instanceId) ||
            selectedCostUnitIds.includes(unit.instanceId)
          }
          onClick={
            canToggleAttacker || canSelectDefender || canSelectForSpell
              ? () => selectBoardUnit(playerId, unit)
              : undefined
          }
          visualEvents={gameState.visualEvents.filter(
            (event) =>
              (event as any).targetId === unit.instanceId ||
              (event as any).sourceId === unit.instanceId
          )}
        />
        {playerId === defenderId && lane ? (
          <div className="damage-preview">
            {(() => {
              const attacker = gameState.players[attackPlayerId].board.find(
                (candidate) => candidate.instanceId === lane.attackerId
              );
              if (!attacker) {
                return "No damage";
              }
              const preview = getDamagePreview(attacker, unit);
              const parts = [];
              if (preview.attackerTakes > 0) parts.push(`Atk ${preview.attackerTakes}`);
              if (preview.blockerTakes > 0) parts.push(`Blk ${preview.blockerTakes}`);
              if (preview.nexusTakes > 0) parts.push(`Nexus ${preview.nexusTakes}`);
              return parts.length > 0 ? parts.join(" · ") : "No damage";
            })()}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <HoverProvider>
      <main className="app-shell board-layout bg-dungeon">
        <div className="utility-dock" aria-label="Utility panels">
          <button
            type="button"
            className={openPanel === "log" ? "is-active" : ""}
            onClick={() => setOpenPanel(openPanel === "log" ? undefined : "log")}
            aria-label="Open action log"
          >
            <List size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={openPanel === "dev" ? "is-active" : ""}
            onClick={() => setOpenPanel(openPanel === "dev" ? undefined : "dev")}
            aria-label="Open dev tools"
          >
            <Settings size={18} aria-hidden="true" />
          </button>
          {localPlayerId ? (
            <button
              type="button"
              className="utility-dock__surrender"
              onClick={surrender}
              disabled={!gameState.started || Boolean(gameState.winnerId)}
            >
              Đầu hàng
            </button>
          ) : null}
        </div>

        {connectionStatus && !opponentConnected ? (
          <div className="opponent-disconnected-notice" role="status">
            Đối thủ đã mất kết nối. Đang chờ kết nối lại...
          </div>
        ) : null}

        {openPanel ? (
          <aside className="floating-utility-panel" aria-label={openPanel === "log" ? "Action log" : "Dev tools"}>
            <button
              type="button"
              className="panel-close panel-close--floating"
              onClick={() => setOpenPanel(undefined)}
              aria-label="Close panel"
            >
              <X size={16} aria-hidden="true" />
            </button>
            {openPanel === "log" ? (
              <ActionLog entries={actionLog} />
            ) : (
              <>
                {connectionStatus ? (
                  <section className="quick-controls multiplayer-status" aria-label="Connection">
                    <strong>Multiplayer</strong>
                    <span>{connectionStatus}</span>
                    {localPlayerId ? <span>You are {localPlayerId}</span> : null}
                    {!opponentConnected ? (
                      <span>Đối thủ đã mất kết nối. Đang chờ kết nối lại...</span>
                    ) : null}
                  </section>
                ) : null}
                <section className="quick-controls" aria-label="Game controls">
                  <div className="button-row">
                    <button
                      type="button"
                      onClick={() => dispatch({ type: "START_GAME", firstPlayerId: "P1" })}
                      disabled={gameState.started || Boolean(localPlayerId && localPlayerId !== "P1")}
                    >
                      <Zap size={16} aria-hidden="true" /> Start
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "DRAW_CARD", playerId: gameState.priorityPlayerId })
                      }
                      disabled={
                        !gameState.started ||
                        Boolean(gameState.winnerId) ||
                        !canControl(gameState.priorityPlayerId)
                      }
                    >
                      Draw
                    </button>
                    <button
                      type="button"
                      onClick={passPriority}
                      disabled={
                        !gameState.started ||
                        Boolean(gameState.winnerId) ||
                        gameState.phase !== "ACTION" ||
                        !canControl(gameState.priorityPlayerId)
                      }
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={startRound}
                      disabled={
                        !gameState.started ||
                        Boolean(gameState.winnerId) ||
                        gameState.phase !== "ACTION" ||
                        !canControl(gameState.priorityPlayerId)
                      }
                    >
                      <RotateCcw size={16} aria-hidden="true" /> Round
                    </button>
                    <button type="button" onClick={resetGame}>
                      Reset
                    </button>
                  </div>
                </section>
              </>
            )}
          </aside>
        ) : null}

        {viewingGraveyard ? (
          <GraveyardPickerModal
            playerId={viewingGraveyard}
            entries={gameState.players[viewingGraveyard].graveyard}
            selectedCardInstanceId={
              selectedSpellTarget?.type === "GRAVEYARD" &&
                selectedSpellTarget.playerId === viewingGraveyard
                ? selectedSpellTarget.cardInstanceId
                : undefined
            }
            canSelect={canSelectGraveyardCard(viewingGraveyard)}
            allowedTypes={getGraveyardAllowedTypes()}
            onSelectCard={(cardInstanceId) =>
              selectGraveyardCard(viewingGraveyard, cardInstanceId)
            }
            onClose={clearSelectedCard}
          />
        ) : null}

        {championEntrance ? (
          <div className="champion-entrance-overlay" aria-live="polite">
            <div
              className={`champion-entrance-card champion-entrance-card--${championEntrance.ownerId.toLowerCase()}`}
            >
              {championEntrance.imageUrl ? (
                <span
                  className="champion-entrance-art"
                  style={{ backgroundImage: `url(${championEntrance.imageUrl})` }}
                  aria-hidden="true"
                />
              ) : (
                <span className="champion-entrance-art champion-entrance-art--empty" aria-hidden="true" />
              )}
              <span
                className="champion-entrance-copy"
                style={
                  {
                    "--champion-name-length": championEntrance.name.length
                  } as React.CSSProperties
                }
              >
                <strong>{championEntrance.name}</strong>
                <small>
                  ATK {championEntrance.attack ?? "-"} / HP {championEntrance.health ?? "-"}
                </small>
              </span>
            </div>
          </div>
        ) : null}

        {afkNotice ? (
          <div className={`afk-notice afk-notice--${afkNotice.level}`} role="alert">
            <span>{afkNotice.message}</span>
            <button type="button" onClick={() => setAfkNotice(undefined)} aria-label="Đóng cảnh báo AFK">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        <section ref={battleTableRef} className="battle-table lor-table" aria-label="Local battle board">
          {gameState.winnerId ? (
            <header className="topbar compact-topbar">
              <div className="winner-banner">{gameState.winnerId} wins.</div>
            </header>
          ) : null}

          <Hand
            cards={gameState.players.P2.hand}
            side="opponent"
            hidden={shouldHideHand("P2")}
            selectedCardId={
              selectedSpell?.ownerId === "P2" ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay("P2", card)}
            onPlayCard={(card) => playCard("P2", card)}
            onPreviewCard={(card) => setPreviewCard(card)}
          />

          <div className="arena-grid">
            <div className="side-counters">
              {renderGraveyard("P2", "GY")}
              {renderDeckStack("P2", "Deck")}
              {renderDeckStack("P1", "Deck")}
              {renderGraveyard("P1", "GY")}
            </div>

            <div className="center-board">
              <BoardRow
                playerId="P2"
                rowType="waiting"
                units={getRecallUnits("P2")}
                isEnemy={true}
                selectedUnitIds={[
                  ...(attackPlayerId === "P2" ? attackerIds : assignedBlockerIds),
                  ...selectedCostUnitIds
                ]}
                renderUnit={(unit) => renderWaitingUnit("P2", unit)}
              />

              <BoardRow
                playerId="P2"
                rowType="active"
                units={getActiveUnits("P2")}
                isEnemy={true}
                isEmptySlotEnabled={
                  "P2" === defenderId &&
                  gameState.phase === "BLOCK" &&
                  gameState.priorityPlayerId === defenderId &&
                  Boolean(selectedBlockerId)
                    ? (index) => {
                      const lane = gameState.combat.attackers[index];
                      return Boolean(lane && !lane.blockerId);
                    }
                    : undefined
                }
                onEmptySlotClick={
                  "P2" === defenderId &&
                  gameState.phase === "BLOCK" &&
                  gameState.priorityPlayerId === defenderId &&
                  Boolean(selectedBlockerId)
                    ? (index) => {
                      const lane = gameState.combat.attackers[index];
                      if (!lane || lane.blockerId || !selectedBlockerId) {
                        return;
                      }

                      const attacker = gameState.players[attackPlayerId].board.find(
                        (candidate) => candidate.instanceId === lane.attackerId
                      );
                      if (attacker) {
                        assignBlocker(attacker, selectedBlockerId);
                      }
                    }
                    : undefined
                }
                renderUnit={(unit, index) => renderActiveUnit("P2", unit, index)}
              />

              <div className="combat-status-bar">
                <CenterInfo state={gameState} timeRemainingMs={timeRemainingMs} />
                {gameState.pendingDiscard ? (
                  <span className="stat-pill">
                    Discard{" "}
                    <strong>
                      {gameState.pendingDiscard.playerId}{" "}
                      {gameState.players[gameState.pendingDiscard.playerId].hand.length}/
                      {gameState.pendingDiscard.downTo}
                    </strong>
                  </span>
                ) : null}
                {gameState.phase === "BLOCK" && attackerCount > 0 ? (
                  <span className="stat-pill">
                    <Swords size={12} aria-hidden="true" /> <strong>{attackerCount}</strong> attacking
                  </span>
                ) : null}
                {selectedBlocker ? (
                  <span className="stat-pill">
                    <Shield size={12} aria-hidden="true" /> <strong>{unitDef(selectedBlocker).name}</strong>
                  </span>
                ) : null}
              </div>

              <BoardRow
                playerId="P1"
                rowType="active"
                units={getActiveUnits("P1")}
                isEnemy={false}
                isEmptySlotEnabled={
                  "P1" === defenderId &&
                  gameState.phase === "BLOCK" &&
                  gameState.priorityPlayerId === defenderId &&
                  Boolean(selectedBlockerId)
                    ? (index) => {
                      const lane = gameState.combat.attackers[index];
                      return Boolean(lane && !lane.blockerId);
                    }
                    : undefined
                }
                onEmptySlotClick={
                  "P1" === defenderId &&
                  gameState.phase === "BLOCK" &&
                  gameState.priorityPlayerId === defenderId &&
                  Boolean(selectedBlockerId)
                    ? (index) => {
                      const lane = gameState.combat.attackers[index];
                      if (!lane || lane.blockerId || !selectedBlockerId) {
                        return;
                      }

                      const attacker = gameState.players[attackPlayerId].board.find(
                        (candidate) => candidate.instanceId === lane.attackerId
                      );
                      if (attacker) {
                        assignBlocker(attacker, selectedBlockerId);
                      }
                    }
                    : undefined
                }
                renderUnit={(unit, index) => renderActiveUnit("P1", unit, index)}
              />

              <BoardRow
                playerId="P1"
                rowType="waiting"
                units={getRecallUnits("P1")}
                isEnemy={false}
                selectedUnitIds={[
                  ...(attackPlayerId === "P1" ? attackerIds : assignedBlockerIds),
                  ...selectedCostUnitIds
                ]}
                renderUnit={(unit) => renderWaitingUnit("P1", unit)}
              />
            </div>

            <div className="status-column">
              <NexusPanel
                playerId="P2"
                player={gameState.players.P2}
                label="Nexus"
                isAttacker={gameState.attackTokenPlayerId === "P2"}
                hasPriority={gameState.priorityPlayerId === "P2"}
                attackTokenAvailable={gameState.attackTokenAvailable}
                resourcePreview={
                  previewCard?.ownerId === "P2"
                    ? getResourcePreview("P2", previewCard)
                    : selectedSpell?.ownerId === "P2"
                      ? getResourcePreview("P2", selectedSpell)
                      : { manaUsed: 0, spellManaUsed: 0 }
                }
              />
              {renderSpellStack("Spell")}
              {(() => {
                const action = getSmartAction();
                return (
                  <PassButton
                    mode={action.mode}
                    label={action.label}
                    sublabel={action.sublabel}
                    enabled={action.enabled}
                    onClick={action.onClick}
                  />
                );
              })()}
              {renderSpellStack("Spell")}
              <NexusPanel
                playerId="P1"
                player={gameState.players.P1}
                label="Nexus"
                isAttacker={gameState.attackTokenPlayerId === "P1"}
                hasPriority={gameState.priorityPlayerId === "P1"}
                attackTokenAvailable={gameState.attackTokenAvailable}
                resourcePreview={
                  previewCard?.ownerId === "P1"
                    ? getResourcePreview("P1", previewCard)
                    : selectedSpell?.ownerId === "P1"
                      ? getResourcePreview("P1", selectedSpell)
                      : { manaUsed: 0, spellManaUsed: 0 }
                }
              />
            </div>
          </div>

          <Hand
            cards={gameState.players.P1.hand}
            side="player"
            hidden={shouldHideHand("P1")}
            selectedCardId={
              selectedSpell?.ownerId === "P1" ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay("P1", card)}
            onPlayCard={(card) => playCard("P1", card)}
            onPreviewCard={(card) => setPreviewCard(card)}
          />

          {selectedSpell ? (
            <section className="spell-panel floating-spell-panel" aria-label="Selected spell">
              <div className="spell-summary">
                <strong>{cardDef(selectedSpell).name}</strong>
                <span>
                  Target:{" "}
                  {cardDef(selectedSpell).type === "unit" ||
                    cardDef(selectedSpell).type === "champion" ||
                    cardDef(selectedSpell).type === "spell"
                    ? describeSelectedCardPrompt(selectedSpell, selectedCostTargets)
                    : selectedSpellTarget
                      ? describeSpellTarget(selectedSpellTarget)
                      : describeSelectedCardPrompt(selectedSpell, selectedCostTargets)}
                </span>
              </div>
              <div className="button-row">
                {cardDef(selectedSpell).type === "spell" ? (
                  <button
                    type="button"
                    onClick={castSelectedSpell}
                    disabled={!selectedSpellTarget}
                  >
                    Cast Spell
                  </button>
                ) : null}
              </div>
            </section>
          ) : null}

          <SpellEffectLayer events={gameState.visualEvents} stageRef={battleTableRef} />
        </section>

        <DetailPanel />

        {renderPendingDiscard()}
        {renderPendingChoice()}
      </main>
    </HoverProvider>
  );
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function describeNeededTarget(targetKind: SpellTargetKind | undefined): string {
  switch (targetKind) {
    case "ALLY_UNIT":
      return "click an allied unit";
    case "ENEMY_UNIT":
      return "click an enemy unit";
    case "NEXUS":
      return "nexus";
    case "SELF":
      return "self";
    case "ALLY_GRAVEYARD":
      return "click a card in your graveyard";
    case "ENEMY_GRAVEYARD":
      return "click a card in enemy graveyard";
    default:
      return "none";
  }
}

function describeSelectedCardPrompt(card: CardInstance, costTargets: SpellTarget[]): string {
  const definition = getCardDefinition(card.cardId);
  const cost = definition.additionalCost;
  if (cost?.type === "SACRIFICE_UNITS" && costTargets.length < cost.count) {
    return `choose allied unit ${costTargets.length + 1}/${cost.count} to sacrifice`;
  }

  if (definition.type === "unit" || definition.type === "champion") {
    return "click one of your 6 units to replace it";
  }

  return describeNeededTarget(definition.effects?.[0]?.target as SpellTargetKind | undefined);
}

function describeAbilityTargetNeed(targetDefinition: TargetDefinition | undefined): string {
  if (!targetDefinition) {
    return "Resolve ability choice";
  }

  switch (targetDefinition.kind) {
    case "ALLY_UNIT":
      return "Choose an allied unit";
    case "ENEMY_UNIT":
      return "Choose an enemy unit";
    case "ANY_UNIT":
    case "ANY_TARGET":
      return "Choose a unit";
    case "ALLY_NEXUS":
      return "Choose your nexus";
    case "ENEMY_NEXUS":
      return "Choose the enemy nexus";
    case "SELF":
      return "Choose self";
    case "ALLY_DECK_CARD":
      return "Choose a card from your deck";
    case "ANY_DECK_CARD":
      return "Choose a card from a deck";
    case "ALLY_HAND_CARD":
      return "Choose a card in your hand";
    case "ENEMY_HAND_CARD":
      return "Choose a card in enemy hand";
    case "ANY_HAND_CARD":
      return "Choose a hand card";
    case "ALLY_GRAVEYARD":
      return "Choose an allied unit or champion from the graveyard";
    case "ENEMY_GRAVEYARD":
      return "Choose an enemy unit or champion from the graveyard";
    case "ANY_GRAVEYARD":
      return "Choose a unit or champion from a graveyard";
  }
}

function describeSpellTarget(target: SpellTarget): string {
  switch (target.type) {
    case "UNIT":
      return `${target.playerId} unit`;
    case "NEXUS":
      return `${target.playerId} nexus`;
    case "SELF":
      return `${target.playerId}`;
    case "GRAVEYARD":
      return `${target.playerId} graveyard`;
    case "DECK_CARD":
      return `${target.playerId} deck card`;
    case "HAND_CARD":
      return `${target.playerId} hand card`;
  }
}
