import PlayerStatsBoard from "../components/player-stats-board";

export const metadata = {
  title: "Player Stats – Speedball Stats",
};

export default function PlayerStatsPage() {
  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <PlayerStatsBoard />
    </div>
  );
}
