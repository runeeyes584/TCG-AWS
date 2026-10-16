import { isShielded } from "../config/uiShield";

/**
 * Keeps a click on a DOM control (a card of the hand, the details seal, the codex, a dialog) away from Phaser.
 *
 * Phaser listens for `mousedown` and `mouseup` on the window and acts on any that did not land on its canvas, then
 * looks for what is under the pointer: so a click on a control drawn over the table also "clicked" the card
 * beneath it (and made it the hovered card, with its label and its lift). These listeners sit on the document,
 * which a click reaches after the page's own handlers and before the window, and end it there when it began on
 * a control marked `data-ui-shield`. A press that began on the table is left alone, even if it is let go over a
 * control, so Phaser never misses the end of a press it saw the start of.
 */
export class UiShieldGuard {
  private pressShielded = false;

  constructor() {
    document.addEventListener("mousedown", this.onDown);
    document.addEventListener("mouseup", this.onUp);
  }

  private readonly onDown = (event: MouseEvent) => {
    this.pressShielded = isShielded(event.target);
    if (this.pressShielded) event.stopPropagation();
  };

  private readonly onUp = (event: MouseEvent) => {
    if (!this.pressShielded) return;
    this.pressShielded = false;
    event.stopPropagation();
  };

  destroy() {
    document.removeEventListener("mousedown", this.onDown);
    document.removeEventListener("mouseup", this.onUp);
  }
}
