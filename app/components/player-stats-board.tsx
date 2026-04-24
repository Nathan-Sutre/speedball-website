"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  fetchPlayerStatsRaw,
  fetchTournaments,
  PlayerMatchStatsRaw,
  Tournament,
  TournamentFilterType,
  TournamentType,
} from "@/app/lib/api-client";

type TournamentSelection = "all" | number;

type PlayerStatsAggregated = {
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
  matchesPlayed: number;
};

const tournamentTypes: TournamentType[] = ["sbl", "sbc", "funcup", "teamcup"];

const columns: Array<{ label: string; key: keyof PlayerStatsAggregated }> = [
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
  { label: "Matches", key: "matchesPlayed" },
];

const defaultVisibleKeys: Array<keyof PlayerStatsAggregated> = [
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
  "matchesPlayed",
];

function formatTournamentType(type: TournamentFilterType): string {
  if (type === "sbl") return "SBL";
  if (type === "sbc") return "SBC";
  if (type === "funcup") return "Funcup";
  if (type === "teamcup") return "Teamcup";
  if (type === "public") return "Public";
  return "All";
}

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function round(value: number): number {
  return Number(value.toFixed(2));
}

function formatCellValue(
  key: keyof PlayerStatsAggregated,
  value: PlayerStatsAggregated[keyof PlayerStatsAggregated],
): string {
  if (typeof value === "string") return value;
  if (key === "kdRatio" || key === "accuracy" || key === "capPercent") {
    return value.toFixed(2);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function PlayerStatsBoard() {
  const [rawRows, setRawRows] = useState<PlayerMatchStatsRaw[]>([]);
  const [visibleKeys, setVisibleKeys] =
    useState<Array<keyof PlayerStatsAggregated>>(defaultVisibleKeys);
  const [sortKey, setSortKey] = useState<keyof PlayerStatsAggregated>("points");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [aggregationMode, setAggregationMode] = useState<"total" | "avgMin">(
    "total",
  );

  const [typeFilter, setTypeFilter] = useState<TournamentFilterType>("all");
  const [tournamentFilter, setTournamentFilter] =
    useState<TournamentSelection>("all");
  const [tournamentOptions, setTournamentOptions] = useState<Tournament[]>([]);

  useEffect(() => {
    fetchPlayerStatsRaw({ type: "all" })
      .then(setRawRows)
      .catch((error) => {
        console.error(error);
        setRawRows([]);
      });
  }, []);

  useEffect(() => {
    const showTournamentDropdown = tournamentTypes.includes(
      typeFilter as TournamentType,
    );

    setTournamentFilter("all");
    if (!showTournamentDropdown) {
      setTournamentOptions([]);
      return;
    }

    fetchTournaments({ type: typeFilter as TournamentType })
      .then((rows) => {
        const unique = Array.from(
          new Map(rows.map((row) => [row.id, row])).values(),
        );
        setTournamentOptions(unique);
      })
      .catch((error) => {
        console.error(error);
        setTournamentOptions([]);
      });
  }, [typeFilter]);

  const filteredRawRows = useMemo(() => {
    let rows = rawRows;

    if (typeFilter === "public") {
      rows = rows.filter(
        (row) => !row.tournament_id || row.tournament_type === "public",
      );
    } else if (typeFilter !== "all") {
      rows = rows.filter((row) => row.tournament_type === typeFilter);
    }

    if (tournamentFilter !== "all") {
      rows = rows.filter((row) => row.tournament_id === tournamentFilter);
    }

    return rows;
  }, [rawRows, typeFilter, tournamentFilter]);

  const aggregatedRows = useMemo(() => {
    const byPlayer = new Map<
      string,
      {
        count: number;
        totalMinutes: number;
        login: string;
        nickname: string;
        team: string;
        sums: Omit<
          PlayerStatsAggregated,
          "login" | "nickname" | "team" | "matchesPlayed"
        >;
      }
    >();

    for (const row of filteredRawRows) {
      const key = row.login.trim().toLowerCase();
      if (!key) continue;

      const current = byPlayer.get(key) ?? {
        count: 0,
        totalMinutes: 0,
        login: row.login,
        nickname: row.nickname?.trim() || row.login,
        team: row.team?.trim() || "-",
        sums: {
          points: 0,
          damage: 0,
          ballHits: 0,
          kills: 0,
          deaths: 0,
          kdRatio: 0,
          accuracy: 0,
          shots: 0,
          passes: 0,
          catches: 0,
          backstabs: 0,
          backspaced: 0,
          ballGivenAway: 0,
          ballStolen: 0,
          ballPossession: 0,
          nearMisses: 0,
          captureTries: 0,
          caps: 0,
          capPercent: 0,
          capSec: 0,
        },
      };

      current.count += 1;
      current.totalMinutes += (row.duration_seconds || 0) / 60;
      current.sums.points += toNumber(row.points);
      current.sums.damage += toNumber(row.damage);
      current.sums.ballHits += toNumber(row.ballHits);
      current.sums.kills += toNumber(row.kills);
      current.sums.deaths += toNumber(row.deaths);
      current.sums.kdRatio += toNumber(row.kdRatio);
      current.sums.accuracy += toNumber(row.accuracy);
      current.sums.shots += toNumber(row.shots);
      current.sums.passes += toNumber(row.passes);
      current.sums.catches += toNumber(row.catches);
      current.sums.backstabs += toNumber(row.backstabs);
      current.sums.backspaced += toNumber(row.backspaced);
      current.sums.ballGivenAway += toNumber(row.ballGivenAway);
      current.sums.ballStolen += toNumber(row.ballStolen);
      current.sums.ballPossession += toNumber(row.ballPossession);
      current.sums.nearMisses += toNumber(row.nearMisses);
      current.sums.captureTries += toNumber(row.captureTries);
      current.sums.caps += toNumber(row.caps);
      current.sums.capPercent += toNumber(row.capPercent);
      current.sums.capSec += toNumber(row.capSec);

      byPlayer.set(key, current);
    }

    const rows: PlayerStatsAggregated[] = [];
    for (const player of byPlayer.values()) {
      const divisor =
        aggregationMode === "avgMin"
          ? Math.max(player.totalMinutes, 1)
          : Math.max(player.count, 1);

      rows.push({
        login: player.login,
        nickname: player.nickname,
        team: player.team,
        points: round(player.sums.points / divisor),
        damage: round(player.sums.damage / divisor),
        ballHits: round(player.sums.ballHits / divisor),
        kills: round(player.sums.kills / divisor),
        deaths: round(player.sums.deaths / divisor),
        kdRatio: round(player.sums.kdRatio / divisor),
        accuracy: round(player.sums.accuracy / divisor),
        shots: round(player.sums.shots / divisor),
        passes: round(player.sums.passes / divisor),
        catches: round(player.sums.catches / divisor),
        backstabs: round(player.sums.backstabs / divisor),
        backspaced: round(player.sums.backspaced / divisor),
        ballGivenAway: round(player.sums.ballGivenAway / divisor),
        ballStolen: round(player.sums.ballStolen / divisor),
        ballPossession: round(player.sums.ballPossession / divisor),
        nearMisses: round(player.sums.nearMisses / divisor),
        captureTries: round(player.sums.captureTries / divisor),
        caps: round(player.sums.caps / divisor),
        capPercent: round(player.sums.capPercent / divisor),
        capSec: round(player.sums.capSec / divisor),
        matchesPlayed:
          aggregationMode === "avgMin"
            ? round(player.totalMinutes)
            : player.count,
      });
    }

    return rows;
  }, [filteredRawRows, aggregationMode]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleKeys.includes(column.key)),
    [visibleKeys],
  );

  const sortedRows = useMemo(() => {
    return [...aggregatedRows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "desc" ? -cmp : cmp;
    });
  }, [aggregatedRows, sortKey, sortDir]);

  const useHorizontalScroll = visibleColumns.length > defaultVisibleKeys.length;
  const showTournamentDropdown = tournamentTypes.includes(
    typeFilter as TournamentType,
  );

  function handleSort(key: keyof PlayerStatsAggregated) {
    if (key === sortKey) {
      setSortDir((currentDir) => (currentDir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function toggleColumn(key: keyof PlayerStatsAggregated) {
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
          <div className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/70 px-1 py-1">
            <button
              onClick={() => setAggregationMode("total")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                aggregationMode === "total"
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400"
                  : "text-cyan-200/60 hover:text-cyan-200"
              }`}
            >
              Total Values
            </button>
            <button
              onClick={() => setAggregationMode("avgMin")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                aggregationMode === "avgMin"
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400"
                  : "text-cyan-200/60 hover:text-cyan-200"
              }`}
            >
              Avg / Min
            </button>
          </div>

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

          {showTournamentDropdown && (
            <select
              value={
                tournamentFilter === "all" ? "all" : String(tournamentFilter)
              }
              onChange={(e) =>
                setTournamentFilter(
                  e.target.value === "all" ? "all" : Number(e.target.value),
                )
              }
              className="rounded-full border border-cyan-300/30 bg-slate-950/70 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
            >
              <option value="all">
                All {formatTournamentType(typeFilter)}
              </option>
              {tournamentOptions.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {formatTournamentType(tournament.type)} #{tournament.edition}
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
                    {column.key === "matchesPlayed" &&
                    aggregationMode === "avgMin"
                      ? "Minutes"
                      : column.label}
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
                className="border-b border-white/8 bg-slate-950/40 hover:bg-slate-800/30 transition"
              >
                {visibleColumns.map((column) => {
                  const isLoginColumn = column.key === "login";
                  return (
                    <td
                      key={column.key}
                      className="px-3 py-2 text-sm text-slate-100 whitespace-nowrap"
                    >
                      {isLoginColumn ? (
                        <Link
                          href={`/players/${player.login}`}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline"
                        >
                          {formatCellValue(column.key, player[column.key])}
                        </Link>
                      ) : (
                        formatCellValue(column.key, player[column.key])
                      )}
                    </td>
                  );
                })}
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
