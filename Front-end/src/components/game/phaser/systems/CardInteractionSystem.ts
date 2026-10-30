import * as Phaser from "phaser";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import { toScreenRect } from "../../hud/inspector/inspectorPlacement";
import { logicalSize } from "../config/arenaScale";
import { isShielded, isShieldedPointer } from "../config/uiShield";
import { UnitHoverTracker } from "../config/unitHover";
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

interface HoveredCard {
  readonly unitId: string;
  readonly playerId: PlayerId;
  readonly card: Phaser.GameObjects.Container;
  readonly onHover: (hovering: boolean) => void;
}

/** Whether the pointer is on `card` now, by the test Phaser itself uses (it works on a card drawn this frame). */
function isUnderPointer(card: Phaser.GameObjects.Container): boolean {
  const { input, cameras } = card.scene;
  const pointer = input.activePointer;
  // Over a DOM control drawn above the table (a card of the hand, a dialog), the pointer is not on the table.
  if (isShielded(pointer.event?.target)) return false;
  return input.manager.hitTest(pointer, [card], cameras.main).length > 0;
}

/** Card input only: selection and presentation events, never combat rules. */
export class CardInteractionSystem {
  private readonly hover = new UnitHoverTracker<HoveredCard>({
    show: ({ playerId, unitId, card, onHover }) => {
      arenaStoreAdapter.hoverEntity({ playerId, unitId });
      arenaEventAdapter.emit("HOVER_UNIT", { playerId, unitId, anchor: screenRectOf(card) });
      onHover(true);
    },
    hide: () => {
      arenaStoreAdapter.hoverEntity(undefined);
      arenaEventAdapter.emit("HOVER_UNIT", undefined);
    }
  });

  /** Every card is about to be redrawn: the hovered unit is carried over to its new card. */
  beginRedraw() {
    this.hover.carry();
  }

  /** The redraw is over: a hover that no new card took back ends. */
  endRedraw() {
    this.hover.settle();
  }

  /**
   * Makes `card` interactive inside `hitArea` (the polygon of the card as it is drawn,
   * which the caller reshapes when the card stands up). `onHover` lets the renderer
   * react to the pointer, e.g. lift the card. While `moving` (gliding to another lane) the card
   * takes no hover: it is drawn under the pointer at the slot it leaves and glides away from a
   * pointer that does not move, which Phaser never reports as the pointer leaving it.
   */
  bind(
    card: Phaser.GameObjects.Container,
    unit: UnitInstance,
    playerId: PlayerId,
    hitArea: Phaser.Geom.Polygon,
    onHover: (hovering: boolean) => void,
    moving: () => boolean = () => false,
  ) {
    card.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true });
    const target: HoveredCard = { unitId: unit.instanceId, playerId, card, onHover };
    card.on("pointerover", () => {
      if (!moving()) this.hover.enter(target);
    });
    card.on("pointerout", () => {
      this.hover.leave(target);
      onHover(false);
    });
    // Phaser never reports that the pointer left a destroyed card.
    card.once(Phaser.GameObjects.Events.DESTROY, () => this.hover.leave(target));
    // A card drawn again under a pointer that has not moved gets no pointerover: it takes the hover back here.
    this.hover.adopt(target, !moving() && isUnderPointer(card));
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
