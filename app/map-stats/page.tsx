import MapStatsBoard from "../components/map-stats-board";

export const metadata = {
  title: "Map Stats - Speedball Stats",
};

export default function MapStatsPage() {
  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <MapStatsBoard />
    </div>
  );
}
