import TournamentsList from "../components/tournaments-list";

export const metadata = {
  title: "Tournaments - Speedball Stats",
};

export default function TournamentsPage() {
  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <TournamentsList />
    </div>
  );
}
