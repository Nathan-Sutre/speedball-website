"use client";

import { useEffect, useState } from "react";

type LastGame = {
  id: number;
  tournament_id: number | null;
  map_id: number | null;
  map_name: string | null;
  duration_seconds: number;
  blue_players: string[];
  red_players: string[];
  played_at: string;
  home_score: number;
  away_score: number;
  home_team_name: string | null;
  away_team_name: string | null;
};

export default function LastGamesPage() {
  const [games, setGames] = useState<LastGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch("http://localhost:3001/api/last-games/GetAll");
        const data = (await res.json()) as LastGame[];
        setGames(data.slice(0, 5));
      } catch (error) {
        console.error("Error fetching games:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
            Last Games
          </h2>
          <div className="text-slate-400">Chargement...</div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
          Last Games
        </h2>
        <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
          {games.length === 0 ? (
            <li className="px-4 py-3 text-slate-400">No games yet</li>
          ) : (
            games.map((game) => (
              <li key={game.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-slate-100 font-medium">
                    Game #{game.id}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {new Date(game.played_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">
                    {game.home_team_name || "Team 1"}
                  </span>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`px-2 py-1 rounded font-bold ${
                        game.home_score > game.away_score
                          ? "bg-blue-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {game.home_score}
                    </span>
                    <span className="text-slate-500">vs</span>
                    <span
                      className={`px-2 py-1 rounded font-bold ${
                        game.away_score > game.home_score
                          ? "bg-red-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {game.away_score}
                    </span>
                  </div>
                  <span className="text-slate-300">
                    {game.away_team_name || "Team 2"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {game.tournament_id
                    ? `Tournament #${game.tournament_id}`
                    : "Public match"}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {game.map_name ? `Map: ${game.map_name}` : "Map: -"}
                  {game.duration_seconds > 0
                    ? ` | ${Math.floor(game.duration_seconds / 60)}m`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Blue: {game.blue_players.join(", ") || "-"} | Red:{" "}
                  {game.red_players.join(", ") || "-"}
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
