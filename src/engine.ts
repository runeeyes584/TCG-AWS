export type PlayerId = "P1" | "P2";

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  type: "unit" | "spell";
  attack?: number;
  health?: number;
}

export interface CardInstance {
  instanceId: string;
  definition: CardDefinition;
  ownerId: PlayerId;
}

export interface UnitInstance {
  instanceId: string;
  definition: CardDefinition;
  ownerId: PlayerId;
  attack: number;
  health: number;
  maxHealth: number;
  exhausted: boolean;
  attacking: boolean;
  blockingUnitId?: string;
  blockedByUnitId?: string;
}

export interface PlayerState {
  id: PlayerId;
  nexusHp: number;
  mana: number;
  spellMana: number;
  maxMana: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: UnitInstance[];
  graveyard: CardInstance[];
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  activePlayerId: PlayerId;
  priorityPlayerId: PlayerId;
  attackTokenPlayerId: PlayerId;
  round: number;
  turn: number;
  started: boolean;
  winnerId?: PlayerId;
}

export type GameAction =
  | { type: "START_GAME"; firstPlayerId?: PlayerId }
  | { type: "DRAW_CARD"; playerId: PlayerId; count?: number }
  | { type: "START_ROUND" }
  | { type: "PLAY_UNIT"; playerId: PlayerId; cardInstanceId: string }
  | { type: "DECLARE_ATTACKER"; playerId: PlayerId; unitInstanceId: string }
  | {
      type: "DECLARE_BLOCKER";
      playerId: PlayerId;
      blockerUnitId: string;
      attackerUnitId: string;
    }
  | { type: "RESOLVE_COMBAT" }
  | { type: "END_TURN"; playerId: PlayerId };

export class GameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameValidationError";
  }
}

const PLAYER_IDS: PlayerId[] = ["P1", "P2"];
const STARTING_NEXUS_HP = 20;
const MAX_MANA = 10;
const MAX_SPELL_MANA = 3;
const STARTING_HAND_SIZE = 4;
const BOARD_LIMIT = 6;

export function createCardInstance(
  definition: CardDefinition,
  ownerId: PlayerId,
  instanceId: string
): CardInstance {
  return { instanceId, definition, ownerId };
}

export function createInitialPlayerState(
  id: PlayerId,
  deck: CardInstance[] = []
): PlayerState {
  return {
    id,
    nexusHp: STARTING_NEXUS_HP,
    mana: 0,
    spellMana: 0,
    maxMana: 0,
    deck,
    hand: [],
    board: [],
    graveyard: []
  };
}

