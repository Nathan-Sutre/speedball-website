"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type RawPlayerStat = {
  login: string;
  nickname?: string;
  team?: string;
  points?: number;
  damage?: number;
  ballHits?: number;
  kills?: number;
  deaths?: number;
  kdRatio?: number;
  accuracy?: number;
  shots?: number;
  passes?: number;
  catches?: number;
  backstabs?: number;
  backspaced?: number;
  ballGivenAway?: number;
  ballStolen?: number;
  ballPossession?: number;
  nearMisses?: number;
  captureTries?: number;
  caps?: number;
  capPercent?: number;
  capSec?: number;
};

type MatchDetail = {
  id: number;
  map_name: string | null;
  home_score: number;
  away_score: number;
  home_team_name: string | null;
  away_team_name: string | null;
  blue_players: string[];
  red_players: string[];
  duration_seconds: number;
  played_at: string;
  player_stats: RawPlayerStat[];
};

type PlayerStatsRow = {
  login: string;
  nickname: string;
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
  team: string;
};

const columns: Array<{ label: string; key: keyof PlayerStatsRow }> = [
  { label: "Login", key: "login" },
  { label: "Nickname", key: "nickname" },
  { label: "Points", key: "points" },
  { label: "Damage", key: "damage" },
  { label: "Ball Hits", key: "ballHits" },
  { label: "Kills", key: "kills" },
  { label: "Deaths", key: "deaths" },
  { label: "Kd Ratio", key: "kdRatio" },
  { label: "Accuracy", key: "accuracy" },
  { label: "Shots", key: "shots" },
  { label: "Passes", key: "passes" },
  { label: "Catches", key: "catches" },
  { label: "Backstabs", key: "backstabs" },
  { label: "Backspaced", key: "backspaced" },
  { label: "Ball Given Away", key: "ballGivenAway" },
  { label: "Ball Stolen", key: "ballStolen" },
  { label: "Ball Possession", key: "ballPossession" },
  { label: "Near Misses", key: "nearMisses" },
  { label: "Capture Tries", key: "captureTries" },
  { label: "Caps", key: "caps" },
  { label: "Cap %", key: "capPercent" },
  { label: "Cap Sec", key: "capSec" },
  { label: "Team", key: "team" },
];

