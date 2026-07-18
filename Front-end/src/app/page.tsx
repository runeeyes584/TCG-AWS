"use client";

import { GameBoard } from "../components/game/GameBoard";
import { useGameMatch } from "../hooks/useGameMatch";

export default function Home() {
  const controller = useGameMatch();

  return <GameBoard controller={controller} />;
}