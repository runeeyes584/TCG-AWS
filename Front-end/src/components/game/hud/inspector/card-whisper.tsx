"use client";

import { useLayoutEffect, useRef } from "react";
import type { AnchorGetter } from "../../../../contexts/HoverContext";
import { SpeedGlyph } from "../../cards/speed-glyph";
import { SPEED_STYLE } from "../../cards/spellSpeed";
import { TintedText } from "../../cards/tinted-text";
import type { CardInfo } from "./cardInfo";
import { isPlaced, placeWhisper } from "./inspectorPlacement";

/**
 * The small label of the card under the pointer: its name, what it is, its stats, its
 * keywords, and the first line of its text. It stands just above the card (below it for the top row),
 * never covers it, and never takes the pointer, so it cannot get in the way of the lanes. Everything
 * else is in the codex, which opens when the card is pinned.
 */
export function CardWhisper({ info, anchor }: { info: CardInfo; anchor?: AnchorGetter }) {
  const ref = useRef<HTMLElement>(null);
  const { definition, keywords, typeLine, attack, health, trends, speed } = info;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const rect = anchor?.();
    // With no card to stand over (it has gone, or was never placed) the label is not shown, rather than left at the corner.
    element.style.visibility = isPlaced(rect) ? "visible" : "hidden";
    if (!isPlaced(rect)) return;
    const placed = placeWhisper(
      rect,
      { width: window.innerWidth, height: window.innerHeight },
      { width: element.offsetWidth, height: element.offsetHeight }
    );
    element.style.transform = `translate(${Math.round(placed.x)}px, ${Math.round(placed.y)}px)`;
    element.dataset.edge = placed.edge;
  }, [info, anchor]);

  return (
    <aside ref={ref} className="card-whisper" aria-hidden="true">
      <strong className="card-whisper__name">{definition.name}</strong>
      <span className="card-whisper__meta">
        <span>{typeLine}</span>
        {speed ? (
          <span className="card-whisper__speed" style={{ color: SPEED_STYLE[speed].color, borderColor: SPEED_STYLE[speed].color }}>
            <SpeedGlyph speed={speed} className="card-whisper__glyph" />
            {SPEED_STYLE[speed].label}
          </span>
        ) : null}
        {attack !== undefined && health !== undefined ? (
          <b>
            {attack}
            <i className="stat-trend" data-trend={trends.attack} aria-hidden="true" />/{health}
            <i className="stat-trend" data-trend={trends.health} aria-hidden="true" />
          </b>
        ) : null}
      </span>
      {keywords.length > 0 ? (
        <span className="card-whisper__chips">
          {keywords.map((keyword) => (
            <i key={keyword}>{keyword.replace("_", " ")}</i>
          ))}
        </span>
      ) : null}
      {definition.description ? (
        <span className="card-whisper__text">
          <TintedText text={definition.description} />
        </span>
      ) : null}
    </aside>
  );
}