const defaultVisibleKeys: Array<keyof PlayerStatsRow> = [
  "login",
  "nickname",
  "points",
  "damage",
  "ballHits",
  "kills",
  "deaths",
  "kdRatio",
  "accuracy",
  "shots",
  "passes",
  "catches",
  "caps",
  "capPercent",
  "team",
];

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function formatCellValue(
  key: keyof PlayerStatsRow,
  value: PlayerStatsRow[keyof PlayerStatsRow],
): string {
  if (typeof value === "string") return value;
  if (key === "kdRatio" || key === "accuracy" || key === "capPercent") {
    return value.toFixed(2);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params?.id as string | undefined;

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] =
    useState<Array<keyof PlayerStatsRow>>(defaultVisibleKeys);
  const [sortKey, setSortKey] = useState<keyof PlayerStatsRow>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (!matchId) return;

    const fetchMatch = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `http://localhost:3001/api/last-games/GetOne/${matchId}`,
        );
        if (!res.ok) {
          throw new Error("Match not found");
        }
        const data = (await res.json()) as MatchDetail;
        setMatch(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match");
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [matchId]);

  const playerRows = useMemo(() => {
    if (!match) return [];

    const rows: PlayerStatsRow[] = (match.player_stats || []).map((stat) => ({
      login: stat.login?.trim() || "",
      nickname: (stat.nickname?.trim() || stat.login?.trim() || "").substring(
        0,
        50,
      ),
      points: toNumber(stat.points),
      damage: toNumber(stat.damage),
      ballHits: toNumber(stat.ballHits),
      kills: toNumber(stat.kills),
      deaths: toNumber(stat.deaths),
      kdRatio: round(toNumber(stat.kdRatio)),
      accuracy: round(toNumber(stat.accuracy)),
      shots: toNumber(stat.shots),
      passes: toNumber(stat.passes),
      catches: toNumber(stat.catches),
      backstabs: toNumber(stat.backstabs),
      backspaced: toNumber(stat.backspaced),
      ballGivenAway: toNumber(stat.ballGivenAway),
      ballStolen: toNumber(stat.ballStolen),
      ballPossession: toNumber(stat.ballPossession),
      nearMisses: toNumber(stat.nearMisses),
      captureTries: toNumber(stat.captureTries),
      caps: toNumber(stat.caps),
      capPercent: round(toNumber(stat.capPercent)),
      capSec: round(toNumber(stat.capSec)),
      team: (stat.team?.trim() || "-").toLowerCase(),
    }));

    return rows;
  }, [match]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [visibleKeys],
  );

  const sortedRows = useMemo(() => {
    return [...playerRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [playerRows, sortKey, sortDir]);

  const useHorizontalScroll = visibleColumns.length > defaultVisibleKeys.length;

  const winningTeam =
    match && match.home_score > match.away_score
      ? "blue"
      : match && match.away_score > match.home_score
        ? "red"
        : null;

  const winningPlayers = useMemo(() => {
    if (!match || !winningTeam) return [];
    return winningTeam === "blue" ? match.blue_players : match.red_players;
  }, [match, winningTeam]);

  function handleSort(key: keyof PlayerStatsRow) {
    if (key === sortKey) {
      setSortDir((currentDir) => (currentDir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleColumn(key: keyof PlayerStatsRow) {
    setVisibleKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }

  if (loading) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-slate-400">Chargement...</div>
        </section>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
        <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
          <div className="text-red-400">{error || "Match not found"}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4 gap-4">
      {/* Match Header */}
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="space-y-4">
          {/* Map and Score */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold text-white">
                {match.map_name || "Unknown Map"}
              </h1>
              <p className="text-sm text-slate-400">
                {new Date(match.played_at).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-4 items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">
                  {match.home_team_name || "Blue"}
                </p>
                <p
                  className={`text-3xl font-bold px-4 py-2 rounded ${
                    match.home_score > match.away_score
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {match.home_score}
                </p>
              </div>
              <p className="text-2xl text-slate-500 font-bold">vs</p>
              <div className="text-center">
                <p className="text-sm text-slate-400 mb-1">
                  {match.away_team_name || "Red"}
                </p>
                <p
                  className={`text-3xl font-bold px-4 py-2 rounded ${
                    match.away_score > match.home_score
                      ? "bg-red-600 text-white"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {match.away_score}
                </p>
              </div>
            </div>
          </div>

          {/* Winning Team Info */}
          {winningTeam && (
            <div className="border-t border-white/10 pt-4">
              <p className="text-sm text-slate-400 mb-2">
                {winningTeam === "blue" ? "Blue" : "Red"} team wins!
              </p>
              <div className="flex flex-wrap gap-2">
                {winningPlayers.map((login) => (
                  <span
                    key={login}
                    className={`px-3 py-1 rounded-full text-sm font-medium text-white ${
                      winningTeam === "blue"
                        ? "bg-blue-600/50 border border-blue-400"
                        : "bg-red-600/50 border border-red-400"
                    }`}
                  >
                    {login}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Player Stats Table */}
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            Player Stats
          </h2>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200 hover:text-cyan-100">
              Columns ({visibleColumns.length}/{columns.length})
            </summary>
            <div className="absolute right-0 z-30 mt-2 max-h-80 w-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-xl shadow-black/40">
              <p className="mb-2 text-xs font-semibold tracking-wide text-slate-300 uppercase">
                Show / Hide columns
              </p>
              <div className="space-y-1.5">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm text-slate-200 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={visibleKeys.includes(column.key)}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <span>{column.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>

        <div
          className={
            useHorizontalScroll ? "overflow-x-auto" : "overflow-x-hidden"
          }
        >
          <table
            className={
              useHorizontalScroll ? "min-w-full w-max" : "w-full table-fixed"
            }
          >
            <thead>
              <tr className="border-y border-white/10 bg-slate-950/70">
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleSort(column.key)}
                    className="cursor-pointer select-none px-3 py-2 text-left text-xs font-semibold tracking-wide text-slate-300 uppercase transition hover:text-cyan-200"
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {sortKey === column.key ? (
                        <span className="text-cyan-400">
                          {sortDir === "desc" ? "v" : "^"}
                        </span>
                      ) : (
                        <span className="text-slate-600">+-</span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((player) => (
                <tr
                  key={player.login}
                  className={`border-b border-white/8 ${
                    player.team === "blue" ? "bg-blue-900/20" : "bg-red-900/20"
                  }`}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className="px-3 py-2 text-sm text-slate-100 whitespace-nowrap"
                    >
                      {formatCellValue(column.key, player[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
