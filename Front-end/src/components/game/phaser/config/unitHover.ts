/** A card of the table that can hold the hover: its unit, and whatever the caller needs to show it. */
export interface HoverTarget {
  readonly unitId: string;
}

/**
 * Which unit of the table the pointer is on. The arena replaces every card each time it redraws, and Phaser
 * never says that the pointer left a card that was destroyed, so the hover is carried across a redraw and
 * settled once it is over: given back to the unit's new card if the pointer is still on it, ended otherwise.
 */
export class UnitHoverTracker<T extends HoverTarget> {
  private current: T | undefined;
  /** The unit hovered when the redraw began, until one of its new cards takes the hover or the redraw ends. */
  private carried: string | undefined;

  constructor(private readonly on: { show: (target: T) => void; hide: () => void }) {}

  enter(target: T) {
    this.carried = undefined;
    this.current = target;
    this.on.show(target);
  }

  /** The pointer left `target`, or `target` was destroyed. Only the card that holds the hover can end it. */
  leave(target: T) {
    if (this.current !== target) return;
    this.current = undefined;
    this.on.hide();
  }

  /** Every card is about to be replaced: remember the hovered unit, and keep its label up meanwhile. */
  carry() {
    if (this.current) this.carried = this.current.unitId;
    this.current = undefined;
  }

  /**
   * A card has just been drawn. If it is the carried unit's, it takes the hover back when the pointer is still
   * on it; otherwise (it is on its way to a lane) the hover ends.
   */
  adopt(target: T, underPointer: boolean) {
    if (this.carried !== target.unitId) return;
    if (underPointer) {
      this.enter(target);
      return;
    }
    this.carried = undefined;
    this.on.hide();
  }

  /** The redraw is over: a hover no card took back (its unit left the table) ends. */
  settle() {
    if (this.carried === undefined) return;
    this.carried = undefined;
    this.on.hide();
  }
}
