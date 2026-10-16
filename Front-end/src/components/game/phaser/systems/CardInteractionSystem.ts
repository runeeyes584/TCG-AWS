import * as Phaser from "phaser";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import { toScreenRect } from "../../hud/inspector/inspectorPlacement";
import { logicalSize } from "../config/arenaScale";
import { isShieldedPointer } from "../config/uiShield";
import type { ScreenRect } from "../../../../libs/arenaEventBus";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { arenaStoreAdapter } from "../adapters/arenaStoreAdapter";

/** Where a card is on the page right now, for the inspector to stand beside it. */
function screenRectOf(card: Phaser.GameObjects.Container): ScreenRect {
  const { scene } = card;
  // The renderer knows where the card will be once the pointer has lifted it; otherwise its box as drawn.
  const anchor = card.getData("anchorRect") as (() => { x: number; y: number; width: number; height: number }) | undefined;
  const bounds = anchor ? anchor() : card.getBounds();
  const box = scene.game.canvas.getBoundingClientRect();
  return toScreenRect(
    { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
    { x: box.left, y: box.top, width: box.width, height: box.height },
    logicalSize(scene.scale)
  );
}

/** Card input only: selection and presentation events, never combat rules. */
export class CardInteractionSystem {
  /**
   * Makes `card` interactive inside `hitArea` (the polygon of the card as it is drawn,
   * which the caller reshapes when the card stands up). `onHover` lets the renderer
   * react to the pointer, e.g. lift the card.
   */
  bind(
    card: Phaser.GameObjects.Container,
    unit: UnitInstance,
    playerId: PlayerId,
    hitArea: Phaser.Geom.Polygon,
    onHover: (hovering: boolean) => void,
  ) {
    card.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
    card.on("pointerover", () => {
      arenaStoreAdapter.hoverEntity({ playerId, unitId: unit.instanceId });
      arenaEventAdapter.emit("HOVER_UNIT", { playerId, unitId: unit.instanceId, anchor: screenRectOf(card) });
      onHover(true);
    });
    card.on("pointerout", () => {
      arenaStoreAdapter.hoverEntity(undefined);
      arenaEventAdapter.emit("HOVER_UNIT", undefined);
      onHover(false);
    });
    card.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // A click on a DOM control drawn over the table (a card of the hand, a dialog) is not a click on this card.
      if (isShieldedPointer(pointer)) return;
      // A right click only reads the card (the codex); it neither selects nor declares it.
      if (pointer.rightButtonDown()) {
        arenaEventAdapter.emit("INSPECT_UNIT", { playerId, unitId: unit.instanceId });
        return;
      }
      arenaStoreAdapter.selectEntity({ playerId, unitId: unit.instanceId });
      arenaEventAdapter.emit("SELECT_UNIT", { playerId, unitId: unit.instanceId });
    });
  }
}
