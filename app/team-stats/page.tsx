import TeamsList from "../components/teams-list";

export const metadata = {
  title: "Team Stats - Speedball Stats",
};

export default function TeamStatsPage() {
  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <TeamsList />
    </div>
  );
}
