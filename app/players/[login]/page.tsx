"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PlayerStats = {
  points: number;
  damage: number;
  ballHits: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  accuracy: number;
  shots: number;
  passes: number;
  catches: number;
  backstabs: number;
  backspaced: number;
  ballGivenAway: number;
  ballStolen: number;
  ballPossession: number;
  nearMisses: number;
  captureTries: number;
  caps: number;
  capPercent: number;
  capSec: number;
};

type PlayerDetail = {
  login: string;
  matchesPlayed: number;
  totalMinutes: number;
  stats: PlayerStats;
};

type StatRow = {
  label: string;
  key: keyof PlayerStats;
  format: (v: number) => string;
};

const statRows: StatRow[] = [
  { label: "Points", key: "points", format: (v) => v.toFixed(1) },
  { label: "Damage", key: "damage", format: (v) => v.toFixed(1) },
  { label: "Ball Hits", key: "ballHits", format: (v) => v.toFixed(1) },
  { label: "Kills", key: "kills", format: (v) => v.toFixed(1) },
  { label: "Deaths", key: "deaths", format: (v) => v.toFixed(1) },
  { label: "K/D Ratio", key: "kdRatio", format: (v) => v.toFixed(2) },
  {
    label: "Accuracy",
    key: "accuracy",
    format: (v) => (v * 100).toFixed(1) + "%",
  },
  { label: "Shots", key: "shots", format: (v) => v.toFixed(1) },
  { label: "Passes", key: "passes", format: (v) => v.toFixed(1) },
  { label: "Catches", key: "catches", format: (v) => v.toFixed(1) },
  { label: "Backstabs", key: "backstabs", format: (v) => v.toFixed(1) },
  { label: "Backspaced", key: "backspaced", format: (v) => v.toFixed(1) },
  {
    label: "Ball Given Away",
    key: "ballGivenAway",
    format: (v) => v.toFixed(1),
  },
  { label: "Ball Stolen", key: "ballStolen", format: (v) => v.toFixed(1) },
  {
    label: "Ball Possession",
    key: "ballPossession",
    format: (v) => v.toFixed(1),
  },
  { label: "Near Misses", key: "nearMisses", format: (v) => v.toFixed(1) },
  { label: "Capture Tries", key: "captureTries", format: (v) => v.toFixed(1) },
  { label: "Caps", key: "caps", format: (v) => v.toFixed(1) },
  { label: "Cap %", key: "capPercent", format: (v) => v.toFixed(2) },
  { label: "Cap Sec", key: "capSec", format: (v) => v.toFixed(2) },
];

export default function PlayerDetailPage() {
  const params = useParams();
  const login = (params?.login as string | undefined)?.toLowerCase() || "";

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!login) return;

    const fetchPlayer = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:3001/api/players/GetByLogin/${login}`,
        );
        if (!res.ok) {
          throw new Error("Player not found");
        }
        const data = (await res.json()) as PlayerDetail;
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load player");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [login]);

  const avgPerMin = useMemo(() => {
    if (!player || player.totalMinutes === 0) return null;

    return {
      points: (player.stats.points / player.totalMinutes).toFixed(2),
      damage: (player.stats.damage / player.totalMinutes).toFixed(2),
      kills: (player.stats.kills / player.totalMinutes).toFixed(2),
      passes: (player.stats.passes / player.totalMinutes).toFixed(2),
    };
  }, [player]);

  if (loading) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-slate-400">Chargement...</div>
        </section>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-red-400">{error || "Player not found"}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4 gap-4">
      {/* Player Header */}
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="space-y-6">
          {/* Player Name */}
          <div>
            <h1 className="text-3xl font-bold text-white capitalize">
              {player.login}
            </h1>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Matches Played */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Matches Played</p>
              <p className="text-3xl font-bold text-cyan-400">
                {player.matchesPlayed}
              </p>
            </div>

            {/* Total Minutes */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Total Minutes</p>
              <p className="text-3xl font-bold text-cyan-400">
                {player.totalMinutes}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Avg{" "}
                {player.matchesPlayed > 0
                  ? (player.totalMinutes / player.matchesPlayed).toFixed(1)
                  : 0}
                m per game
              </p>
            </div>

            {/* Total Points */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">Total Points</p>
              <p className="text-3xl font-bold text-green-400">
                {player.stats.points.toFixed(1)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {avgPerMin ? `${avgPerMin.points} per min` : "N/A"}
              </p>
            </div>

            {/* K/D Ratio */}
            <div className="rounded-lg border border-cyan-400/30 bg-slate-950/50 p-4">
              <p className="text-sm text-slate-400 mb-1">K/D Ratio</p>
              <p className="text-3xl font-bold text-amber-400">
                {player.stats.kdRatio.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-2">
                {player.stats.kills.toFixed(0)} K /{" "}
                {player.stats.deaths.toFixed(0)} D
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Stats Table */}
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-white sm:text-xl mb-4">
          Detailed Statistics
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-y border-white/10 bg-slate-950/70">
                <th className="px-4 py-2 text-left text-sm font-semibold tracking-wide text-slate-300 uppercase">
                  Stat
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold tracking-wide text-slate-300 uppercase">
                  Total
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold tracking-wide text-slate-300 uppercase">
                  Per Match
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold tracking-wide text-slate-300 uppercase">
                  Per Minute
                </th>
              </tr>
            </thead>
            <tbody>
              {statRows.map((row) => {
                const total = player.stats[row.key];
                const perMatch =
                  player.matchesPlayed > 0 ? total / player.matchesPlayed : 0;
                const perMin =
                  player.totalMinutes > 0 ? total / player.totalMinutes : 0;

                return (
                  <tr
                    key={row.key}
                    className="border-b border-white/8 bg-slate-950/40"
                  >
                    <td className="px-4 py-3 text-sm text-slate-200 font-medium">
                      {row.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-100">
                      {row.format(total)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-300">
                      {row.format(perMatch)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-slate-400">
                      {row.format(perMin)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
