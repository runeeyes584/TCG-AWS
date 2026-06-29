"use client";

import { Crown, Heart, Layers, Skull, Sparkles } from "lucide-react";
import { CardInstance, GameState, PlayerId, PlayerState, UnitInstance } from "../game/types";
import { BoardView } from "./BoardView";
import { HandView } from "./HandView";

interface PlayerZoneProps {
  player: PlayerState;
  gameState: GameState;
  selectedBlockerId?: string;
  selectedCardId?: string;
  selectedUnitIds?: string[];
  canPlay: (playerId: PlayerId, card: CardInstance) => boolean;
  onPlayCard: (playerId: PlayerId, card: CardInstance) => void;
  onSelectBoardUnit: (playerId: PlayerId, unit: UnitInstance) => void;
}

export function PlayerZone({
  player,
  gameState,
  selectedBlockerId,
  selectedCardId,
  selectedUnitIds = [],
  canPlay,
  onPlayCard,
  onSelectBoardUnit
}: PlayerZoneProps) {
  const hasToken = gameState.attackTokenPlayerId === player.id;
  const hasPriority = gameState.priorityPlayerId === player.id;

  return (
    <section className={`player-zone ${hasPriority ? "is-priority" : ""}`}>
      <header className="zone-header">
        <div className="zone-title">
          <h2>{player.id}</h2>
          {hasToken ? (
            <span className="token">
              {gameState.attackTokenAvailable ? "Attack token" : "Token spent"}
            </span>
          ) : null}
          {hasPriority ? <span className="token">Priority</span> : null}
        </div>
        <div className="stat-row">
          <span className="stat-pill" style={{ position: 'relative' }}>
            <Heart size={14} aria-hidden="true" /> Nexus <strong>{player.nexusHp}</strong>
            {(() => {
                const nxEvents = gameState.visualEvents.filter(e => (e as any).targetId === `nexus-${player.id}`);
                return nxEvents.length > 0 ? (
                  <span className="floating-events-container">
                    {nxEvents.map((e, i) => (
                      <span key={i} className={`floating-event ${e.type.toLowerCase()}`}>
                        {e.type === "DAMAGE" ? `-${(e as any).amount}` : `+${(e as any).amount}`}
                      </span>
                    ))}
                  </span>
                ) : null;
            })()}
          </span>
          <span className="stat-pill">
            <Sparkles size={14} aria-hidden="true" /> Mana{" "}
            <strong>
              {player.mana}/{player.maxMana}
            </strong>
          </span>
          <span className="stat-pill">
            <Crown size={14} aria-hidden="true" /> Spell <strong>{player.spellMana}</strong>
          </span>
          <span className="stat-pill">
            <Layers size={14} aria-hidden="true" /> Deck <strong>{player.deck.length}</strong>
          </span>
          <span className="stat-pill">
            <Skull size={14} aria-hidden="true" /> Grave{" "}
            <strong>{player.graveyard.length}</strong>
          </span>
        </div>
      </header>

      <BoardView
        units={player.board}
        selectedUnitId={selectedBlockerId}
        selectedUnitIds={selectedUnitIds}
        onSelectUnit={(unit) => onSelectBoardUnit(player.id, unit)}
        visualEvents={gameState.visualEvents}
      />
      <HandView
        cards={player.hand}
        selectedCardId={selectedCardId}
        canPlay={(card) => canPlay(player.id, card)}
        onPlayCard={(card) => onPlayCard(player.id, card)}
      />
    </section>
  );
}
