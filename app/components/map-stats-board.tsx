"use client";

import { useEffect, useState } from "react";
import {
  fetchMapStats,
  fetchTournamentEditions,
  MapStatsRow,
  TournamentFilterType,
  TournamentType,
} from "@/app/lib/api-client";

const tournamentTypes: TournamentType[] = ["sbl", "sbc", "funcup", "teamcup"];

function formatTournamentType(type: TournamentFilterType): string {
  if (type === "sbl") return "SBL";
  if (type === "sbc") return "SBC";
  if (type === "funcup") return "Funcup";
  if (type === "teamcup") return "Teamcup";
  if (type === "public") return "Public";
  return "All";
}

export default function MapStatsBoard() {
  const [rows, setRows] = useState<MapStatsRow[]>([]);
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

    fetchMapStats({ type: typeFilter, edition: effectiveEdition })
      .then(setRows)
      .catch((error) => {
        console.error(error);
        setRows([]);
      });
  }, [typeFilter, editionFilter]);

  const showEditionFilter = tournamentTypes.includes(
    typeFilter as TournamentType,
  );

  return (
    <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white sm:text-xl">
          Map Stats
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
      </div>

      <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-white/10 bg-slate-950/40">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-slate-950/70 text-slate-300">
              <th className="px-3 py-2 text-left">Map</th>
              <th className="px-3 py-2 text-right">Played</th>
              <th className="px-3 py-2 text-right">Wins</th>
              <th className="px-3 py-2 text-right">Blue Wins</th>
              <th className="px-3 py-2 text-right">Red Wins</th>
              <th className="px-3 py-2 text-right">Draws</th>
              <th className="px-3 py-2 text-right">Winrate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const winrate =
                row.playedCount > 0
                  ? ((row.wonCount / row.playedCount) * 100).toFixed(1)
                  : "0.0";
              return (
                <tr
                  key={`${row.mapId}-${row.mapName}`}
                  className="border-b border-white/8 text-slate-200"
                >
                  <td className="px-3 py-2 text-slate-100">{row.mapName}</td>
                  <td className="px-3 py-2 text-right">{row.playedCount}</td>
                  <td className="px-3 py-2 text-right">{row.wonCount}</td>
                  <td className="px-3 py-2 text-right">{row.blueWins}</td>
                  <td className="px-3 py-2 text-right">{row.redWins}</td>
                  <td className="px-3 py-2 text-right">{row.draws}</td>
                  <td className="px-3 py-2 text-right text-cyan-200">
                    {winrate}%
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center text-slate-400"
                >
                  No map stats for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