export function createInitialGameState(
  p1Deck: CardInstance[] = [],
  p2Deck: CardInstance[] = []
): GameState {
  return {
    players: {
      P1: createInitialPlayerState("P1", p1Deck),
      P2: createInitialPlayerState("P2", p2Deck)
    },
    activePlayerId: "P1",
    priorityPlayerId: "P1",
    attackTokenPlayerId: "P1",
    round: 0,
    turn: 0,
    started: false
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  validateAction(state, action);

  switch (action.type) {
    case "START_GAME":
      return startGame(state, action.firstPlayerId ?? "P1");
    case "DRAW_CARD":
      return drawCards(state, action.playerId, action.count ?? 1);
    case "START_ROUND":
      return startRound(state);
    case "PLAY_UNIT":
      return playUnit(state, action.playerId, action.cardInstanceId);
    case "DECLARE_ATTACKER":
      return declareAttacker(state, action.playerId, action.unitInstanceId);
    case "DECLARE_BLOCKER":
      return declareBlocker(
        state,
        action.playerId,
        action.blockerUnitId,
        action.attackerUnitId
      );
    case "RESOLVE_COMBAT":
      return resolveCombat(state);
    case "END_TURN":
      return endTurn(state, action.playerId);
  }
}

export function validateAction(state: GameState, action: GameAction): void {
  if (state.winnerId) {
    throw new GameValidationError("Cannot apply actions after the game is won.");
  }

  if (action.type !== "START_GAME" && !state.started) {
    throw new GameValidationError("Game has not started.");
  }

  switch (action.type) {
    case "START_GAME":
      if (state.started) {
        throw new GameValidationError("Game has already started.");
      }
      if (action.firstPlayerId && !isPlayerId(action.firstPlayerId)) {
        throw new GameValidationError("Invalid first player.");
      }
      return;
    case "DRAW_CARD":
      assertPlayer(action.playerId);
      if ((action.count ?? 1) < 1) {
        throw new GameValidationError("Draw count must be positive.");
      }
      return;
    case "START_ROUND":
      return;
    case "PLAY_UNIT":
      assertPriority(state, action.playerId);
      assertBoardSpace(state.players[action.playerId]);
      assertCardInHand(state, action.playerId, action.cardInstanceId);
      assertPlayableUnit(state, action.playerId, action.cardInstanceId);
      return;
    case "DECLARE_ATTACKER":
      assertPriority(state, action.playerId);
      if (state.attackTokenPlayerId !== action.playerId) {
        throw new GameValidationError("Player does not have the attack token.");
      }
      assertUnitCanAttack(state, action.playerId, action.unitInstanceId);
      return;
    case "DECLARE_BLOCKER":
      assertPriority(state, action.playerId);
      if (state.attackTokenPlayerId === action.playerId) {
        throw new GameValidationError("Attack token player cannot block.");
      }
      assertUnitCanBlock(state, action.playerId, action.blockerUnitId);
      assertAttackerExists(state, opponentOf(action.playerId), action.attackerUnitId);
      return;
    case "RESOLVE_COMBAT":
      if (!hasAttackers(state)) {
        throw new GameValidationError("No attackers declared.");
      }
      return;
    case "END_TURN":
      assertPriority(state, action.playerId);
      return;
  }
}

function startGame(state: GameState, firstPlayerId: PlayerId): GameState {
  const next = cloneState(state);
  next.started = true;
  next.activePlayerId = firstPlayerId;
  next.priorityPlayerId = firstPlayerId;
  next.attackTokenPlayerId = firstPlayerId;
  next.round = 1;
  next.turn = 1;

  for (const playerId of PLAYER_IDS) {
    drawInto(next.players[playerId], STARTING_HAND_SIZE);
  }

  refreshRound(next, false);
  return next;
}

function startRound(state: GameState): GameState {
  const next = cloneState(state);
  next.round += 1;
  next.turn = 1;
  next.attackTokenPlayerId = opponentOf(next.attackTokenPlayerId);
  next.activePlayerId = next.attackTokenPlayerId;
  next.priorityPlayerId = next.attackTokenPlayerId;
  refreshRound(next, true);
  return next;
}

function refreshRound(state: GameState, draw: boolean): void {
  for (const playerId of PLAYER_IDS) {
    const player = state.players[playerId];
    player.spellMana = Math.min(MAX_SPELL_MANA, player.spellMana + player.mana);
    player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
    player.mana = player.maxMana;
    player.board = player.board.map((unit) => ({
      ...unit,
      exhausted: false,
      attacking: false,
      blockingUnitId: undefined,
      blockedByUnitId: undefined
    }));
    if (draw) {
      drawInto(player, 1);
    }
  }
}

function drawCards(state: GameState, playerId: PlayerId, count: number): GameState {
  const next = cloneState(state);
  drawInto(next.players[playerId], count);
  return checkWinConditions(next);
}

function drawInto(player: PlayerState, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const card = player.deck.shift();
    if (!card) {
      player.nexusHp = 0;
      return;
    }
    player.hand.push(card);
  }
}

function playUnit(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  const handIndex = player.hand.findIndex(
    (card) => card.instanceId === cardInstanceId
  );
  const [card] = player.hand.splice(handIndex, 1);

  player.mana -= card.definition.cost;
  player.board.push({
    instanceId: card.instanceId,
    definition: card.definition,
    ownerId: playerId,
    attack: requiredStat(card.definition.attack, "attack"),
    health: requiredStat(card.definition.health, "health"),
    maxHealth: requiredStat(card.definition.health, "health"),
    exhausted: false,
    attacking: false
  });

  return next;
}

function declareAttacker(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): GameState {
  const next = cloneState(state);
  const unit = findUnit(next, playerId, unitInstanceId);
  unit.attacking = true;
  unit.exhausted = true;
  return next;
}

function declareBlocker(
  state: GameState,
  playerId: PlayerId,
  blockerUnitId: string,
  attackerUnitId: string
): GameState {
  const next = cloneState(state);
  const blocker = findUnit(next, playerId, blockerUnitId);
  const attacker = findUnit(next, opponentOf(playerId), attackerUnitId);
  blocker.blockingUnitId = attackerUnitId;
  attacker.blockedByUnitId = blockerUnitId;
  return next;
}

function resolveCombat(state: GameState): GameState {
  const next = cloneState(state);
  const attackerPlayer = next.players[next.attackTokenPlayerId];
  const defenderId = opponentOf(next.attackTokenPlayerId);
  const defenderPlayer = next.players[defenderId];
  const attackers = attackerPlayer.board.filter((unit) => unit.attacking);

  for (const attacker of attackers) {
    if (attacker.health <= 0) {
      continue;
    }

    const blocker = attacker.blockedByUnitId
      ? defenderPlayer.board.find(
          (unit) => unit.instanceId === attacker.blockedByUnitId
        )
      : undefined;

    if (blocker && blocker.health > 0) {
      attacker.health -= blocker.attack;
      blocker.health -= attacker.attack;
    } else {
      defenderPlayer.nexusHp -= attacker.attack;
    }
  }

  cleanupDeadUnits(attackerPlayer);
  cleanupDeadUnits(defenderPlayer);

  for (const playerId of PLAYER_IDS) {
    next.players[playerId].board = next.players[playerId].board.map((unit) => ({
      ...unit,
      attacking: false,
      blockingUnitId: undefined,
      blockedByUnitId: undefined
    }));
  }

  return checkWinConditions(next);
}

