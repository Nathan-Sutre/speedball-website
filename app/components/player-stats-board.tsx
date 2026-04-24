"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayerStats,
  fetchTournamentEditions,
  PlayerStatsRow,
  TournamentFilterType,
  TournamentType,
} from "@/app/lib/api-client";

type PlayerStats = PlayerStatsRow;

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

const tournamentTypes: TournamentType[] = ["sbl", "sbc", "funcup", "teamcup"];

function formatTournamentType(type: TournamentFilterType): string {
  if (type === "sbl") return "SBL";
  if (type === "sbc") return "SBC";
  if (type === "funcup") return "Funcup";
  if (type === "teamcup") return "Teamcup";
  if (type === "public") return "Public";
  return "All";
}

export default function PlayerStatsBoard() {
  const [rows, setRows] = useState<PlayerStats[]>([]);
  const [visibleKeys, setVisibleKeys] =
    useState<Array<keyof PlayerStats>>(defaultVisibleKeys);
  const [sortKey, setSortKey] = useState<keyof PlayerStats>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [typeFilter, setTypeFilter] = useState<TournamentFilterType>("all");
  const [editionOptions, setEditionOptions] = useState<number[]>([]);
  const [editionFilter, setEditionFilter] = useState<number | null>(null);

  useEffect(() => {
    const showEdition = tournamentTypes.includes(typeFilter as TournamentType);
    if (!showEdition) {
      setEditionOptions([]);
      setEditionFilter(null);
      return;
    }

    fetchTournamentEditions(typeFilter as TournamentType)
      .then((editions) => {
        setEditionOptions(editions);
        setEditionFilter((current) => {
          if (current && editions.includes(current)) return current;
          return editions[0] ?? null;
        });
      })
      .catch((error) => {
        console.error(error);
        setEditionOptions([]);
        setEditionFilter(null);
      });
  }, [typeFilter]);

  useEffect(() => {
    const showEdition = tournamentTypes.includes(typeFilter as TournamentType);
    const effectiveEdition = showEdition ? editionFilter : null;

    if (showEdition && effectiveEdition === null) {
      setRows([]);
      return;
    }

    fetchPlayerStats({ type: typeFilter, edition: effectiveEdition })
      .then(setRows)
      .catch((error) => {
        console.error(error);
        setRows([]);
      });
  }, [typeFilter, editionFilter]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [visibleKeys],
  );

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [rows, sortKey, sortDir]);

  const useHorizontalScroll = visibleColumns.length > defaultVisibleKeys.length;
  const showEditionFilter = tournamentTypes.includes(
    typeFilter as TournamentType,
  );

  function handleSort(key: keyof PlayerStats) {
    if (key === sortKey) {
      setSortDir((currentDir) => (currentDir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleColumn(key: keyof PlayerStats) {
    setVisibleKeys((current) => {
      if (current.includes(key)) {
        if (current.length === 1) return current;
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
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as TournamentFilterType)
            }
            className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
          >
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="sbl">SBL</option>
            <option value="sbc">SBC</option>
            <option value="funcup">Funcup</option>
            <option value="teamcup">Teamcup</option>
          </select>

          {showEditionFilter && (
            <select
              value={editionFilter ?? ""}
              onChange={(e) => setEditionFilter(Number(e.target.value))}
              className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
              disabled={editionOptions.length === 0}
            >
              {editionOptions.length === 0 ? (
                <option value="">No editions</option>
              ) : (
                editionOptions.map((num) => (
                  <option key={num} value={num}>
                    {formatTournamentType(typeFilter)} #{num}
                  </option>
                ))
              )}
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

            {sortedRows.length === 0 && (
              <tr>
                <td
                  colSpan={visibleColumns.length || 1}
                  className="px-3 py-6 text-center text-sm text-slate-400"
                >
                  No player stats for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
