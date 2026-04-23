"use client";

import { useMemo, useState } from "react";
import data from "@/data/data.json";

type PlayerStats = {
  login: string;
  nickname: string;
  rank: number;
  ladderPoints: number;
  points: number;
  damage: number;
  shots: number;
  kills: number;
  deaths: number;
  kdRatio: number;
  accuracy: string;
  passesDone: number;
  passesReceived: number;
  ballHits: number;
  backstabs: number;
  backspaced: number;
  ballGivenAway: number;
  ballStolen: number;
  ballPossession: string;
  nearMisses: number;
  captureTries: number;
  captures: number;
  captureTotalPercent: string;
  captureTotalTime: string;
  playtime: string;
  mapsPlayed: number;
  wonMap: number;
};

const columns: Array<{ label: string; key: keyof PlayerStats }> = [
  { label: "Login", key: "login" },
  { label: "Nickname", key: "nickname" },
  { label: "Rank", key: "rank" },
  { label: "Ladder Points", key: "ladderPoints" },
  { label: "Points", key: "points" },
  { label: "Damage", key: "damage" },
  { label: "Shots", key: "shots" },
  { label: "Kills", key: "kills" },
  { label: "Deaths", key: "deaths" },
  { label: "Kd Ratio", key: "kdRatio" },
  { label: "Accuracy", key: "accuracy" },
  { label: "Passes Done", key: "passesDone" },
  { label: "Passes Received", key: "passesReceived" },
  { label: "Ball Hits", key: "ballHits" },
  { label: "Backstabs", key: "backstabs" },
  { label: "Backspaced", key: "backspaced" },
  { label: "Ball Given Away", key: "ballGivenAway" },
  { label: "Ball Stolen", key: "ballStolen" },
  { label: "Ball Possession", key: "ballPossession" },
  { label: "Near Misses", key: "nearMisses" },
  { label: "Capture Tries", key: "captureTries" },
  { label: "Captures", key: "captures" },
  { label: "Capture Total Percent", key: "captureTotalPercent" },
  { label: "Capture Total Time", key: "captureTotalTime" },
  { label: "Playtime", key: "playtime" },
  { label: "Maps Played", key: "mapsPlayed" },
  { label: "Won Map", key: "wonMap" },
];

const defaultVisibleKeys: Array<keyof PlayerStats> = [
  "login",
  "nickname",
  "rank",
  "ladderPoints",
  "points",
  "damage",
  "shots",
  "kills",
  "deaths",
  "kdRatio",
  "accuracy",
  "passesDone",
  "passesReceived",
  "ballHits",
];

type Mode =
  | "public"
  | "all"
  | "speedball league"
  | "speedball championship"
  | "funcup"
  | "teamcup"
  | "fastcup";

const modeMaxValues: Record<Exclude<Mode, "public" | "all">, number> = {
  "speedball league": 5,
  "speedball championship": 3,
  funcup: 2,
  teamcup: 4,
  fastcup: 2,
};

const demoRows: PlayerStats[] = data.playerStats as PlayerStats[];

export default function PlayerStatsBoard() {
  const [visibleKeys, setVisibleKeys] =
    useState<Array<keyof PlayerStats>>(defaultVisibleKeys);

  const [sortKey, setSortKey] = useState<keyof PlayerStats>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [mode, setMode] = useState<Mode>("public");
  const [seasonValue, setSeasonValue] = useState<number>(1);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [visibleKeys],
  );

  const sortedRows = useMemo(() => {
    return [...demoRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [sortKey, sortDir]);

  const useHorizontalScroll = visibleColumns.length > defaultVisibleKeys.length;

  const isPublic = mode === "public" || mode === "all";
  const maxValue = isPublic
    ? 1
    : modeMaxValues[mode as Exclude<Mode, "public" | "all">];
  const seasonOptions = Array.from(
    { length: maxValue },
    (_, i) => maxValue - i,
  );

  function handleSort(key: keyof PlayerStats) {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleColumn(key: keyof PlayerStats) {
    setVisibleKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== key);
      }

      return [...current, key];
    });
  }

  return (
    <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
      <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Player Stats
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setSeasonValue(1);
            }}
            className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
          >
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="speedball league">Speedball League</option>
            <option value="speedball championship">
              Speedball Championship
            </option>
            <option value="funcup">Funcup</option>
            <option value="teamcup">Teamcup</option>
            <option value="fastcup">Fastcup</option>
          </select>

          {!isPublic && (
            <select
              value={seasonValue}
              onChange={(e) => setSeasonValue(Number(e.target.value))}
              className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
            >
              {seasonOptions.map((num) => (
                <option key={num} value={num}>
                  #{num}
                </option>
              ))}
            </select>
          )}
        </div>
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
        className={`${useHorizontalScroll ? "overflow-x-auto" : "overflow-x-hidden"} flex-1 min-h-0 overflow-y-auto`}
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
                        {sortDir === "desc" ? "↓" : "↑"}
                      </span>
                    ) : (
                      <span className="text-slate-600">↕</span>
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
                className="border-b border-white/8 bg-slate-950/40"
              >
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-2 text-sm text-slate-100 whitespace-nowrap"
                  >
                    {String(player[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
