"use client";

import { BookOpen, ChevronLeft, ChevronRight, Flag, FlaskConical, Gauge, House, List, LogOut, Plus, RotateCcw, Search, Settings, Skull, Swords, Trophy, X, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  AbilityTargetMap,
  CardInstance,
  GraveyardEntryType,
  PlayerId,
  SpellTarget,
  SpellTargetKind,
  UnitInstance,
  VisualEvent
} from "@backend/game/types";
import { useLocalGame } from "../../hooks/useLocalGame";
import type { GameAction } from "@backend/game/types";
import { ActionLog } from "./ActionLog";
import { ChatPanel } from "./chat/ChatPanel";
import { ChatToggle } from "./chat/ChatToggle";
import type { ChatController } from "./chat/chatTypes";
import { useChatUnread } from "./chat/useChatUnread";
import { GameCard } from "./cards/game-card";
import { TurnRail } from "./zones/turn-rail";
import { Hand } from "./zones/hand";
import { NexusPanel } from "./hud/nexus/nexus-panel";
import { PassButton } from "./hud/passButton/pass-button";
import { ActionPrompt } from "./hud/action-prompt";
import { deriveTurnRail } from "./hud/infoBoard/turnRail";
import { getUnitAttack, getUnitHealth, isChampionCard } from "@backend/game/entities/cards";
import { OPPONENT_CLAIM_DELAY_MS, turnDeadline } from "@backend/game/rules/turnClock";
import { serverNow } from "../../libs/serverClock";
import { afkWarningKey } from "./hud/afkNoti/afkWarning";
import { HoverProvider, useHover } from "../../contexts/HoverContext";
import { CardInspector } from "./hud/inspector/card-inspector";
import { GraveyardPickerModal } from "./GraveyardPickerModal";
import { PendingAbilityTargetDialog } from "./PendingAbilityTargetDialog";
import { PendingDiscardDialog } from "./PendingDiscardDialog";
import { DeckPile, GraveyardPile } from "./hud/side-piles";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import { useBattleMusic } from "../../hooks/useBattleMusic";
import { useTurnTickSound } from "../../hooks/useTurnTickSound";
import { useTurnAnnouncement } from "../../hooks/useTurnAnnouncement";
import { useGlobalAudio } from "../../contexts/AudioContext";
import { DeveloperResourcesPanel } from "./DeveloperResourcesPanel";
import type { RoomUpdate } from "@backend/shared/multiplayer";
import { PhaserArenaCanvas } from "./phaser/PhaserArenaCanvas";
import { arenaEventBus } from "../../libs/arenaEventBus";
import { combatCues, cueSnapshot, type CueSnapshot } from "./phaser/config/combatCues";
import { useGameStore } from "../../hooks/useGameStore";
import { SpellEffectLayer } from "./spell-effect-layer";
import { GiEvilEyes } from "react-icons/gi";
import { FaEyeSlash } from "react-icons/fa";
import { AnimatePresence } from "framer-motion";
import { AfkToastNotification } from "./hud/afkNoti/AfkToastNotification";
import { Button } from "../ui/button";
import { BoardDialog, Modal } from "../ui/modal";
import { playBlockReason, type PlayBlock, BLOCK_TEXT } from "./zones/playBlock";
import { NoticeCard } from "../ui/feedback";

const MATCH_RESULT_RETURN_SECONDS = 20;

interface Props {
  controller: GameController;
}

export interface GameController {
  gameState: ReturnType<typeof useLocalGame>["gameState"];
  actionLog: ReturnType<typeof useLocalGame>["actionLog"];
  dispatch: ReturnType<typeof useLocalGame>["dispatch"];
  dispatchChain: ReturnType<typeof useLocalGame>["dispatchChain"];
  resetGame: ReturnType<typeof useLocalGame>["resetGame"];
  setDeveloperResources?: ReturnType<typeof useLocalGame>["setDeveloperResources"];
  runTrialCommand?: ReturnType<typeof useLocalGame>["runTrialCommand"];
  playerProfiles?: RoomUpdate["players"];
  /** Present in online matches (duel, custom room); the chat button is hidden without it. */
  chat?: ChatController;
  /** The server clock less the browser clock, so the turn timer reads the server's time. Zero when they agree. */
  clockOffsetMs?: number;
}

interface GameBoardViewProps {
  controller: GameController;
  localPlayerId?: PlayerId;
  connectionStatus?: string;
  opponentConnected?: boolean;
  trialMode?: boolean;
  onExitTrial?: () => void;
}

function PhaserHoverBridge({ gameState }: { gameState: ReturnType<typeof useLocalGame>["gameState"] }) {
  const { setHoveredCard, selectCard } = useHover();

  useEffect(() => {
    const stopHover = arenaEventBus.on("HOVER_UNIT", (entity) => {
      const unit = entity
        ? gameState.players[entity.playerId].board.find((candidate) => candidate.instanceId === entity.unitId)
        : undefined;
      setHoveredCard(undefined, unit, entity ? () => entity.anchor : undefined);
    });
    // A right click on a card of the table pins it, which opens its codex.
    const stopInspect = arenaEventBus.on("INSPECT_UNIT", ({ playerId, unitId }) => {
      const unit = gameState.players[playerId].board.find((candidate) => candidate.instanceId === unitId);
      if (unit) selectCard(undefined, unit);
    });
    return () => {
      stopHover();
      stopInspect();
    };
  }, [gameState, setHoveredCard, selectCard]);

  return null;
}