function endTurn(state: GameState, playerId: PlayerId): GameState {
  const next = cloneState(state);
  next.priorityPlayerId = opponentOf(playerId);
  next.activePlayerId = opponentOf(playerId);
  next.turn += 1;
  return next;
}

function cleanupDeadUnits(player: PlayerState): void {
  const survivors: UnitInstance[] = [];
  for (const unit of player.board) {
    if (unit.health <= 0) {
      player.graveyard.push({
        instanceId: unit.instanceId,
        definition: unit.definition,
        ownerId: unit.ownerId
      });
    } else {
      survivors.push(unit);
    }
  }
  player.board = survivors;
}

function checkWinConditions(state: GameState): GameState {
  const p1Dead = state.players.P1.nexusHp <= 0;
  const p2Dead = state.players.P2.nexusHp <= 0;

  if (p1Dead && p2Dead) {
    state.winnerId = state.priorityPlayerId;
  } else if (p1Dead) {
    state.winnerId = "P2";
  } else if (p2Dead) {
    state.winnerId = "P1";
  }

  return state;
}

function assertPlayer(playerId: PlayerId): void {
  if (!isPlayerId(playerId)) {
    throw new GameValidationError("Invalid player.");
  }
}

function assertPriority(state: GameState, playerId: PlayerId): void {
  assertPlayer(playerId);
  if (state.priorityPlayerId !== playerId) {
    throw new GameValidationError("Player does not have priority.");
  }
}

function assertBoardSpace(player: PlayerState): void {
  if (player.board.length >= BOARD_LIMIT) {
    throw new GameValidationError("Board is full.");
  }
}

function assertCardInHand(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): CardInstance {
  const card = state.players[playerId].hand.find(
    (candidate) => candidate.instanceId === cardInstanceId
  );
  if (!card) {
    throw new GameValidationError("Card is not in hand.");
  }
  return card;
}

function assertPlayableUnit(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): void {
  const player = state.players[playerId];
  const card = assertCardInHand(state, playerId, cardInstanceId);
  if (card.definition.type !== "unit") {
    throw new GameValidationError("Card is not a unit.");
  }
  if (card.definition.attack === undefined || card.definition.health === undefined) {
    throw new GameValidationError("Unit card requires attack and health.");
  }
  if (player.mana < card.definition.cost) {
    throw new GameValidationError("Not enough mana.");
  }
}

function assertUnitCanAttack(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): void {
  const unit = findUnit(state, playerId, unitInstanceId);
  if (unit.exhausted) {
    throw new GameValidationError("Unit is exhausted.");
  }
  if (unit.attacking) {
    throw new GameValidationError("Unit is already attacking.");
  }
}

function assertUnitCanBlock(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): void {
  const unit = findUnit(state, playerId, unitInstanceId);
  if (unit.blockingUnitId) {
    throw new GameValidationError("Unit is already blocking.");
  }
}

function assertAttackerExists(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): void {
  const unit = findUnit(state, playerId, unitInstanceId);
  if (!unit.attacking) {
    throw new GameValidationError("Target unit is not attacking.");
  }
  if (unit.blockedByUnitId) {
    throw new GameValidationError("Attacker is already blocked.");
  }
}

function hasAttackers(state: GameState): boolean {
  return state.players[state.attackTokenPlayerId].board.some(
    (unit) => unit.attacking
  );
}

function findUnit(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): UnitInstance {
  const unit = state.players[playerId].board.find(
    (candidate) => candidate.instanceId === unitInstanceId
  );
  if (!unit) {
    throw new GameValidationError("Unit is not on board.");
  }
  return unit;
}

function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

function isPlayerId(playerId: string): playerId is PlayerId {
  return playerId === "P1" || playerId === "P2";
}

function requiredStat(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new GameValidationError(`Unit requires ${label}.`);
  }
  return value;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    players: {
      P1: clonePlayer(state.players.P1),
      P2: clonePlayer(state.players.P2)
    }
  };
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    deck: player.deck.map(cloneCard),
    hand: player.hand.map(cloneCard),
    board: player.board.map((unit) => ({ ...unit })),
    graveyard: player.graveyard.map(cloneCard)
  };
}

function cloneCard(card: CardInstance): CardInstance {
  return {
    ...card,
    definition: { ...card.definition }
  };
}
