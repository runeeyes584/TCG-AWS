// ─── Player State ────────────────────────────────────────────────────────────

export interface PlayerState {
  user_id: string;
  nexus_hp: number;
  mana: number;
  deck_remaining: string[];
  hand: string[];
  battlefield: BattlefieldCard[];
  grave: string[];
}

// ─── Battlefield Card (inline unit on board) ──────────────────────────────────

export interface BattlefieldCard {
  card_id: string;
  current_power: number;
  current_health: number;
  keywords: string[];
  is_blocking?: boolean;
  is_attacking?: boolean;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  current_round: number;
  turn_player_id?: string;
  player_1: PlayerState;
  player_2: PlayerState;
  action_stack: GameAction[];
  expire_at?: number; // Unix timestamp (TTL for DynamoDB)
}

// ─── Game Action (action_stack entries) ──────────────────────────────────────

export interface GameAction {
  type: string;
  player_id: string;
  payload?: Record<string, unknown>;
  timestamp?: number;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  stats: UserStats;
  created_at: string; // ISO 8601
}

export interface UserStats {
  wins: number;
  losses: number;
  rank_points: number;
}

// ─── Game Log ─────────────────────────────────────────────────────────────────

export interface GameLog {
  match_id: string;
  action_sequence: number; // RANGE key — sort key in DynamoDB
  actor_id: string;
  action_type: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// ─── Connection (WebSocket) ───────────────────────────────────────────────────

export interface Connection {
  connection_id: string;
  user_id?: string;
  match_id?: string;
  connected_at: number;
}

// ─── Match History ────────────────────────────────────────────────────────────
export interface MatchHistory {
  user_id: string;
  played_at: number;
  match_id: string;
  opponent_id: string;
  result: "WIN" | "LOSS" | "DRAW";
  rank_point_change: number;
}
