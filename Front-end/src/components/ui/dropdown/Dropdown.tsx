"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./Dropdown.module.css";

export interface DropdownOption {
  value: string;
  label: ReactNode;
  /** Plain text used for type-ahead; defaults to `label` when it is a string. */
  text?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Accessible name of the control (there is no visible <label> for it). */
  "aria-label": string;
  /** Leading icon inside the trigger. */
  icon?: ReactNode;
  placeholder?: ReactNode;
  disabled?: boolean;
  /** Trigger height in px. Default 36. */
  height?: number;
  className?: string;
}

const PANEL_MAX_HEIGHT = 264;
const GAP = 4;

const textOf = (option: DropdownOption) =>
  (option.text ?? (typeof option.label === "string" ? option.label : option.value)).toLowerCase();

/**
 * Listbox dropdown in the tactical HUD style, a drop-in for a native <select>.
 * The panel is rendered in a portal (position: fixed), so it is never clipped by an
 * overflow:hidden parent. Keyboard: arrows, Home/End, Enter/Space, Esc, Tab, type-ahead.
 */
export const Dropdown = memo(function Dropdown({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  icon,
  placeholder = "Select",
  disabled = false,
  height = 36,
  className = "",
}: DropdownProps) {
  const id = useId();
  const listId = `${id}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placement, setPlacement] = useState<{ top: number; left: number; width: number; up: boolean }>();

  const selectedIndex = useMemo(() => options.findIndex((option) => option.value === value), [options, value]);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const close = useCallback((focusTrigger: boolean) => {
    setOpen(false);
    setPlacement(undefined);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled));
    setOpen(true);
  }, [disabled, options, selectedIndex]);

  const choose = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      if (option.value !== value) onChange(option.value);
      close(true);
    },
    [close, onChange, options, value]
  );

  // Position under the trigger, flipping up when there is not enough room below.
  const place = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = Math.min(PANEL_MAX_HEIGHT, panelRef.current?.scrollHeight ?? PANEL_MAX_HEIGHT);
    const below = window.innerHeight - rect.bottom - GAP;
    const up = below < panelHeight && rect.top > below;
    setPlacement({
      top: up ? rect.top - GAP : rect.bottom + GAP,
      left: rect.left,
      width: rect.width,
      up,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place, options]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close(false);
    };
    const onViewportChange = (event: Event) => {
      // Scrolling the list itself must not move it.
      if (event.target instanceof Node && panelRef.current?.contains(event.target)) return;
      place();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [close, open, place]);

  // Keep the active row visible while moving with the keyboard.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    panelRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open, placement]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const move = (from: number, step: 1 | -1) => {
    for (let i = 1; i <= options.length; i += 1) {
      const next = (from + step * i + options.length * 2) % options.length;
      if (!options[next].disabled) return next;
    }
    return from;
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const { key } = event;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(key)) {
        event.preventDefault();
        openPanel();
      }
      return;
    }
    if (key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (key === "Tab") {
      close(false);
    } else if (key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => move(index, 1));
    } else if (key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => move(index, -1));
    } else if (key === "Home") {
      event.preventDefault();
      setActiveIndex(options.findIndex((option) => !option.disabled));
    } else if (key === "End") {
      event.preventDefault();
      for (let i = options.length - 1; i >= 0; i -= 1) {
        if (!options[i].disabled) {
          setActiveIndex(i);
          break;
        }
      }
    } else if (key === "Enter" || key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const state = typeahead.current;
      window.clearTimeout(state.timer);
      state.text += key.toLowerCase();
      state.timer = window.setTimeout(() => {
        state.text = "";
      }, 600);
      const found = options.findIndex((option) => !option.disabled && textOf(option).startsWith(state.text));
      if (found >= 0) setActiveIndex(found);
    }
  };

  const panelStyle: CSSProperties = placement
    ? {
        left: placement.left,
        minWidth: placement.width,
        maxHeight: PANEL_MAX_HEIGHT,
        ...(placement.up ? { bottom: window.innerHeight - placement.top } : { top: placement.top }),
      }
    : { visibility: "hidden" };

  return (
    <div className={`${styles.root} ${className}`} style={{ "--dd-h": `${height}px` } as CSSProperties}>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ""}`}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={onKeyDown}
      >
        {icon ? <span className={styles.icon} aria-hidden="true">{icon}</span> : null}
        <span className={styles.value}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={panelRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              className={`${styles.panel} ${placement?.up ? styles.up : ""}`}
              style={panelStyle}
            >
              {options.map((option, index) => (
                <li
                  key={option.value}
                  id={`${id}-opt-${index}`}
                  role="option"
                  aria-selected={option.value === value}
                  aria-disabled={option.disabled || undefined}
                  className={[
                    styles.option,
                    option.value === value ? styles.selected : "",
                    index === activeIndex ? styles.active : "",
                    option.disabled ? styles.optionDisabled : "",
                  ].filter(Boolean).join(" ")}
                  onPointerMove={() => {
                    if (!option.disabled && index !== activeIndex) setActiveIndex(index);
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(index)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.value === value ? <Check size={14} className={styles.check} aria-hidden="true" /> : null}
                </li>
              ))}
            </ul>,
            document.body
          )
        : null}
    </div>
  );
});

Dropdown.displayName = "Dropdown";

export default Dropdown;
