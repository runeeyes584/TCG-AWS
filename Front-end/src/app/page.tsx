import { GameBoard } from "../components/GameBoard";
import { useSocketGame } from "../client/useSocketGame";

export default function Home() {
  const controller = useSocketGame();

  return <GameBoard controller={controller} />;
}