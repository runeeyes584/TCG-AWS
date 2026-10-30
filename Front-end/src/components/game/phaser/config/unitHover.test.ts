import { describe, expect, it, vi } from "vitest";
import { UnitHoverTracker, type HoverTarget } from "./unitHover";

/** A card as drawn: the same unit gets a new card object at each redraw. */
const cardOf = (unitId: string): HoverTarget => ({ unitId });

function tracker() {
  const shown: string[] = [];
  const hide = vi.fn();
  const hover = new UnitHoverTracker<HoverTarget>({ show: (target) => shown.push(target.unitId), hide });
  return { hover, shown, hide };
}

describe("UnitHoverTracker", () => {
  it("shows the card entered and hides it when it is left", () => {
    const { hover, shown, hide } = tracker();
    const card = cardOf("u1");

    hover.enter(card);
    hover.leave(card);

    expect(shown).toEqual(["u1"]);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("ignores a late leave of a card that no longer holds the hover", () => {
    const { hover, hide } = tracker();
    const first = cardOf("u1");
    hover.enter(first);
    hover.enter(cardOf("u2"));

    hover.leave(first);

    expect(hide).not.toHaveBeenCalled();
  });

  it("gives the hover back to the unit's new card when the pointer is still on it, without hiding in between", () => {
    const { hover, shown, hide } = tracker();
    const before = cardOf("u1");
    hover.enter(before);

    hover.carry();
    hover.leave(before); // the old card is destroyed by the redraw
    const after = cardOf("u1");
    hover.adopt(cardOf("u2"), true);
    hover.adopt(after, true);
    hover.settle();

    expect(shown).toEqual(["u1", "u1"]);
    expect(hide).not.toHaveBeenCalled();
    hover.leave(after);
    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("ends the hover when the unit's new card is no longer under the pointer (it was declared into a lane)", () => {
    const { hover, hide } = tracker();
    hover.enter(cardOf("u1"));

    hover.carry();
    hover.adopt(cardOf("u1"), false);
    hover.settle();

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("ends the hover when the unit has left the table", () => {
    const { hover, hide } = tracker();
    hover.enter(cardOf("u1"));

    hover.carry();
    hover.adopt(cardOf("u2"), true);
    hover.settle();

    expect(hide).toHaveBeenCalledTimes(1);
  });

  it("does nothing on a redraw while nothing is hovered", () => {
    const { hover, shown, hide } = tracker();

    hover.carry();
    hover.adopt(cardOf("u1"), true);
    hover.settle();

    expect(shown).toEqual([]);
    expect(hide).not.toHaveBeenCalled();
  });

  it("ends the hover of a card destroyed outside a redraw", () => {
    const { hover, hide } = tracker();
    const card = cardOf("u1");
    hover.enter(card);

    hover.leave(card);
    hover.settle();

    expect(hide).toHaveBeenCalledTimes(1);
  });
});
