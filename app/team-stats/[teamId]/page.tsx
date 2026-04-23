"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CompetitionType,
  getCompetitionTypeLabel,
} from "@/app/lib/team-stats-data";
import {
  fetchTeamById,
  fetchTournaments,
  TeamProfile,
  Tournament,
} from "@/app/lib/api-client";

export default function TeamCompetitionsPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;

  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filterType, setFilterType] = useState<CompetitionType | "all">("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchTeamById(teamId)
      .then((found) => {
        if (!found) router.push("/team-stats");
        else setTeam(found);
      })
      .catch(() => router.push("/team-stats"));
    fetchTournaments().then(setTournaments).catch(console.error);
  }, [teamId, router]);

  if (!team) return null;

  const filteredCompetitions =
    filterType === "all"
      ? team.competitions
      : team.competitions.filter((c) => c.type === filterType);

  const tournamentOptions = Array.from(
    new Set(tournaments.map((t) => t.name.trim()).filter(Boolean)),
  );

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-white sm:text-xl">
            {team.name} - Competitions
          </h1>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            Filter
            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(event.target.value as CompetitionType | "all")
              }
              className="rounded-lg border border-white/20 bg-slate-950/80 px-2 py-1 text-sm text-slate-100 outline-none transition focus:border-cyan-300"
            >
              <option value="all">All</option>
              <option value="sbl">SBL</option>
              <option value="sbc">SBC</option>
              <option value="teamcup">TeamCup</option>
            </select>
          </label>
        </div>

        {isAdmin && (
          <form
            action="/api/admin/teams"
            method="post"
            className="mb-4 grid grid-cols-1 gap-2 rounded-xl border border-amber-300/25 bg-slate-950/40 p-3 sm:grid-cols-[1fr_auto]"
          >
            <input type="hidden" name="action" value="addCompetition" />
            <input type="hidden" name="teamId" value={team.id} />

            <select
              name="tournament"
              required
              defaultValue={tournamentOptions[0] ?? ""}
              className="rounded-lg border border-white/20 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            >
              {tournamentOptions.length === 0 ? (
                <option value="">No tournament available</option>
              ) : (
                tournamentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))
              )}
            </select>

            <button
              type="submit"
              disabled={tournamentOptions.length === 0}
              className="rounded-lg border border-amber-300/60 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/30"
            >
              Add Competition
            </button>
          </form>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
          <div className="space-y-2">
            {filteredCompetitions.length > 0 ? (
              filteredCompetitions.map((competition) => (
                <Link
                  key={competition.id}
                  href={`/team-stats/${team.id}/${competition.id}`}
                  className="grid grid-cols-1 gap-2 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-3 transition hover:border-cyan-300/50 hover:bg-slate-900/80 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                >
                  <p className="text-sm font-medium text-slate-100">
                    {competition.name}
                  </p>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                    {getCompetitionTypeLabel(competition.type)}
                  </span>
                  <span className="text-xs text-slate-300">
                    {competition.matches.length} matches
                  </span>
                </Link>
              ))
            ) : (
              <p className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-4 text-sm text-slate-400">
                No competition available for this filter.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
