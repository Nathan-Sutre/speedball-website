"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type MapDetail = {
  id: number;
  name: string;
  image: string;
  playedCount: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  totalSeconds: number;
  totalMinutes: number;
  avgHomeScore: number;
  avgAwayScore: number;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export default function MapDetailPage() {
  const params = useParams();
  const mapId = params?.id as string | undefined;

  const [map, setMap] = useState<MapDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapId) return;

    const fetchMap = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:3001/api/maps/GetOne/${mapId}`,
        );
        if (!res.ok) {
          throw new Error("Map not found");
        }
        const data = (await res.json()) as Partial<MapDetail>;
        setMap({
          id: toFiniteNumber(data.id),
          name: String(data.name || "Unknown Map"),
          image: String(data.image || ""),
          playedCount: toFiniteNumber(data.playedCount),
          homeWins: toFiniteNumber(data.homeWins),
          awayWins: toFiniteNumber(data.awayWins),
          draws: toFiniteNumber(data.draws),
          totalSeconds: toFiniteNumber(data.totalSeconds),
          totalMinutes: toFiniteNumber(data.totalMinutes),
          avgHomeScore: toFiniteNumber(data.avgHomeScore),
          avgAwayScore: toFiniteNumber(data.avgAwayScore),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load map");
      } finally {
        setLoading(false);
      }
    };

    fetchMap();
  }, [mapId]);

  if (loading) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-slate-400">Chargement...</div>
        </section>
      </div>
    );
  }

  if (error || !map) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-red-400">{error || "Map not found"}</div>
        </section>
      </div>
    );
  }

  const totalGames = map.playedCount;
  const totalWins = map.homeWins + map.awayWins;
  const winRate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const homeWinRate =
    totalGames > 0 ? Math.round((map.homeWins / totalGames) * 100) : 0;
  const awayWinRate =
    totalGames > 0 ? Math.round((map.awayWins / totalGames) * 100) : 0;
  const drawRate =
    totalGames > 0 ? Math.round((map.draws / totalGames) * 100) : 0;

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4 gap-4">
      {/* Map Header */}
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Map Name */}
          <div>
            <h1 className="text-3xl font-bold text-white">{map.name}</h1>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Games */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Played</p>
              <p className="text-3xl font-bold text-cyan-400">{totalGames}</p>
              <p className="text-xs text-slate-500 mt-2">
                {map.totalMinutes} minutes total
              </p>
            </div>

            {/* Total Wins */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Wins</p>
              <p className="text-3xl font-bold text-green-400">{totalWins}</p>
              <p className="text-xs text-slate-500 mt-2">{winRate}% win rate</p>
            </div>

            {/* Avg Home Score */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Avg Home Score</p>
              <p className="text-3xl font-bold text-blue-400">
                {map.avgHomeScore}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {homeWinRate}% win rate
              </p>
            </div>

            {/* Avg Away Score */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Avg Away Score</p>
              <p className="text-3xl font-bold text-red-400">
                {map.avgAwayScore}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {awayWinRate}% win rate
              </p>
            </div>
          </div>

          {/* Breakdown Stats */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">
              Win Distribution
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-400">Home Wins</span>
                    <span className="text-sm font-semibold text-blue-400">
                      {map.homeWins}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${totalGames > 0 ? (map.homeWins / totalGames) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{homeWinRate}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-400">Away Wins</span>
                    <span className="text-sm font-semibold text-red-400">
                      {map.awayWins}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${totalGames > 0 ? (map.awayWins / totalGames) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{awayWinRate}%</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-400">Draws</span>
                    <span className="text-sm font-semibold text-amber-400">
                      {map.draws}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{
                        width: `${totalGames > 0 ? (map.draws / totalGames) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{drawRate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
