import * as Phaser from "phaser";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import { toScreenRect } from "../../hud/inspector/inspectorPlacement";
import { logicalSize } from "../config/geometry/arenaScale";
import { isShielded, isShieldedPointer } from "../config/interaction/uiShield";
import { UnitHoverTracker } from "../config/interaction/unitHover";
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

  /** Every card that can be hovered now. A card leaves the set when it is destroyed. */
  private readonly cards = new Set<Phaser.GameObjects.Container>();
  private watching?: Phaser.Scene;

  /**
   * The pointer left the table: it went onto a control drawn above the canvas (the Pass seal, a pile, a dialog, the
   * hand) or out of the page. Phaser listens for the pointer on the canvas only, and when the
   * pointer leaves it says `gameout` and nothing to the cards, so no `pointerout` would ever come and the hover (and the
   * label of the card) would stay up. Nothing is hovered now; the card is lowered, and Phaser is made to forget that it was
   * over the card (`disable` takes it off Phaser's list of what is under the pointer without an event, `enable` turns it
   * back on), so that the pointer coming back to the same card is a new `pointerover`.
   */
  private readonly release = () => {
    this.hover.release()?.onHover(false);
    const input = this.watching?.input;
    if (!input) return;
    for (const card of this.cards) {
      if (!card.active) continue;
      input.disable(card);
      input.enable(card);
    }
  };

  private watch(scene: Phaser.Scene) {
    if (this.watching === scene) return;
    this.unwatch();
    this.watching = scene;
    scene.input.on(Phaser.Input.Events.GAME_OUT, this.release);
  }

  private unwatch() {
    this.watching?.input?.off(Phaser.Input.Events.GAME_OUT, this.release);
    this.watching = undefined;
  }

  destroy() {
    this.unwatch();
    this.cards.clear();
  }

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
    this.cards.add(card);
    this.watch(card.scene);
    card.on("pointerover", () => {
      if (!moving()) this.hover.enter(target);
    });
    card.on("pointerout", () => {
      this.hover.leave(target);
      onHover(false);
    });
    // Phaser never reports that the pointer left a destroyed card.
    card.once(Phaser.GameObjects.Events.DESTROY, () => {
      this.cards.delete(card);
      this.hover.leave(target);
    });
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
