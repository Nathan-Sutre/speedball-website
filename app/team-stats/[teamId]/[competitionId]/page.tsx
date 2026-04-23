"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMapWinRatePercent } from "@/app/lib/team-stats-data";
import {
  fetchTeamById,
  TeamCompetition,
  TeamProfile,
} from "@/app/lib/api-client";

export default function TeamCompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const competitionId = params.competitionId as string;

  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [competition, setCompetition] = useState<TeamCompetition | null>(null);

  useEffect(() => {
    fetchTeamById(teamId)
      .then((t) => {
        if (!t) {
          router.push("/team-stats");
          return;
        }
        const c =
          t.competitions.find((item) => item.id === competitionId) ?? null;
        if (!c) {
          router.push(`/team-stats/${teamId}`);
          return;
        }
        setTeam(t);
        setCompetition(c);
      })
      .catch(() => router.push("/team-stats"));
  }, [teamId, competitionId, router]);

  if (!team || !competition) {
    return null;
  }

  const won = competition.matches.filter(
    (match) => match.result === "win",
  ).length;
  const draw = competition.matches.filter(
    (match) => match.scoreFor === match.scoreAgainst,
  ).length;
  const lost = competition.matches.filter(
    (match) => match.result === "loss",
  ).length;
  const penalties = 0;
  const mapsWon = competition.matches.reduce(
    (total, match) => total + match.scoreFor,
    0,
  );
  const mapsLost = competition.matches.reduce(
    (total, match) => total + match.scoreAgainst,
    0,
  );
  const total = won * 3 + draw - penalties;

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            {team.name} - {competition.name}
          </h1>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-slate-300">
            Matches played: {competition.matches.length}
          </span>
        </div>

        <div className="mb-4 rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">
            Tournament Summary
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-2 py-2 text-left">Team</th>
                  <th className="px-2 py-2 text-right">Win</th>
                  <th className="px-2 py-2 text-right">Draw</th>
                  <th className="px-2 py-2 text-right">Defeat</th>
                  <th className="px-2 py-2 text-right">Penalties</th>
                  <th className="px-2 py-2 text-right">Map Win</th>
                  <th className="px-2 py-2 text-right">Map Lost</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-slate-200">
                  <td className="px-2 py-2 font-medium text-slate-100">
                    {team.name}
                  </td>
                  <td className="px-2 py-2 text-right text-green-300">{won}</td>
                  <td className="px-2 py-2 text-right text-slate-300">
                    {draw}
                  </td>
                  <td className="px-2 py-2 text-right text-red-300">{lost}</td>
                  <td className="px-2 py-2 text-right text-red-300">
                    -{penalties}
                  </td>
                  <td className="px-2 py-2 text-right">{mapsWon}</td>
                  <td className="px-2 py-2 text-right">-{mapsLost}</td>
                  <td className="px-2 py-2 text-right font-semibold text-white">
                    {total}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">
            Map Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-300">
                  <th className="px-2 py-2 text-left">Map</th>
                  <th className="px-2 py-2 text-right">Pick Count</th>
                  <th className="px-2 py-2 text-right">Ban Count</th>
                  <th className="px-2 py-2 text-right">Played Count</th>
                  <th className="px-2 py-2 text-right">Won Count</th>
                  <th className="px-2 py-2 text-right">Won When Picked</th>
                  <th className="px-2 py-2 text-right">Won Without Picking</th>
                  <th className="px-2 py-2 text-right">Winrate</th>
                </tr>
              </thead>
              <tbody>
                {competition.mapStats.map((map) => (
                  <tr
                    key={map.mapName}
                    className="border-b border-white/5 text-slate-200"
                  >
                    <td className="px-2 py-2 font-medium text-slate-100">
                      {map.mapName}
                    </td>
                    <td className="px-2 py-2 text-right">{map.pickedCount}</td>
                    <td className="px-2 py-2 text-right">{map.bannedCount}</td>
                    <td className="px-2 py-2 text-right">{map.playedCount}</td>
                    <td className="px-2 py-2 text-right">{map.wonCount}</td>
                    <td className="px-2 py-2 text-right">
                      {map.wonWhenPickedCount}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {map.wonWhenNotPickedCount}
                    </td>
                    <td className="px-2 py-2 text-right text-cyan-200 font-semibold">
                      {getMapWinRatePercent(map.wonCount, map.playedCount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
