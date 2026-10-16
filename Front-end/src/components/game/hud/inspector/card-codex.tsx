"use client";

import type { CardInstance, UnitInstance } from "@backend/game/types";
import { GameCard } from "../../cards/game-card";
import { SpeedGlyph } from "../../cards/speed-glyph";
import { SPEED_STYLE } from "../../cards/spellSpeed";
import { TintedText } from "../../cards/tinted-text";
import { KEYWORD_TEXT, type CardInfo } from "./cardInfo";

/**
 * The full text of a pinned card, in a drawer that slides in from the edge of the screen opposite the
 * card, so it never covers the card being read. Its text scrolls, so a long description fits however
 * short the screen. It is explicit: it opens when a card is pinned and closes with `Esc`, its button,
 * a click elsewhere, or by pinning another card.
 */
export function CardCodex({
  card,
  unit,
  info,
  side,
  open,
  action
}: {
  card?: CardInstance;
  unit?: UnitInstance;
  info: CardInfo;
  side: "left" | "right";
  open: boolean;
  /** Plays the card from the codex (only for a card of the hand): the word on the button and whether it can be pressed. */
  action?: { label: string; enabled: boolean; disabledLabel: string; onPlay: () => void };
}) {
  const { definition, keywords, typeLine, cost, attack, health, trends, speed } = info;

  return (
    <aside
      className={`card-codex card-codex--${side}${open ? " card-codex--open" : ""}`}
      data-card-ui
      data-ui-shield=""
      aria-label={`${definition.name} details`}
    >
      <div className="card-codex__scroll">
        <div className="card-codex__face">
          <GameCard card={card} unit={unit} staticRender />
        </div>

        <div className="card-codex__rules">
          <h2 className="card-codex__name">{definition.name}</h2>
          <p className="card-codex__type">
            {typeLine}
            {speed ? (
              <span className="card-codex__chip" style={{ color: SPEED_STYLE[speed].color, borderColor: SPEED_STYLE[speed].color }}>
                <SpeedGlyph speed={speed} className="card-codex__glyph" />
                {SPEED_STYLE[speed].label}
              </span>
            ) : null}
          </p>
          <p className="card-codex__stats">
            <span>{cost} mana</span>
            {attack !== undefined && health !== undefined ? (
              <span>
                {attack}
                <i className="stat-trend" data-trend={trends.attack} aria-hidden="true" />
                {" attack"}
                {printedNote(trends.attack, definition.attack)} · {health}
                <i className="stat-trend" data-trend={trends.health} aria-hidden="true" />
                {" health"}
                {printedNote(trends.health, definition.health)}
              </span>
            ) : null}
          </p>
          {keywords.length > 0 ? (
            <dl className="card-codex__keywords">
              {keywords.map((keyword) => (
                <div key={keyword}>
                  <dt>{keyword.replace("_", " ")}</dt>
                  <dd>{KEYWORD_TEXT[keyword]}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {speed ? <p className="card-codex__speed">{SPEED_STYLE[speed].hint}</p> : null}
          {definition.description ? (
            <p className="card-codex__text">
              <TintedText text={definition.description} />
            </p>
          ) : null}
        </div>
      </div>
      {action ? (
        <div className="card-codex__foot">
          <button
            type="button"
            className="card-codex__play"
            disabled={!action.enabled}
            onClick={action.onPlay}
          >
            <span className="card-codex__play-gem" aria-hidden="true" />
            <span className="card-codex__play-label">{action.enabled ? action.label : action.disabledLabel}</span>
            <span className="card-codex__play-cost">{cost}</span>
          </button>
        </div>
      ) : null}
    </aside>
  );
}

/** " (printed 3)" next to a stat that has moved off its printed value. */
function printedNote(trend: "up" | "down" | undefined, printed?: number) {
  return trend && printed !== undefined ? ` (printed ${printed})` : "";
}
