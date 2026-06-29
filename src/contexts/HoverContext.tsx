"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { CardInstance, UnitInstance } from "../game/types";

export interface HoverContextType {
  hoveredCard: CardInstance | undefined;
  hoveredUnit: UnitInstance | undefined;
  setHoveredCard: (card?: CardInstance, unit?: UnitInstance) => void;
}

const HoverContext = createContext<HoverContextType | undefined>(undefined);

export function HoverProvider({ children }: { children: ReactNode }) {
  const [hoveredCard, setHoveredCardState] = useState<CardInstance>();
  const [hoveredUnit, setHoveredUnit] = useState<UnitInstance>();

  return (
    <HoverContext.Provider value={{ hoveredCard, hoveredUnit, setHoveredCard: (c, u) => { setHoveredCardState(c); setHoveredUnit(u); } }}>
      {children}
    </HoverContext.Provider>
  );
}

export function useHover() {
  const context = useContext(HoverContext);
  if (!context) throw new Error("useHover must be used within HoverProvider");
  return context;
}
