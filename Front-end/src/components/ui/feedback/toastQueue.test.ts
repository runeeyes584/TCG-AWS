import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOAST_DURATION,
  MAX_TOASTS_PER_PLACEMENT,
  createToastItem,
  enqueueToast,
  removeToast,
  type ToastInput,
  type ToastItem,
} from "./toastQueue";

const input = (over: Partial<ToastInput> = {}): ToastInput => ({ badge: "B", title: "T", message: "M", ...over });
const item = (revision: number, over: Partial<ToastInput> = {}) => createToastItem(input(over), revision);
const keys = (list: ToastItem[]) => list.map((toast) => toast.key);

describe("createToastItem", () => {
  it("fills the defaults and makes a key when none is given", () => {
    expect(item(7)).toEqual({
      key: "toast-7",
      revision: 7,
      tone: "warning",
      badge: "B",
      title: "T",
      message: "M",
      duration: DEFAULT_TOAST_DURATION,
      placement: "page",
    });
  });

  it("keeps what the caller chose", () => {
    const made = item(1, { key: "afk", tone: "danger", duration: 8000, placement: "game" });
    expect(made).toMatchObject({ key: "afk", tone: "danger", duration: 8000, placement: "game" });
  });
});

describe("enqueueToast", () => {
  it("puts a new toast last", () => {
    const list = enqueueToast(enqueueToast([], item(1, { key: "a" })), item(2, { key: "b" }));
    expect(keys(list)).toEqual(["a", "b"]);
  });

  it("replaces a toast with the same key where it stands, with the new revision", () => {
    let list = enqueueToast([], item(1, { key: "a", message: "first" }));
    list = enqueueToast(list, item(2, { key: "b" }));
    list = enqueueToast(list, item(3, { key: "a", message: "again" }));
    expect(keys(list)).toEqual(["a", "b"]);
    expect(list[0]).toMatchObject({ message: "again", revision: 3 });
  });

  it("drops the oldest toast of a placement beyond the limit", () => {
    let list: ToastItem[] = [];
    for (let i = 1; i <= MAX_TOASTS_PER_PLACEMENT + 1; i++) list = enqueueToast(list, item(i, { key: `t${i}` }));
    expect(keys(list)).toEqual(["t2", "t3", "t4"]);
  });

  it("counts each placement on its own", () => {
    let list: ToastItem[] = [];
    for (let i = 1; i <= MAX_TOASTS_PER_PLACEMENT; i++) list = enqueueToast(list, item(i, { key: `p${i}` }));
    list = enqueueToast(list, item(10, { key: "g1", placement: "game" }));
    expect(keys(list)).toEqual(["p1", "p2", "p3", "g1"]);
  });

  it("does not stack a copy when the limit is full and the key is shown again", () => {
    let list: ToastItem[] = [];
    for (let i = 1; i <= MAX_TOASTS_PER_PLACEMENT; i++) list = enqueueToast(list, item(i, { key: `t${i}` }));
    list = enqueueToast(list, item(9, { key: "t2" }));
    expect(keys(list)).toEqual(["t1", "t2", "t3"]);
  });

  it("moves a toast to the end of its new stack when the replacement changes placement", () => {
    let list = enqueueToast([], item(1, { key: "a" }));
    list = enqueueToast(list, item(2, { key: "b" }));
    list = enqueueToast(list, item(3, { key: "a", placement: "game" }));
    expect(list.map((toast) => [toast.key, toast.placement])).toEqual([
      ["b", "page"],
      ["a", "game"],
    ]);
  });

  it("does not change the list it is given", () => {
    const list = Object.freeze([item(1, { key: "a" })]);
    expect(() => enqueueToast(list, item(2, { key: "b" }))).not.toThrow();
    expect(list).toHaveLength(1);
  });
});

describe("removeToast", () => {
  it("removes the toast with that key and leaves the others", () => {
    const list = enqueueToast(enqueueToast([], item(1, { key: "a" })), item(2, { key: "b" }));
    expect(keys(removeToast(list, "a"))).toEqual(["b"]);
  });

  it("does nothing for a key that is not there", () => {
    const list = enqueueToast([], item(1, { key: "a" }));
    expect(keys(removeToast(list, "zzz"))).toEqual(["a"]);
  });
});
