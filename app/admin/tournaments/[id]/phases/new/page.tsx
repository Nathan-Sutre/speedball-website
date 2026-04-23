"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addCustomPhase, getCustomPhases } from "@/app/lib/custom-phases";
import { getTournamentById } from "@/app/lib/tournaments-data";
import { savePhaseRuntimeState } from "@/app/lib/phase-runtime";
import { teamsStatsData } from "../../../../../lib/team-stats-data";

type PhaseFormat =
  | "round-robin"
  | "swiss-round"
  | "single-elimination"
  | "double-elimination"
  | "double-elimination-half-lb";

const phaseFormats: { id: PhaseFormat; label: string; description: string }[] =
  [
    {
      id: "round-robin",
      label: "Round-Robin",
      description: "Every team plays against every other team",
    },
    {
      id: "swiss-round",
      label: "Swiss Round",
      description: "Teams are paired based on their performance",
    },
    {
      id: "single-elimination",
      label: "Single Elimination Bracket",
      description: "Lose once and you're out",
    },
    {
      id: "double-elimination",
      label: "Double Elimination Bracket",
      description: "Lose twice to be eliminated",
    },
    {
      id: "double-elimination-half-lb",
      label: "Double Elimination - Half Loser Bracket",
      description:
        "Half starts in Winners Bracket, half starts in Losers Bracket",
    },
  ];

export default function NewPhasePage() {
  const params = useParams();
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<PhaseFormat | null>(
    null,
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [swissRounds, setSwissRounds] = useState(3);

  const tournamentId = params.id as string;

  function normalizeTournamentName(value: string): string {
    return value.trim().toLowerCase();
  }

  useEffect(() => {
    const adminStatus = localStorage.getItem("isAdmin") === "true";
    setIsAdmin(adminStatus);
    if (!adminStatus) {
      router.push("/tournaments");
    }
  }, [router]);

  const handleCreatePhase = async () => {
    if (!selectedFormat) return;

    setIsLoading(true);

    const tournament = getTournamentById(tournamentId);
    if (!tournament) {
      router.push("/tournaments");
      return;
    }

    const currentCount =
      tournament.phases.length + getCustomPhases(tournamentId).length;
    const selectedConfig = phaseFormats.find(
      (format) => format.id === selectedFormat,
    );

    const phaseName = `${selectedConfig?.label ?? "Phase"} ${currentCount + 1}`;
    addCustomPhase(tournamentId, {
      name: phaseName,
      teams: [],
    });

    const tournamentTeamNames = teamsStatsData
      .filter((team) =>
        team.competitions.some(
          (competition) =>
            normalizeTournamentName(competition.name) ===
            normalizeTournamentName(tournament.name),
        ),
      )
      .map((team) => team.name);

    const participants = Array.from(
      new Set([
        ...tournament.phases.flatMap((phase) =>
          phase.teams.map((team) => team.name),
        ),
        ...tournamentTeamNames,
      ]),
    );

    savePhaseRuntimeState(tournamentId, phaseName, currentCount, {
      format: selectedFormat,
      participants,
      started: false,
      lockedTeams: false,
      swissTotalRounds:
        selectedFormat === "swiss-round" ? Math.max(1, swissRounds) : 1,
      swissCurrentRound: 1,
      matches: [],
    });

    router.push(`/tournaments/${tournamentId}`);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-4xl flex-col px-2 py-3 sm:px-4 gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-white">Select Phase Format</h1>
      </div>

      {/* Format Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto">
        {phaseFormats.map((format) => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            className={`flex flex-col gap-2 rounded-xl border-2 p-6 transition ${
              selectedFormat === format.id
                ? "border-amber-400 bg-amber-500/10"
                : "border-white/10 bg-slate-800/50 hover:border-cyan-300/50 hover:bg-slate-800/70"
            }`}
          >
            <h3 className="text-lg font-semibold text-white text-left">
              {format.label}
            </h3>
            <p className="text-sm text-slate-300 text-left">
              {format.description}
            </p>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      {selectedFormat === "swiss-round" && (
        <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
          <label
            htmlFor="swiss-rounds"
            className="mb-2 block text-sm text-slate-200"
          >
            Number of Swiss rounds
          </label>
          <input
            id="swiss-rounds"
            type="number"
            min={1}
            max={15}
            value={swissRounds}
            onChange={(event) => setSwissRounds(Number(event.target.value))}
            className="w-32 rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
          />
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-full border border-slate-500 px-6 py-2 font-medium text-slate-300 transition hover:border-slate-400 hover:bg-slate-800/50"
        >
          Cancel
        </button>
        <button
          onClick={handleCreatePhase}
          disabled={!selectedFormat || isLoading}
          className={`flex-1 rounded-full px-6 py-2 font-medium transition ${
            selectedFormat && !isLoading
              ? "border border-amber-200 bg-amber-500 text-white hover:border-amber-100 hover:bg-amber-400"
              : "border border-slate-600 bg-slate-700 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Creating..." : "Create Phase"}
        </button>
      </div>
    </div>
  );
}