export function GameBoard({ controller }: Props) {
  // const controller = useLocalGame();
  return <GameBoardView controller={controller} />;
}

export function GameBoardView({
  controller,
  localPlayerId,
  connectionStatus,
  opponentConnected = true,
  trialMode = false,
  onExitTrial
}: GameBoardViewProps) {
  const { gameState, actionLog, dispatch, dispatchChain, resetGame, setDeveloperResources, runTrialCommand, playerProfiles, clockOffsetMs, chat } = controller;
  useBattleMusic(gameState);
  const [selectedBlockerId, setSelectedBlockerId] = useState<string>();
  const [selectedSpell, setSelectedSpell] = useState<CardInstance>();
  const [selectedSpellTarget, setSelectedSpellTarget] = useState<SpellTarget>();
  const [selectedCostTargets, setSelectedCostTargets] = useState<SpellTarget[]>([]);
  const [viewingGraveyard, setViewingGraveyard] = useState<PlayerId>();
  const [openPanel, setOpenPanel] = useState<"log" | "dev" | "resources" | "chat" | undefined>();
  const chatUnread = useChatUnread(chat?.messages ?? [], localPlayerId, openPanel === "chat");
  const [showExitTrialDialog, setShowExitTrialDialog] = useState(false);
  const [trialConsoleOpen, setTrialConsoleOpen] = useState(true);
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);
  // A champion is declared only after the player has confirmed it in a dialog of the game.
  const [championConfirm, setChampionConfirm] = useState<{ playerId: PlayerId; card: CardInstance }>();
  const [resultReturnSeconds, setResultReturnSeconds] = useState(MATCH_RESULT_RETURN_SECONDS);
  const developerToolsEnabled = process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === "true";
  const canEditDeveloperResources = developerToolsEnabled && Boolean(setDeveloperResources);
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
  const timeoutTurnKeyRef = useRef<string | undefined>(undefined);
  const opponentTimeoutTurnKeyRef = useRef<string | undefined>(undefined);
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const battleTableRef = useRef<HTMLElement>(null);
  const [afkNotice, setAfkNotice] = useState<{
    level: "warning" | "danger";
    message: string;
  }>();
  const lastHandledAfkWarningRef = useRef<string | undefined>(undefined);
  const dismissAfkNotice = useCallback(() => {
    setAfkNotice(undefined);
  }, []);
  const [targetError, setTargetError] = useState<string>();
  const dismissTargetError = useCallback(() => {
    setTargetError(undefined);
  }, []);
  const targetErrorTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const previousArenaUnitIdsRef = useRef<Set<string>>(new Set());
  const previousCueRef = useRef<CueSnapshot | undefined>(undefined);
  const { playSfx } = useGlobalAudio();

  const showTargetError = (message: string) => {
    if (targetErrorTimeoutRef.current) {
      clearTimeout(targetErrorTimeoutRef.current);
    }
    setTargetError(message);
    targetErrorTimeoutRef.current = setTimeout(() => {
      setTargetError(undefined);
      targetErrorTimeoutRef.current = undefined;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (targetErrorTimeoutRef.current) {
        clearTimeout(targetErrorTimeoutRef.current);
      }
    };
  }, []);

  const previousChampionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!showExitTrialDialog && !showSurrenderDialog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowExitTrialDialog(false);
        setShowSurrenderDialog(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showExitTrialDialog, showSurrenderDialog]);
  const viewerPlayerId: PlayerId = localPlayerId ?? "P1";
  const opponentPlayerId = opponentOf(viewerPlayerId);

  // The bridge mirrors only presentation data. The existing controller remains
  // the single source of truth for websocket updates and game actions.
  useEffect(() => {
    useGameStore.getState().syncGameState(gameState, viewerPlayerId);
    arenaEventBus.emit("UPDATE_SLOTS", { gameState, viewerPlayerId });

    const unitIds = new Set(
      (["P1", "P2"] as PlayerId[]).flatMap((playerId) =>
        gameState.players[playerId].board.map((unit) => unit.instanceId)
      )
    );
    unitIds.forEach((unitId) => {
      if (!previousArenaUnitIdsRef.current.has(unitId)) {
        arenaEventBus.emit("SUMMON_UNIT", { unitId });
      }
    });
    previousArenaUnitIdsRef.current.forEach((unitId) => {
      if (!unitIds.has(unitId)) {
        arenaEventBus.emit("DESTROY_UNIT", { unitId });
      }
    });
    previousArenaUnitIdsRef.current = unitIds;

    // Only the big moments shake the screen: a champion declared, the attack committed, the blocks committed.
    const championIds = new Set(
      (["P1", "P2"] as PlayerId[]).flatMap((playerId) =>
        gameState.players[playerId].board
          .filter((unit) => hasCard(unit.cardId) && getCardDefinition(unit.cardId).type === "champion")
          .map((unit) => unit.instanceId)
      )
    );
    const cueNow = cueSnapshot(gameState, (unitId) => championIds.has(unitId));
    const cues = combatCues(previousCueRef.current, cueNow);
    previousCueRef.current = cueNow;
    cues.champions.forEach((unitId) => arenaEventBus.emit("CHAMPION_DECLARED", { unitId }));
    if (cues.commit) arenaEventBus.emit("COMMIT_CUE", cues.commit);
    if (cues.attackers.length > 0) playSfx("blade_draw");
    if (cues.blockers.length > 0) playSfx("gate_lock");

    const stopSelect = arenaEventBus.on("SELECT_UNIT", ({ playerId, unitId }) => {
      const unit = gameState.players[playerId].board.find((candidate) => candidate.instanceId === unitId);
      if (unit) selectBoardUnit(playerId, unit);
    });
    const stopEmptySlot = arenaEventBus.on("EMPTY_SLOT_CLICK", ({ playerId, index }) => {
      if (
        playerId !== defenderId ||
        gameState.phase !== "BLOCK" ||
        gameState.priorityPlayerId !== defenderId ||
        !selectedBlockerId
      ) return;
      const lane = gameState.combat.attackers[index];
      if (!lane || lane.blockerId) return;
      const attacker = gameState.players[attackPlayerId].board.find(
        (candidate) => candidate.instanceId === lane.attackerId
      );
      if (attacker) assignBlocker(attacker, selectedBlockerId);
    });
    return () => {
      stopSelect();
      stopEmptySlot();
    };
  }, [gameState, viewerPlayerId, selectedBlockerId, selectedSpell, selectedCostTargets]);

  // Target selection is presentation state only. The authoritative action is
  // still emitted by castSelectedSpell after the engine-valid target is picked.
  // Phaser uses this signal to highlight the real lane cards instead of
  // presenting a second, stale React card list.
  useEffect(() => {
    const targetKind =
      selectedSpell && !selectedSpellTarget && !viewingGraveyard
        ? getPrimarySpellTarget(selectedSpell)
        : undefined;
    const unitTargetKind =
      targetKind === "ALLY_UNIT" || targetKind === "ENEMY_UNIT" ? targetKind : undefined;
    
    // Calculate target color based on target kind
    const targetColor = unitTargetKind === "ALLY_UNIT" ? "ALLY" as const 
      : unitTargetKind === "ENEMY_UNIT" ? "ENEMY" as const 
      : undefined;

    arenaEventBus.emit("TARGETING_CHANGED", {
      targetKind: unitTargetKind,
      playerId: unitTargetKind ? (selectedSpell?.ownerId || viewerPlayerId || localPlayerId || "P1") : undefined,
    });

    return () => {
      arenaEventBus.emit("TARGETING_CHANGED", { targetKind: undefined });
    };
  }, [selectedSpell, selectedSpellTarget, viewingGraveyard]);

  // The blocker the player has picked stays raised and ringed on the table until a lane takes it (or it is dropped).
  useEffect(() => {
    arenaEventBus.emit("UNIT_PICKED", { unitId: selectedBlockerId });
  }, [selectedBlockerId]);
  useEffect(() => () => arenaEventBus.emit("UNIT_PICKED", { unitId: undefined }), []);

  // A remote priority/phase transition invalidates any local targeting UI.
  // Do not leave a stale Phaser highlight active after the authoritative state
  // has moved on to BLOCK, DISCARD, or a finished match.
  useEffect(() => {
    if (gameState.phase !== "ACTION" || gameState.winnerId) {
      setSelectedSpell(undefined);
      setSelectedSpellTarget(undefined);
      setSelectedCostTargets([]);
      setViewingGraveyard(undefined);
    }
  }, [gameState.phase, gameState.winnerId]);

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
  const getPlayerName = (playerId: PlayerId) =>
    playerProfiles?.[playerId]?.username?.trim() || `Player ${playerId === "P1" ? "One" : "Two"}`;
  const getPlayerProfile = (playerId: PlayerId) => playerProfiles?.[playerId];
  const turnRail = deriveTurnRail({
    state: gameState,
    viewerId: viewerPlayerId,
    callsigns: { P1: getPlayerName("P1"), P2: getPlayerName("P2") },
    remainingMs: timeRemainingMs
  });
  // Ticks only while the viewer can still act in the turn that is running out.
  useTurnTickSound(
    turnRail.owner === "you" && turnRail.started && !gameState.winnerId,
    turnRail.urgency,
    turnRail.seconds
  );
  useTurnAnnouncement(turnRail, Boolean(gameState.winnerId));
  const winnerId = gameState.winnerId;
  const isViewerWinner = Boolean(winnerId && winnerId === viewerPlayerId);
  const winnerName = winnerId ? getPlayerName(winnerId) : "";
  const winnerAvatar = winnerId ? getPlayerProfile(winnerId)?.avatar : undefined;
  const winnerInitial = winnerName.slice(0, 1).toUpperCase() || "?";

  useEffect(() => {
    if (!winnerId || !localPlayerId) {
      setResultReturnSeconds(MATCH_RESULT_RETURN_SECONDS);
      return;
    }

    const deadline = Date.now() + MATCH_RESULT_RETURN_SECONDS * 1_000;
    const updateCountdown = () => {
      setResultReturnSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1_000)));
    };
    updateCountdown();

    const interval = window.setInterval(updateCountdown, 250);
    const redirect = window.setTimeout(() => {
      window.location.assign("/");
    }, MATCH_RESULT_RETURN_SECONDS * 1_000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(redirect);
    };
  }, [localPlayerId, winnerId]);

  const leaveToLobby = () => {
    window.location.assign("/");
  };

  const startAnotherDuel = () => {
    if (!localPlayerId) {
      resetGame();
      return;
    }

    // A full navigation closes the finished room before a fresh matchmaking connection starts.
    window.location.assign("/play");
  };

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
      setTimeRemainingMs(Math.min(
        gameState.turnDuration,
        Math.max(0, gameState.turnDuration - (serverNow(clockOffsetMs) - gameState.turnStartTime))
      ));
    };
    updateCountdown();
    const interval = window.setInterval(updateCountdown, 100);
    return () => window.clearInterval(interval);
  }, [gameState.turnDuration, gameState.turnStartTime, clockOffsetMs]);

  useEffect(() => {
    // The local trial already owns its timer in useLocalGame. Online matches
    // need one client-side signal at expiry so they do not depend on the
    // asynchronous scheduler for the visible turn transition.
    if (
      trialMode ||
      !localPlayerId ||
      !gameState.started ||
      Boolean(gameState.winnerId) ||
      gameState.priorityPlayerId !== localPlayerId
    ) {
      return;
    }

    const deadline = gameState.turnStartTime + gameState.turnDuration;
    // timeRemainingMs starts at zero before the countdown effect's first tick;
    // the authoritative timestamp prevents an immediate false timeout when
    // the board mounts during the match-found/showcase handoff.
    if (timeRemainingMs > 0 || serverNow(clockOffsetMs) < deadline) return;

    const turnKey = `${gameState.turnStartTime}:${gameState.turnDuration}:${gameState.priorityPlayerId}`;
    if (timeoutTurnKeyRef.current === turnKey) return;
    timeoutTurnKeyRef.current = turnKey;

    // The server remains authoritative: it validates the deadline, player,
    // and state version before committing the timeout transition.
    if (!controller.dispatch({ type: "TIME_OUT", playerId: localPlayerId })) {
      // Allow a retry after a transient disconnect while the turn is still
      // represented by the same local state.
      timeoutTurnKeyRef.current = undefined;
    }
  }, [controller, gameState, localPlayerId, timeRemainingMs, trialMode, clockOffsetMs]);

  useEffect(() => {
    // Online matches only. When it is the opponent's turn and their clock has run out, they may have left, and
    // then nobody else would report it: after a short delay (so that they are heard first if they are still
    // here) this player reports it, once per turn. The server decides whether the turn really expired and who
    // timed out; a refused report is silent.
    if (
      trialMode ||
      !localPlayerId ||
      !gameState.started ||
      Boolean(gameState.winnerId) ||
      gameState.priorityPlayerId === localPlayerId
    ) {
      return;
    }

    const turnKey = `${gameState.turnStartTime}:${gameState.turnDuration}:${gameState.priorityPlayerId}`;
    const wait = turnDeadline(gameState) + OPPONENT_CLAIM_DELAY_MS - serverNow(clockOffsetMs);
    const timer = window.setTimeout(() => {
      if (opponentTimeoutTurnKeyRef.current === turnKey) return;
      opponentTimeoutTurnKeyRef.current = turnKey;
      controllerRef.current.dispatch({ type: "TIME_OUT", playerId: localPlayerId });
    }, Math.max(0, wait));
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    gameState.started,
    gameState.winnerId,
    gameState.priorityPlayerId,
    gameState.turnStartTime,
    gameState.turnDuration,
    localPlayerId,
    trialMode
  ]);

  useEffect(() => {
    const warning = gameState.visualEvents.find(
      (event): event is Extract<typeof event, { type: "AFK_WARNING" }> =>
        event.type === "AFK_WARNING" && event.playerId === localPlayerId
    );
    if (!warning) {
      return;
    }

    const warningKey = afkWarningKey(gameState, warning.afkCount);
    if (warningKey === lastHandledAfkWarningRef.current) {
      return;
    }
    lastHandledAfkWarningRef.current = warningKey;

    setAfkNotice(
      warning.afkCount === 1
        ? { level: "warning", message: "You missed your turn. Your next turn will be limited to 15 seconds." }
        : {
          level: "danger",
          message: "AFK warning! You will lose the match if you stay inactive next turn."
        }
    );
  }, [gameState, localPlayerId]);

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

  /** Why a card that cannot be played is blocked (nothing for a card that can be). */
  function playBlock(playerId: PlayerId, card: CardInstance): PlayBlock | undefined {
    if (canPlay(playerId, card)) return undefined;
    const player = gameState.players[playerId];
    const definition = cardDef(card);
    return playBlockReason({
      controllable: canControl(playerId) && !shouldHideHand(playerId),
      started: gameState.started,
      over: Boolean(gameState.winnerId),
      inAction: gameState.phase === "ACTION",
      hasPriority: gameState.priorityPlayerId === playerId,
      mana: player.mana,
      spellMana: player.spellMana,
      cost: definition.cost,
      isSpell: definition.type === "spell"
    });
  }

  function surrender() {
    if (!localPlayerId) return;
    dispatch({ type: "SURRENDER", playerId: localPlayerId });
    setShowSurrenderDialog(false);
  }

  function playCard(playerId: PlayerId, card: CardInstance, championConfirmed = false) {
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

    if ((isChampionCard(definition) || definition.supertype?.toLowerCase() === "champion") && !championConfirmed) {
      setChampionConfirm({ playerId, card });
      return;
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
      const targetEffect = (cardDef(card).effects ?? []).find((effect) =>
        effect.target === "NEXUS" || effect.target === "ALLY_NEXUS" || effect.target === "ENEMY_NEXUS"
      );
      const targetPlayerId =
        targetEffect?.target === "ALLY_NEXUS" ||
        (targetEffect?.target !== "ENEMY_NEXUS" && targetEffect?.type === "HEAL")
          ? playerId
          : opponentOf(playerId);
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

  function getPrimarySpellTarget(card: CardInstance): SpellTargetKind | undefined {
    const effects = cardDef(card).effects ?? [];
    const target = effects
      .map((effect) => effect.target)
      .find((candidate) =>
        candidate === "ENEMY_UNIT" ||
        candidate === "ALLY_UNIT" ||
        candidate === "NEXUS" ||
        candidate === "ALLY_NEXUS" ||
        candidate === "ENEMY_NEXUS" ||
        candidate === "SELF" ||
        candidate === "ALLY_GRAVEYARD" ||
        candidate === "ENEMY_GRAVEYARD" ||
        candidate === "RECALL_UNIT"
      );

    if (target === "RECALL_UNIT") {
      return "ALLY_UNIT";
    }

    if (target === "ALLY_NEXUS" || target === "ENEMY_NEXUS") {
      return "NEXUS";
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
      const isTargetUnit = unitDef(unit).type === "unit";
      const isValidUnitTarget =
        isTargetUnit &&
        ((targetKind === "ALLY_UNIT" && playerId === casterId) ||
          (targetKind === "ENEMY_UNIT" && playerId !== casterId));

      if (!isValidUnitTarget) {
        showTargetError("Wrong target! Read the description of card and choose again");
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
        // The server commits blocks and resolves combat atomically. Two client
        // messages can race when API Gateway invokes separate Lambdas.
        onClick: () => {
          setSelectedBlockerId(undefined);
          clearSelectedCard();
          dispatch(
            { type: "COMMIT_BLOCKS", playerId: defenderId },
            `${defenderId} committed blocks. Combat resolved.`
          );
        }
      };
    }

    // ROUND: action phase — advance the round
    if (started && gameState.phase === "ACTION") {
      return {
        label: "PASS",
        sublabel: "End action",
        mode: "idle",
        enabled: canControl(gameState.priorityPlayerId),
        onClick: passPriority
      };
    }

    return {
      label: "WAITING",
      sublabel: getPlayerName(gameState.priorityPlayerId),
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

    setSelectedSpellTarget(target);
    setViewingGraveyard(undefined);
  }

  function getGraveyardAllowedTypes(): GraveyardEntryType[] | undefined {
    if (!selectedSpell) return undefined;
    const effects = cardDef(selectedSpell).effects ?? [];
    const gyEffect = effects.find(
      (effect) =>
        effect.type === "REVIVE_CARD" ||
        effect.type === "REBIRTH_CARD" ||
        effect.type === "BANISH_GRAVEYARD"
    );
    if (!gyEffect) return undefined;

    if ("allowedTypes" in gyEffect && gyEffect.allowedTypes && gyEffect.allowedTypes.length > 0) {
      return gyEffect.allowedTypes as GraveyardEntryType[];
    }

    if (gyEffect.type === "BANISH_GRAVEYARD" || gyEffect.type === "REBIRTH_CARD") {
      return ["UNIT", "CHAMPION", "SPELL"];
    }

    if (gyEffect.type === "REVIVE_CARD") {
      return ["UNIT", "CHAMPION"];
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

  function renderPendingDiscard() {
    const pendingDiscard = gameState.pendingDiscard;
    if (!pendingDiscard) {
      return null;
    }

    return (
      <PendingDiscardDialog
        playerName={getPlayerName(pendingDiscard.playerId)}
        hand={gameState.players[pendingDiscard.playerId].hand}
        downTo={pendingDiscard.downTo}
        canControl={!shouldHideHand(pendingDiscard.playerId)}
        onDiscard={(card) => playCard(pendingDiscard.playerId, card)}
      />
    );
  }

  function renderSpellConfirmation() {
    if (!selectedSpell || !selectedSpellTarget || cardDef(selectedSpell).type !== "spell") {
      return null;
    }

    return (
      <BoardDialog
        badge="Spell ready"
        title={cardDef(selectedSpell).name}
        titleId="spell-confirm-title"
        onClose={clearSelectedCard}
        actions={
          <>
            <Button chamfer size="md" tone="accent" onClick={clearSelectedCard}>
              Cancel
            </Button>
            <Button chamfer size="md" variant="accent" onClick={castSelectedSpell}>
              Cast Spell
            </Button>
          </>
        }
      >
        Target: {describeSpellTarget(selectedSpellTarget, getPlayerName)}
      </BoardDialog>
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
        playerId={playerId}
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

  /* Board units are rendered by PhaserArenaCanvas.
  function renderActiveUnitLegacy(playerId: PlayerId, unit: UnitInstance, _index: number) {
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
          board
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

  */
  return (
    <HoverProvider>
      <PhaserHoverBridge gameState={gameState} />
      <main className="app-shell board-layout">
        <div className={`utility-dock${trialMode ? " utility-dock--bare" : ""}`} aria-label="Utility panels">
          {trialMode ? (
            <Button
              data-ui-btn=""
              icon={<List size={18} />}
              onClick={() => setOpenPanel(openPanel === "log" ? undefined : "log")}
              aria-label="Open action log"
              aria-pressed={openPanel === "log"}
            />
          ) : (
            <button
              type="button"
              className={openPanel === "log" ? "is-active" : ""}
              onClick={() => setOpenPanel(openPanel === "log" ? undefined : "log")}
              aria-label="Open action log"
            >
              <List size={18} aria-hidden="true" />
            </button>
          )}
          {chat && localPlayerId ? (
            <ChatToggle
              open={openPanel === "chat"}
              unread={chatUnread}
              onToggle={() => setOpenPanel(openPanel === "chat" ? undefined : "chat")}
            />
          ) : null}
          {developerToolsEnabled ? (
            <button
              type="button"
              className={openPanel === "dev" ? "is-active" : ""}
              onClick={() => setOpenPanel(openPanel === "dev" ? undefined : "dev")}
              aria-label="Open developer controls"
            >
              <Settings size={18} aria-hidden="true" />
            </button>
          ) : null}
          {canEditDeveloperResources ? (
            <button
              type="button"
              className={openPanel === "resources" ? "is-active" : ""}
              onClick={() => setOpenPanel(openPanel === "resources" ? undefined : "resources")}
              aria-label="Open resource developer tools"
            >
              <Gauge size={18} aria-hidden="true" />
            </button>
          ) : null}
          {localPlayerId ? (
            <Button
              data-ui-btn=""
              className="utility-dock__surrender"
              variant="ghost"
              tone="red"
              size="sm"
              onClick={() => setShowSurrenderDialog(true)}
              disabled={!gameState.started || Boolean(gameState.winnerId)}
            >
              Surrender
            </Button>
          ) : null}
        </div>

        {trialMode && runTrialCommand ? (
          <div className="trial-dock" style={{ "--ui-btn-accent": "#d7ff61" } as React.CSSProperties}>
            <Button
              data-ui-btn=""
              tone="accent"
              icon={<FlaskConical size={15} />}
              iconEnd={trialConsoleOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              onClick={() => setTrialConsoleOpen((open) => !open)}
              aria-expanded={trialConsoleOpen}
              aria-controls="trial-console-actions"
              title={trialConsoleOpen ? "Collapse trial controls" : "Expand trial controls"}
            >
              Trial
            </Button>
            {trialConsoleOpen ? (
              <section className="trial-console" id="trial-console-actions" aria-label="Trial controls">
          <button type="button" onClick={() => runTrialCommand("ADD_MANA")} title="Add one mana">
            <Plus size={15} aria-hidden="true" /> Mana
          </button>
          <button type="button" onClick={() => runTrialCommand("MAX_MANA")} title="Fill mana and spell mana">
            <Zap size={15} aria-hidden="true" /> Max
          </button>
          <button type="button" onClick={() => dispatch({ type: "DRAW_CARD", playerId: "P1" }, "Trial: P1 drew a card.")} title="Draw a card">
            <BookOpen size={15} aria-hidden="true" /> Draw
          </button>
          <button type="button" onClick={() => runTrialCommand("READY_ATTACK")} title="Refresh the attack token">
            <Swords size={15} aria-hidden="true" /> Attack
          </button>
          <button type="button" onClick={resetGame} title="Reset trial">
            <RotateCcw size={15} aria-hidden="true" /> Reset
          </button>
          {onExitTrial ? (
            <button className="trial-console__exit" type="button" onClick={() => setShowExitTrialDialog(true)} title="Exit Trial Duel">
              <LogOut size={15} aria-hidden="true" /> Exit
            </button>
          ) : null}
              </section>
            ) : null}
          </div>
        ) : null}

        {showExitTrialDialog && onExitTrial ? (
          <Modal
            bare
            maxWidth={520}
            zIndex={2600}
            labelledBy="trial-exit-title"
            onClose={() => setShowExitTrialDialog(false)}
          >
            <NoticeCard
              size="lg"
              tone="warning"
              badge="TRIAL SESSION · EXIT REQUEST"
              title="Leave the arena?"
              titleId="trial-exit-title"
              icon={<LogOut size={24} />}
              actions={
                <>
                  <Button size="lg" tone="amber" fullWidth onClick={() => setShowExitTrialDialog(false)} autoFocus>
                    Continue Trial
                  </Button>
                  <Button size="lg" variant="warning" fullWidth icon={<LogOut size={16} />} onClick={onExitTrial}>
                    Exit to Lobby
                  </Button>
                </>
              }
            >
              Your current trial progress will be lost, and you will return to the Lobby.
            </NoticeCard>
          </Modal>
        ) : null}

        {showSurrenderDialog && localPlayerId ? (
          <Modal
            bare
            maxWidth={520}
            zIndex={2600}
            labelledBy="surrender-title"
            onClose={() => setShowSurrenderDialog(false)}
          >
            <NoticeCard
              size="lg"
              tone="danger"
              badge="MATCH COMMAND · SURRENDER"
              title="Surrender duel?"
              titleId="surrender-title"
              icon={<Flag size={24} />}
              actions={
                <>
                  <Button size="lg" tone="red" fullWidth onClick={() => setShowSurrenderDialog(false)} autoFocus>
                    Continue Duel
                  </Button>
                  <Button size="lg" variant="danger" fullWidth icon={<Flag size={16} />} onClick={surrender}>
                    Surrender
                  </Button>
                </>
              }
            >
              The opponent will be declared the winner, and the match result will be recorded immediately.
            </NoticeCard>
          </Modal>
        ) : null}

        {connectionStatus && !opponentConnected ? (
          <div className="opponent-disconnected-notice" role="status">
            Opponent disconnected. Waiting for them to reconnect...
          </div>
        ) : null}

        {chat && openPanel === "chat" ? (
          <ChatPanel
            chat={chat}
            localPlayerId={localPlayerId}
            opponentName={playerProfiles?.[localPlayerId === "P1" ? "P2" : "P1"]?.username}
            onClose={() => setOpenPanel(undefined)}
          />
        ) : null}

        {openPanel && openPanel !== "chat" ? (
          <aside className="floating-utility-panel" aria-label={openPanel === "log" ? "Action log" : openPanel === "resources" ? "Resource developer tools" : "Developer controls"}>
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
            ) : openPanel === "resources" && setDeveloperResources ? (
              <DeveloperResourcesPanel gameState={gameState} onApply={setDeveloperResources} />
            ) : (
              <>
                {connectionStatus ? (
                  <section className="quick-controls multiplayer-status" aria-label="Connection">
                    <strong>Multiplayer</strong>
                    <span>{connectionStatus}</span>
                    {localPlayerId ? <span>You are {localPlayerId}</span> : null}
                    {!opponentConnected ? (
                      <span>Opponent disconnected. Waiting for them to reconnect...</span>
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
            playerName={getPlayerName(viewingGraveyard)}
            entries={gameState.players[viewingGraveyard].graveyard}
            canSelect={canSelectGraveyardCard(viewingGraveyard)}
            allowedTypes={getGraveyardAllowedTypes()}
            selectedCardInstanceId={
              selectedSpellTarget?.type === "GRAVEYARD" &&
                selectedSpellTarget.playerId === viewingGraveyard
                ? selectedSpellTarget.cardInstanceId
                : undefined
            }
            selectionPrompt={
              selectedSpell
                ? `${cardDef(selectedSpell).name}: ${describeSelectedCardPrompt(selectedSpell, selectedCostTargets)}`
                : undefined
            }
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

        <AnimatePresence>
          {afkNotice ? (
            <AfkToastNotification
              level={afkNotice.level}
              message={afkNotice.message}
              duration={8000}
              onClose={dismissAfkNotice}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {targetError ? (
            <AfkToastNotification
              level="warning"
              message={targetError}
              duration={3500}
              onClose={dismissTargetError}
            />
          ) : null}
        </AnimatePresence>

        <section
          ref={battleTableRef}
          className="battle-table lor-table relative overflow-hidden"
          aria-label="Local battle board"
          data-urgency={turnRail.owner === "you" ? turnRail.urgency : "calm"}
        >
          <PhaserArenaCanvas />
          <div className="board-alarm" aria-hidden="true" />
          <SpellEffectLayer events={gameState.visualEvents} stageRef={battleTableRef} />
          <div className="turn-rail-anchor">
            <TurnRail model={turnRail}>
              <ActionPrompt
                targeting={
                  selectedSpell && !selectedSpellTarget && !viewingGraveyard
                    ? {
                        cardName: cardDef(selectedSpell).name,
                        instruction: describeSelectedCardPrompt(selectedSpell, selectedCostTargets),
                        onCancel: clearSelectedCard
                      }
                    : undefined
                }
                discard={
                  gameState.pendingDiscard
                    ? {
                        playerName: getPlayerName(gameState.pendingDiscard.playerId),
                        count: gameState.players[gameState.pendingDiscard.playerId].hand.length,
                        limit: gameState.pendingDiscard.downTo
                      }
                    : undefined
                }
                attackerCount={gameState.phase === "BLOCK" ? attackerCount : 0}
                blockerName={selectedBlocker ? unitDef(selectedBlocker).name : undefined}
              />
            </TurnRail>
          </div>
          <Hand
            cards={gameState.players[opponentPlayerId].hand}
            side="opponent"
            hidden={shouldHideHand(opponentPlayerId)}
            opponentHover={trialMode}
            selectedCardId={
              selectedSpell?.ownerId === opponentPlayerId ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay(opponentPlayerId, card)}
            onPlayCard={(card) => playCard(opponentPlayerId, card)}
            onPreviewCard={(card) => setPreviewCard(card)}
          />

          <div className="arena-grid">
            <div className="side-counters">
              {renderGraveyard(opponentPlayerId, "GY")}
              {renderDeckStack(opponentPlayerId, "Deck")}
              {renderDeckStack(viewerPlayerId, "Deck")}
              {renderGraveyard(viewerPlayerId, "GY")}
            </div>

            <div className="center-board phaser-arena-enabled" />

            <div className="status-column">
              <NexusPanel
                playerId={opponentPlayerId}
                player={gameState.players[opponentPlayerId]}
                label="Nexus"
                playerName={getPlayerName(opponentPlayerId)}
                playerAvatar={getPlayerProfile(opponentPlayerId)?.avatar}
                playerElo={getPlayerProfile(opponentPlayerId)?.elo}
                side="opponent"
                round={gameState.round}
                isAttacker={gameState.attackTokenPlayerId === opponentPlayerId}
                hasPriority={gameState.priorityPlayerId === opponentPlayerId}
                attackTokenAvailable={gameState.attackTokenAvailable}
                resourcePreview={
                  previewCard?.ownerId === opponentPlayerId
                    ? getResourcePreview(opponentPlayerId, previewCard)
                    : selectedSpell?.ownerId === opponentPlayerId
                      ? getResourcePreview(opponentPlayerId, selectedSpell)
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
                    urgency={turnRail.urgency}
                    onClick={action.onClick}
                  />
                );
              })()}
              {renderSpellStack("Spell")}
              <NexusPanel
                playerId={viewerPlayerId}
                player={gameState.players[viewerPlayerId]}
                label="Nexus"
                playerName={getPlayerName(viewerPlayerId)}
                playerAvatar={getPlayerProfile(viewerPlayerId)?.avatar}
                playerElo={getPlayerProfile(viewerPlayerId)?.elo}
                side="viewer"
                round={gameState.round}
                isAttacker={gameState.attackTokenPlayerId === viewerPlayerId}
                hasPriority={gameState.priorityPlayerId === viewerPlayerId}
                attackTokenAvailable={gameState.attackTokenAvailable}
                resourcePreview={
                  previewCard?.ownerId === viewerPlayerId
                    ? getResourcePreview(viewerPlayerId, previewCard)
                    : selectedSpell?.ownerId === viewerPlayerId
                      ? getResourcePreview(viewerPlayerId, selectedSpell)
                  : { manaUsed: 0, spellManaUsed: 0 }
                }
              />
            </div>
          </div>
          <Hand
            cards={gameState.players[viewerPlayerId].hand}
            side="player"
            hidden={shouldHideHand(viewerPlayerId)}
            selectedCardId={
              selectedSpell?.ownerId === viewerPlayerId ? selectedSpell.instanceId : undefined
            }
            canPlay={(card) => canPlay(viewerPlayerId, card)}
            blockReason={(card) => playBlock(viewerPlayerId, card)}
            onPlayCard={(card) => playCard(viewerPlayerId, card)}
            onPreviewCard={(card) => setPreviewCard(card)}
          />



        </section>

        <CardInspector
          play={{
            isInHand: (card) => gameState.players[viewerPlayerId].hand.some((held) => held.instanceId === card.instanceId),
            canPlay: (card) => canPlay(viewerPlayerId, card),
            blocked: (card) => {
              const reason = playBlock(viewerPlayerId, card);
              return reason ? BLOCK_TEXT[reason] : undefined;
            },
            label: (card) =>
              gameState.phase === "DISCARD" ? "Discard" : cardDef(card).type === "spell" ? "Cast" : "Declare",
            onPlay: (card) => playCard(viewerPlayerId, card)
          }}
        />

        {renderPendingDiscard()}
        {gameState.pendingChoice ? (
          <PendingAbilityTargetDialog
            gameState={gameState}
            pendingChoice={gameState.pendingChoice}
            canControl={canControl(gameState.pendingChoice.playerId)}
            onSelectTarget={submitPendingAbilityTarget}
            onCancel={cancelPendingChoice}
          />
        ) : null}
        {renderSpellConfirmation()}
        {championConfirm ? (
          <BoardDialog
            tone="blood"
            badge="Champion"
            title={cardDef(championConfirm.card).name}
            titleId="champion-confirm-title"
            onClose={() => setChampionConfirm(undefined)}
            actions={
              <>
                <Button chamfer size="md" tone="red" onClick={() => setChampionConfirm(undefined)} autoFocus>
                  Cancel
                </Button>
                <Button
                  chamfer
                  size="md"
                  variant="danger"
                  onClick={() => {
                    const { playerId, card } = championConfirm;
                    setChampionConfirm(undefined);
                    playCard(playerId, card, true);
                  }}
                >
                  Declare Champion
                </Button>
              </>
            }
          >
            Declare this champion for {cardDef(championConfirm.card).cost} mana? It joins the waiting row at once.
          </BoardDialog>
        ) : null}
        {winnerId ? (
          <div
            className={`match-result-overlay ${isViewerWinner ? "match-result-overlay--win" : "match-result-overlay--lose"}`}
            data-ui-shield=""
            role="dialog"
            aria-modal="true"
            aria-label={isViewerWinner ? "Match won" : "Match lost"}
          >
            <section className="match-result-panel">
              <span className="match-result-panel__frame" aria-hidden="true" />
              <div className="match-result-panel__emblem" aria-hidden="true">
                {isViewerWinner ? <Trophy size={36} /> : <Skull size={36} />}
              </div>
              <p className="match-result-panel__eyebrow">Ranked Duel Complete</p>
              <h1>{isViewerWinner ? "WIN" : "LOSE"}</h1>
              <p className="match-result-panel__message">
                {isViewerWinner ? "You claimed the battlefield." : "The battlefield belongs to your rival."}
              </p>
              <div className="match-result-panel__winner">
                <span className="match-result-panel__avatar">
                  {winnerInitial}
                  {winnerAvatar ? (
                    <img src={winnerAvatar} alt="" onError={(event) => event.currentTarget.remove()} />
                  ) : null}
                </span>
                <span>
                  <small>Winner</small>
                  <strong>{winnerName}</strong>
                </span>
              </div>
              {localPlayerId ? (
                <div className="match-result-panel__timeout" role="status" aria-live="polite">
                  <span>Returning to lobby automatically</span>
                  <strong>{resultReturnSeconds}s</strong>
                  <progress
                    aria-label="Time remaining before returning to lobby"
                    max={MATCH_RESULT_RETURN_SECONDS}
                    value={resultReturnSeconds}
                  />
                </div>
              ) : null}
              <div className="match-result-panel__actions">
                <Button tone="accent" fullWidth icon={<House size={17} />} onClick={leaveToLobby}>
                  Lobby
                </Button>
                <Button variant="accent" fullWidth icon={<Search size={17} />} onClick={startAnotherDuel}>
                  {localPlayerId ? "Find another match" : "New duel"}
                </Button>
              </div>
            </section>
          </div>
        ) : null}
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

function describeSpellTarget(
  target: SpellTarget,
  getPlayerName: (playerId: PlayerId) => string
): string {
  switch (target.type) {
    case "UNIT":
      return `${getPlayerName(target.playerId)} unit`;
    case "NEXUS":
      return `${getPlayerName(target.playerId)} nexus`;
    case "SELF":
      return getPlayerName(target.playerId);
    case "GRAVEYARD":
      return `${getPlayerName(target.playerId)} graveyard`;
    case "DECK_CARD":
      return `${getPlayerName(target.playerId)} deck card`;
    case "HAND_CARD":
      return `${getPlayerName(target.playerId)} hand card`;
  }
}
