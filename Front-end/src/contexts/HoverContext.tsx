"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CardInstance, UnitInstance } from "@backend/game/types";

export interface HoverContextType {
  hoveredCard: CardInstance | undefined;
  hoveredUnit: UnitInstance | undefined;
  selectedCard: CardInstance | undefined;
  selectedUnit: UnitInstance | undefined;
  setHoveredCard: (card?: CardInstance, unit?: UnitInstance) => void;
  selectCard: (card?: CardInstance, unit?: UnitInstance) => void;
}

const HoverContext = createContext<HoverContextType | undefined>(undefined);

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoveredCard, setHoveredCardState] = useState<CardInstance>();
  const [hoveredUnit, setHoveredUnit] = useState<UnitInstance>();
  const [selectedCard, setSelectedCard] = useState<CardInstance>();
  const [selectedUnit, setSelectedUnit] = useState<UnitInstance>();

  useEffect(() => {
    const clearPinnedDetails = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-card-ui]")) {
        return;
      }

      setSelectedCard(undefined);
      setSelectedUnit(undefined);
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
        setHoveredCard: (c, u) => {
          setHoveredCardState(c);
          setHoveredUnit(u);
        },
        selectCard: (c, u) => {
          setSelectedCard(c);
          setSelectedUnit(u);
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
