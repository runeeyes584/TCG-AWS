"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CardInstance, UnitInstance } from "@backend/game/types";
import type { ScreenRect } from "../libs/arenaEventBus";

/** Reads where the hovered card is on screen *now* (a hand card is still moving when hover starts). */
export type AnchorGetter = () => ScreenRect;

export interface HoverContextType {
  hoveredCard: CardInstance | undefined;
  hoveredUnit: UnitInstance | undefined;
  selectedCard: CardInstance | undefined;
  selectedUnit: UnitInstance | undefined;
  /** Where the hovered card is on screen; the inspector stands beside it. */
  hoverAnchor: AnchorGetter | undefined;
  /** Where the pinned card was when it was selected. */
  selectedAnchor: AnchorGetter | undefined;
  setHoveredCard: (card?: CardInstance, unit?: UnitInstance, anchor?: AnchorGetter) => void;
  selectCard: (card?: CardInstance, unit?: UnitInstance) => void;
}

const HoverContext = createContext<HoverContextType | undefined>(undefined);

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoveredCard, setHoveredCardState] = useState<CardInstance>();
  const [hoveredUnit, setHoveredUnit] = useState<UnitInstance>();
  const [selectedCard, setSelectedCard] = useState<CardInstance>();
  const [selectedUnit, setSelectedUnit] = useState<UnitInstance>();
  // Functions are stored through an updater (a function passed to setState would be called).
  const [hoverAnchor, setHoverAnchor] = useState<AnchorGetter>();
  const [selectedAnchor, setSelectedAnchor] = useState<AnchorGetter>();

  useEffect(() => {
    const clearPinnedDetails = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-card-ui]")) {
        return;
      }

      setSelectedCard(undefined);
      setSelectedUnit(undefined);
      setSelectedAnchor(undefined);
    };

    document.addEventListener("pointerdown", clearPinnedDetails);
    return () => document.removeEventListener("pointerdown", clearPinnedDetails);
  }, []);

  return (
    <HoverContext.Provider
      value={{
        hoveredCard,
        hoveredUnit,
        selectedCard,
        selectedUnit,
        hoverAnchor,
        selectedAnchor,
        setHoveredCard: (c, u, anchor) => {
          setHoveredCardState(c);
          setHoveredUnit(u);
          setHoverAnchor(() => anchor);
        },
        // Pinning keeps the anchor the card had while it was hovered.
        selectCard: (c, u) => {
          setSelectedCard(c);
          setSelectedUnit(u);
          setSelectedAnchor(() => (c || u ? hoverAnchor : undefined));
        }
      }}
    >
      {children}
    </HoverContext.Provider>
  );
}

export function useHover() {
  const context = useContext(HoverContext);
  if (!context) throw new Error("useHover must be used within HoverProvider");
  return context;
}
