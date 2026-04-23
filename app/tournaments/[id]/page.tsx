"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  fetchTournamentFullById,
  Tournament,
} from "../../lib/tournaments-data";
import { getCustomPhases, removeCustomPhase } from "../../lib/custom-phases";
import { TeamProfile } from "../../lib/team-stats-data";
import {
  addSwissRound,
  createInitialMatches,
  getPhaseRuntimeState,
  PhaseFormat,
  PhaseMatch,
  reportMatchResult,
  savePhaseRuntimeState,
} from "../../lib/phase-runtime";

const formatLabels: Record<PhaseFormat, string> = {
  "round-robin": "Round-Robin",
  "swiss-round": "Swiss Round",
  "single-elimination": "Single Elimination",
  "double-elimination": "Double Elimination",
  "double-elimination-half-lb": "Double Elimination - Half Loser Bracket",
};

function inferFormatFromPhaseName(phaseName: string): PhaseFormat {
  const lower = phaseName.toLowerCase();
  if (lower.includes("swiss")) {
    return "swiss-round";
  }

  if (lower.includes("double")) {
    if (lower.includes("half") || lower.includes("loser")) {
      return "double-elimination-half-lb";
    }

    return "double-elimination";
  }

  if (lower.includes("single") || lower.includes("bracket")) {
    return "single-elimination";
  }

  return "round-robin";
}

function groupRounds(matches: PhaseMatch[]): Array<[number, PhaseMatch[]]> {
  const map = new Map<number, PhaseMatch[]>();

  for (const match of matches) {
    const current = map.get(match.round) ?? [];
    current.push(match);
    map.set(match.round, current);
  }

  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, roundMatches]) => [
      round,
      [...roundMatches].sort((a, b) => a.id.localeCompare(b.id)),
    ]);
}

function getRoundGap(roundIndex: number, baseGap: number): number {
  return baseGap * 2 ** roundIndex;
}

function getRoundTopOffset(
  roundIndex: number,
  cardHeight: number,
  baseGap: number,
): number {
  if (roundIndex === 0) {
    return 0;
  }

  const previousGap = getRoundGap(roundIndex - 1, baseGap);
  return (cardHeight + previousGap) / 2;
}

function computeRoundLayout(
  rounds: Array<[number, PhaseMatch[]]>,
  cardHeight: number,
  baseGap: number,
): { gaps: number[]; topOffsets: number[] } {
  const gaps = rounds.map((_, index) => getRoundGap(index, baseGap));
  const topOffsets: number[] = rounds.map(() => 0);
  let previousCenters: number[] = rounds[0]
    ? rounds[0][1].map(
        (_, index) => cardHeight / 2 + index * (cardHeight + gaps[0]),
      )
    : [];

  for (let roundIndex = 1; roundIndex < rounds.length; roundIndex += 1) {
    const targetCount = rounds[roundIndex][1].length;
    const centers: number[] = [];

    for (let targetIndex = 0; targetIndex < targetCount; targetIndex += 1) {
      const a = previousCenters[targetIndex * 2];
      const b = previousCenters[targetIndex * 2 + 1];

      if (typeof a === "number" && typeof b === "number") {
        centers.push((a + b) / 2);
      } else if (typeof a === "number") {
        centers.push(a);
      } else if (typeof b === "number") {
        centers.push(b);
      }
    }

    const firstCenter = centers[0] ?? cardHeight / 2;
    topOffsets[roundIndex] = Math.max(0, firstCenter - cardHeight / 2);
    previousCenters = centers;
  }

  return { gaps, topOffsets };
}

type BracketGeometry = {
  columnWidth: number;
  columnGap: number;
  cardWidth: number;
  cardHeight: number;
  headerHeight: number;
  headerMarginBottom: number;
};

type ConnectorLayout = {
  width: number;
  height: number;
  paths: string[];
};

function buildConnectorLayout(
  rounds: Array<[number, PhaseMatch[]]>,
  topOffsets: number[],
  gaps: number[],
  geometry: BracketGeometry,
): ConnectorLayout {
  if (rounds.length === 0) {
    return { width: 0, height: 0, paths: [] };
  }

  const width =
    rounds.length * geometry.columnWidth +
    (rounds.length - 1) * geometry.columnGap;

  const cardsTop = geometry.headerHeight + geometry.headerMarginBottom;

  const maxBottom = rounds.reduce((value, [, matches], roundIndex) => {
    if (matches.length === 0) {
      return value;
    }

    const roundGap = gaps[roundIndex] ?? 0;
    const roundTop = cardsTop + (topOffsets[roundIndex] ?? 0);
    const bottom =
      roundTop +
      (matches.length - 1) * (geometry.cardHeight + roundGap) +
      geometry.cardHeight;

    return Math.max(value, bottom);
  }, 0);

  const height = Math.max(maxBottom + 12, geometry.headerHeight + 20);

  const getCardLeft = (roundIndex: number): number =>
    roundIndex * (geometry.columnWidth + geometry.columnGap) +
    (geometry.columnWidth - geometry.cardWidth) / 2;

  const getCenterY = (roundIndex: number, matchIndex: number): number => {
    const roundGap = gaps[roundIndex] ?? 0;
    return (
      cardsTop +
      (topOffsets[roundIndex] ?? 0) +
      matchIndex * (geometry.cardHeight + roundGap) +
      geometry.cardHeight / 2
    );
  };

  const positionByMatchId = new Map<
    string,
    { roundIndex: number; matchIndex: number }
  >();
  rounds.forEach(([, matches], roundIndex) => {
    matches.forEach((match, matchIndex) => {
      positionByMatchId.set(match.id, { roundIndex, matchIndex });
    });
  });

  const paths: string[] = [];

  for (
    let sourceRoundIndex = 0;
    sourceRoundIndex < rounds.length;
    sourceRoundIndex += 1
  ) {
    const sourceMatches = rounds[sourceRoundIndex][1];
    for (
      let sourceMatchIndex = 0;
      sourceMatchIndex < sourceMatches.length;
      sourceMatchIndex += 1
    ) {
      const sourceMatch = sourceMatches[sourceMatchIndex];
      const targetMatchId = sourceMatch.winnerToMatchId;
      if (!targetMatchId) {
        continue;
      }

      const targetPosition = positionByMatchId.get(targetMatchId);
      if (!targetPosition) {
        continue;
      }

      const { roundIndex: targetRoundIndex, matchIndex: targetMatchIndex } =
        targetPosition;
      if (targetRoundIndex <= sourceRoundIndex) {
        continue;
      }

      const sourceRight = getCardLeft(sourceRoundIndex) + geometry.cardWidth;
      const targetLeft = getCardLeft(targetRoundIndex);
      const middleX = sourceRight + (targetLeft - sourceRight) / 2;

      const sy = getCenterY(sourceRoundIndex, sourceMatchIndex);
      const ty = getCenterY(targetRoundIndex, targetMatchIndex);
      paths.push(`M ${sourceRight} ${sy} H ${middleX} V ${ty} H ${targetLeft}`);
    }
  }

  return { width, height, paths };
}

function hasCompatibleDoubleEliminationGraph(matches: PhaseMatch[]): boolean {
  const upper = matches.filter((match) => match.bracket === "wb");
  const lower = matches.filter((match) => match.bracket === "lb");

  if (upper.length === 0 || lower.length === 0) {
    return false;
  }

  const upperIds = new Set(upper.map((match) => match.id));
  const lowerIds = new Set(lower.map((match) => match.id));

  const upperFinal = upper.find(
    (match) => !match.winnerToMatchId || !upperIds.has(match.winnerToMatchId),
  );
  const lowerFinal = lower.find(
    (match) => !match.winnerToMatchId || !lowerIds.has(match.winnerToMatchId),
  );

  if (!upperFinal || !lowerFinal) {
    return false;
  }

  const upperToLower =
    !!upperFinal.winnerToMatchId && lowerIds.has(upperFinal.winnerToMatchId);
  const lowerToUpper =
    !!lowerFinal.winnerToMatchId && upperIds.has(lowerFinal.winnerToMatchId);

  return upperToLower || lowerToUpper;
}

type PhaseEntry = {
  phase: Tournament["phases"][number];
  source: "base" | "custom";
  sourceIndex: number;
  storageIndex: number;
  hiddenKey: string;
};

function getHiddenBasePhasesStorageKey(tournamentId: string): string {
  return `speedball.hiddenBasePhases.${tournamentId}`;
}

function readHiddenBasePhases(tournamentId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(
      getHiddenBasePhasesStorageKey(tournamentId),
    );
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function writeHiddenBasePhases(tournamentId: string, values: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    getHiddenBasePhasesStorageKey(tournamentId),
    JSON.stringify(values),
  );
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params.id as string;

  const [selectedPhase, setSelectedPhase] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [customPhasesCount, setCustomPhasesCount] = useState(0);
  const [hiddenBasePhaseKeys, setHiddenBasePhaseKeys] = useState<string[]>([]);
  const [phaseVersion, setPhaseVersion] = useState(0);
  const [showMatches, setShowMatches] = useState(false);
  const [teams, setTeams] = useState<TeamProfile[]>([]);
  const [selectedSeedSlotKey, setSelectedSeedSlotKey] = useState<string | null>(
    null,
  );
  const [scoreDraftByMatch, setScoreDraftByMatch] = useState<
    Record<string, { a: string; b: string }>
  >({});
  const [scoreEditMatchId, setScoreEditMatchId] = useState<string | null>(null);

  function normalizeTournamentName(value: string): string {
    return value.trim().toLowerCase();
  }

  useEffect(() => {
    const admin = localStorage.getItem("isAdmin") === "true";
    setIsAdmin(admin);

    fetchTournamentFullById(tournamentId)
      .then((payload) => {
        if (!payload) {
          router.push("/tournaments");
        } else {
          setTournament(payload.tournament);
          setTeams(payload.teams);
          setCustomPhasesCount(getCustomPhases(tournamentId).length);
          setHiddenBasePhaseKeys(readHiddenBasePhases(tournamentId));
        }
      })
      .catch(() => router.push("/tournaments"));
  }, [tournamentId, router]);

  const phaseEntries = useMemo(() => {
    if (!tournament) {
      return [] as PhaseEntry[];
    }

    const hidden = new Set(hiddenBasePhaseKeys);
    const baseEntries: PhaseEntry[] = tournament.phases
      .map((phase, index) => ({
        phase,
        source: "base" as const,
        sourceIndex: index,
        storageIndex: index,
        hiddenKey: `${index}::${phase.name}`,
      }))
      .filter((entry) => !hidden.has(entry.hiddenKey));

    const custom = getCustomPhases(tournamentId);
    const customEntries: PhaseEntry[] = custom.map((phase, index) => ({
      phase,
      source: "custom" as const,
      sourceIndex: index,
      storageIndex: tournament.phases.length + index,
      hiddenKey: `custom::${index}::${phase.name}`,
    }));

    return [...baseEntries, ...customEntries];
  }, [customPhasesCount, hiddenBasePhaseKeys, tournament, tournamentId]);

  const phases = useMemo(
    () => phaseEntries.map((entry) => entry.phase),
    [phaseEntries],
  );

  useEffect(() => {
    if (selectedPhase >= phases.length && phases.length > 0) {
      setSelectedPhase(phases.length - 1);
    }
  }, [selectedPhase, phases]);

  useEffect(() => {
    setShowMatches(false);
  }, [selectedPhase]);

  const allTeamPool = useMemo(() => {
    if (!tournament) {
      return [] as string[];
    }

    const teamStatsTournamentNames = teams
      .filter((team) =>
        team.competitions.some(
          (competition) =>
            normalizeTournamentName(competition.name) ===
            normalizeTournamentName(tournament.name),
        ),
      )
      .map((team) => team.name);

    return Array.from(
      new Set([
        ...tournament.phases.flatMap((phase) =>
          phase.teams.map((team) => team.name),
        ),
        ...teamStatsTournamentNames,
      ]),
    );
  }, [tournament, teams]);

  const currentPhase = phases[selectedPhase];
  const currentPhaseStorageIndex = phaseEntries[selectedPhase]?.storageIndex;

  const currentRuntime = useMemo(() => {
    if (!currentPhase) {
      return null;
    }

    return getPhaseRuntimeState(
      tournamentId,
      currentPhase.name,
      currentPhaseStorageIndex ?? selectedPhase,
    );
  }, [
    currentPhase,
    currentPhaseStorageIndex,
    selectedPhase,
    tournamentId,
    phaseVersion,
  ]);

  const effectiveFormat =
    currentRuntime?.format ??
    (currentPhase
      ? inferFormatFromPhaseName(currentPhase.name)
      : "round-robin");

  const effectiveParticipants =
    currentRuntime?.participants ??
    (currentPhase?.teams.length
      ? currentPhase.teams.map((team) => team.name)
      : allTeamPool) ??
    [];

  const isBracketFormat =
    effectiveFormat === "single-elimination" ||
    effectiveFormat === "double-elimination" ||
    effectiveFormat === "double-elimination-half-lb";

  const isDoubleEliminationLike =
    effectiveFormat === "double-elimination" ||
    effectiveFormat === "double-elimination-half-lb";

  const bracketMatches = useMemo(() => {
    if (!isBracketFormat || effectiveParticipants.length < 2) {
      return [] as PhaseMatch[];
    }

    if (currentRuntime?.matches.length) {
      return currentRuntime.matches;
    }

    return createInitialMatches(effectiveFormat, effectiveParticipants);
  }, [currentRuntime, effectiveFormat, effectiveParticipants, isBracketFormat]);

  useEffect(() => {
    if (!currentRuntime || !currentPhase) {
      return;
    }

    if (
      currentRuntime.format !== "double-elimination" &&
      currentRuntime.format !== "double-elimination-half-lb"
    ) {
      return;
    }

    if (hasCompatibleDoubleEliminationGraph(currentRuntime.matches)) {
      return;
    }

    if (effectiveParticipants.length < 2) {
      return;
    }

    const repairedMatches = createInitialMatches(
      currentRuntime.format,
      effectiveParticipants,
    );

    savePhaseRuntimeState(
      tournamentId,
      currentPhase.name,
      currentPhaseStorageIndex ?? selectedPhase,
      {
        ...currentRuntime,
        matches: repairedMatches,
      },
    );

    setPhaseVersion((value) => value + 1);
  }, [
    currentRuntime,
    currentPhase,
    currentPhaseStorageIndex,
    effectiveParticipants,
    selectedPhase,
    tournamentId,
  ]);

  const wbFinalToGrand = useMemo(() => {
    const wbMatches = bracketMatches.filter((match) => match.bracket === "wb");
    const wbIds = new Set(wbMatches.map((match) => match.id));

    const wbFinal = wbMatches.find(
      (match) => !match.winnerToMatchId || !wbIds.has(match.winnerToMatchId),
    );

    return wbFinal ?? null;
  }, [bracketMatches]);

  const lbFinalToGrand = useMemo(() => {
    const lbMatches = bracketMatches.filter((match) => match.bracket === "lb");
    const lbIds = new Set(lbMatches.map((match) => match.id));

    const lbFinal = lbMatches.find(
      (match) => !match.winnerToMatchId || !lbIds.has(match.winnerToMatchId),
    );

    return lbFinal ?? null;
  }, [bracketMatches]);

  const grandFinalId = useMemo(() => {
    if (
      wbFinalToGrand?.winnerToMatchId &&
      lbFinalToGrand?.winnerToMatchId &&
      wbFinalToGrand.winnerToMatchId === lbFinalToGrand.winnerToMatchId
    ) {
      return wbFinalToGrand.winnerToMatchId;
    }

    if (wbFinalToGrand?.winnerToMatchId) {
      return wbFinalToGrand.winnerToMatchId;
    }

    if (lbFinalToGrand?.winnerToMatchId) {
      return lbFinalToGrand.winnerToMatchId;
    }

    return null;
  }, [lbFinalToGrand, wbFinalToGrand]);

  const grandFinalMatch = useMemo(() => {
    if (!grandFinalId) {
      return null;
    }

    return bracketMatches.find((match) => match.id === grandFinalId) ?? null;
  }, [bracketMatches, grandFinalId]);

  const winnersRounds = useMemo(() => {
    const wbMatches = bracketMatches.filter((match) => match.bracket === "wb");
    const filtered =
      isDoubleEliminationLike && grandFinalId
        ? wbMatches.filter((match) => match.id !== grandFinalId)
        : wbMatches;

    return groupRounds(filtered);
  }, [bracketMatches, isDoubleEliminationLike, grandFinalId]);

  const losersRounds = useMemo(
    () => groupRounds(bracketMatches.filter((match) => match.bracket === "lb")),
    [bracketMatches],
  );

  const winnersLayout = useMemo(
    () => computeRoundLayout(winnersRounds, 132, 24),
    [winnersRounds],
  );

  const losersLayout = useMemo(
    () => computeRoundLayout(losersRounds, 132, 18),
    [losersRounds],
  );

  const winnersConnectorLayout = useMemo(
    () =>
      buildConnectorLayout(
        winnersRounds,
        winnersLayout.topOffsets,
        winnersLayout.gaps,
        {
          columnWidth: 320,
          columnGap: 24,
          cardWidth: 300,
          cardHeight: 132,
          headerHeight: 40,
          headerMarginBottom: 12,
        },
      ),
    [winnersLayout.gaps, winnersLayout.topOffsets, winnersRounds],
  );

  const losersConnectorLayout = useMemo(
    () =>
      buildConnectorLayout(
        losersRounds,
        losersLayout.topOffsets,
        losersLayout.gaps,
        {
          columnWidth: 320,
          columnGap: 24,
          cardWidth: 300,
          cardHeight: 132,
          headerHeight: 40,
          headerMarginBottom: 12,
        },
      ),
    [losersLayout.gaps, losersLayout.topOffsets, losersRounds],
  );

  const slotHintByKey = useMemo(() => {
    const map = new Map<string, string>();

    for (const match of bracketMatches) {
      const sourceRef = match.id;

      if (match.winnerToMatchId && match.winnerToSlot) {
        const key = `${match.winnerToMatchId}:${match.winnerToSlot}`;
        if (!map.has(key)) {
          map.set(key, `Winner of ${sourceRef}`);
        }
      }

      if (match.loserToMatchId && match.loserToSlot) {
        const key = `${match.loserToMatchId}:${match.loserToSlot}`;
        if (!map.has(key)) {
          map.set(key, `Loser of ${sourceRef}`);
        }
      }
    }

    return map;
  }, [bracketMatches]);

  const seedSlotToParticipantIndex = useMemo(() => {
    const map = new Map<string, number>();

    if (!isBracketFormat || effectiveParticipants.length < 2) {
      return map;
    }

    if (
      effectiveFormat === "single-elimination" ||
      effectiveFormat === "double-elimination"
    ) {
      const wbRoundOne = bracketMatches
        .filter((match) => match.bracket === "wb" && match.round === 1)
        .sort((a, b) => a.id.localeCompare(b.id));

      let index = 0;
      for (const match of wbRoundOne) {
        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:A`, index);
        }
        index += 1;

        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:B`, index);
        }
        index += 1;
      }

      return map;
    }

    if (effectiveFormat === "double-elimination-half-lb") {
      const wbRoundOne = bracketMatches
        .filter((match) => match.bracket === "wb" && match.round === 1)
        .sort((a, b) => a.id.localeCompare(b.id));
      const lbRoundOne = bracketMatches
        .filter((match) => match.bracket === "lb" && match.round === 1)
        .sort((a, b) => a.id.localeCompare(b.id));

      let index = 0;
      for (const match of wbRoundOne) {
        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:A`, index);
        }
        index += 1;

        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:B`, index);
        }
        index += 1;
      }

      for (const match of lbRoundOne) {
        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:A`, index);
        }
        index += 1;

        if (index < effectiveParticipants.length) {
          map.set(`${match.id}:B`, index);
        }
        index += 1;
      }
    }

    return map;
  }, [
    bracketMatches,
    effectiveFormat,
    effectiveParticipants.length,
    isBracketFormat,
  ]);

  function handleBracketSeedSlotClick(
    matchId: string,
    slot: "A" | "B",
    teamName: string | null | undefined,
  ) {
    if (
      !currentPhase ||
      !isAdmin ||
      currentRuntime?.started ||
      !isBracketFormat
    ) {
      return;
    }

    const clickedKey = `${matchId}:${slot}`;
    const clickedIndex = seedSlotToParticipantIndex.get(clickedKey);
    if (clickedIndex === undefined) {
      return;
    }

    if (!selectedSeedSlotKey) {
      if (!teamName) {
        return;
      }

      setSelectedSeedSlotKey(clickedKey);
      return;
    }

    if (selectedSeedSlotKey === clickedKey) {
      setSelectedSeedSlotKey(null);
      return;
    }

    const selectedIndex = seedSlotToParticipantIndex.get(selectedSeedSlotKey);
    if (selectedIndex === undefined) {
      setSelectedSeedSlotKey(null);
      return;
    }

    const nextParticipants = [...effectiveParticipants];
    const temp = nextParticipants[selectedIndex];
    nextParticipants[selectedIndex] = nextParticipants[clickedIndex];
    nextParticipants[clickedIndex] = temp;

    saveRuntime({
      participants: nextParticipants,
      matches: [],
    });
    setSelectedSeedSlotKey(null);
  }

  function renderBracketTeamRow(
    match: PhaseMatch,
    slot: "A" | "B",
    score: number | null | undefined,
  ) {
    const teamName = slot === "A" ? match.teamA : match.teamB;
    const slotKey = `${match.id}:${slot}`;
    const fallbackHint = slotHintByKey.get(slotKey);
    const displayName = teamName ?? fallbackHint ?? "";
    const canSwapFromTree =
      isAdmin &&
      !currentRuntime?.started &&
      isBracketFormat &&
      seedSlotToParticipantIndex.has(slotKey);
    const isSelected = selectedSeedSlotKey === slotKey;

    return (
      <div className="grid grid-cols-[1fr_52px] border-b border-slate-700 bg-slate-950/70 last:border-b-0">
        {canSwapFromTree ? (
          <button
            type="button"
            onClick={() => handleBracketSeedSlotClick(match.id, slot, teamName)}
            className={`truncate px-2 py-1.5 text-left text-sm transition ${
              isSelected
                ? "bg-cyan-500/20 text-cyan-100"
                : "text-slate-100 hover:bg-cyan-500/10"
            }`}
            title={
              selectedSeedSlotKey
                ? "Click to swap with selected team"
                : "Click to select this team for swap"
            }
          >
            {displayName}
          </button>
        ) : (
          <p
            className={`truncate px-2 py-1.5 text-sm ${
              teamName ? "text-slate-100" : "text-slate-400"
            }`}
          >
            {displayName}
          </p>
        )}

        <p className="bg-amber-400 px-2 py-1.5 text-center text-sm font-semibold text-slate-950">
          {score ?? "-"}
        </p>
      </div>
    );
  }

  function renderBracketCard(match: PhaseMatch) {
    const canEdit =
      isAdmin &&
      currentRuntime?.started &&
      match.status !== "completed" &&
      (match.teamA || match.teamB);

    return (
      <div className="relative mx-auto flex h-[132px] w-[300px] flex-col rounded-lg border border-slate-700 bg-slate-900 p-2">
        <div className="mb-2 flex items-center justify-between gap-1">
          <p className="text-[11px] font-mono text-slate-400">{match.id}</p>
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setScoreEditMatchId(match.id);
                setScoreDraftByMatch((prev) => ({
                  ...prev,
                  [match.id]: prev[match.id] ?? { a: "", b: "" },
                }));
              }}
              className="rounded p-0.5 text-slate-400 transition hover:bg-slate-700 hover:text-cyan-300"
              title="Enter result"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L2.317 11.21a1.75 1.75 0 0 0-.467.85l-.538 2.566a.25.25 0 0 0 .3.299l2.566-.538a1.75 1.75 0 0 0 .85-.467l8.698-8.696a1.75 1.75 0 0 0 0-2.475ZM3.758 12.36l-.616.129.129-.615 8.06-8.06.487.487-8.06 8.06Z" />
              </svg>
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded border border-slate-700">
          {renderBracketTeamRow(match, "A", match.scoreA)}
          {renderBracketTeamRow(match, "B", match.scoreB)}
        </div>

        <p
          className={`mt-2 min-h-5 text-xs ${
            match.status === "completed"
              ? "text-emerald-300"
              : "text-transparent"
          }`}
        >
          Winner: {match.winner ?? "pending"}
        </p>
      </div>
    );
  }

  useEffect(() => {
    setSelectedSeedSlotKey(null);
  }, [selectedPhase, currentRuntime?.started, effectiveFormat]);

  const matchOverview = useMemo(() => {
    if (effectiveParticipants.length < 2) {
      return [];
    }

    // In round-robin, always display the full pairing matrix overview.
    if (effectiveFormat === "round-robin") {
      return createInitialMatches("round-robin", effectiveParticipants);
    }

    if (currentRuntime?.matches.length) {
      return currentRuntime.matches;
    }

    return createInitialMatches(effectiveFormat, effectiveParticipants);
  }, [currentRuntime, effectiveFormat, effectiveParticipants]);

  function saveRuntime(update: {
    format?: PhaseFormat;
    participants?: string[];
    started?: boolean;
    lockedTeams?: boolean;
    swissTotalRounds?: number;
    swissCurrentRound?: number;
    matches?: ReturnType<typeof createInitialMatches>;
  }) {
    if (!currentPhase) {
      return;
    }

    const previous = currentRuntime ?? {
      format: effectiveFormat,
      participants: effectiveParticipants,
      started: false,
      lockedTeams: false,
      swissTotalRounds: 3,
      swissCurrentRound: 1,
      matches: [],
    };

    savePhaseRuntimeState(
      tournamentId,
      currentPhase.name,
      currentPhaseStorageIndex ?? selectedPhase,
      {
        ...previous,
        ...update,
      },
    );

    setPhaseVersion((value) => value + 1);
  }

  function handleDeletePhase(displayIndex: number) {
    if (!isAdmin || !tournament) {
      return;
    }

    const entry = phaseEntries[displayIndex];
    if (!entry) {
      return;
    }

    const confirmed = window.confirm(`Delete phase \"${entry.phase.name}\"?`);
    if (!confirmed) {
      return;
    }

    if (entry.source === "custom") {
      removeCustomPhase(tournamentId, entry.sourceIndex);
      setCustomPhasesCount(getCustomPhases(tournamentId).length);
    } else {
      const nextHidden = Array.from(
        new Set([...hiddenBasePhaseKeys, entry.hiddenKey]),
      );
      writeHiddenBasePhases(tournamentId, nextHidden);
      setHiddenBasePhaseKeys(nextHidden);
    }

    setPhaseVersion((value) => value + 1);
    setSelectedPhase((current) => {
      if (current > displayIndex) {
        return current - 1;
      }

      if (current === displayIndex) {
        return Math.max(0, current - 1);
      }

      return current;
    });
  }

  function handleStartPhase() {
    const participants = effectiveParticipants;
    if (participants.length < 2) {
      return;
    }

    const initialMatches = createInitialMatches(effectiveFormat, participants);
    saveRuntime({
      format: effectiveFormat,
      participants,
      started: true,
      lockedTeams: true,
      swissTotalRounds:
        effectiveFormat === "swiss-round"
          ? (currentRuntime?.swissTotalRounds ?? 3)
          : 1,
      swissCurrentRound: 1,
      matches: initialMatches,
    });
  }

  function handleReportResult(matchId: string) {
    if (!currentRuntime) {
      return;
    }

    const raw = scoreDraftByMatch[matchId] ?? { a: "", b: "" };
    const a = Number(raw.a);
    const b = Number(raw.b);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) {
      return;
    }

    const updated = reportMatchResult(currentRuntime, matchId, a, b);
    savePhaseRuntimeState(
      tournamentId,
      currentPhase.name,
      currentPhaseStorageIndex ?? selectedPhase,
      updated,
    );
    setPhaseVersion((value) => value + 1);
  }

  function handleAddSwissRound() {
    if (!currentRuntime || currentRuntime.format !== "swiss-round") {
      return;
    }

    const updated = addSwissRound(currentRuntime);
    savePhaseRuntimeState(
      tournamentId,
      currentPhase.name,
      currentPhaseStorageIndex ?? selectedPhase,
      updated,
    );
    setPhaseVersion((value) => value + 1);
  }

  const sortedTeams = useMemo(() => {
    if (!currentPhase) {
      return [];
    }

    const statsByTeamName = new Map(
      currentPhase.teams.map((team) => [team.name.toLowerCase(), team]),
    );

    const allRows = effectiveParticipants.map((teamName) => {
      const existing = statsByTeamName.get(teamName.toLowerCase());
      if (existing) {
        return existing;
      }

      return {
        name: teamName,
        points: 0,
        won: 0,
        draw: 0,
        lost: 0,
        penalties: 0,
        mapsWon: 0,
        mapsLost: 0,
        photo: "/team-placeholder.png",
      };
    });

    return allRows.sort((a, b) => b.points - a.points);
  }, [currentPhase, effectiveParticipants]);

  const teamMetaByName = useMemo(() => {
    return new Map(
      teams.map((team) => [
        team.name.toLowerCase(),
        { logo: team.logo, color: team.color },
      ]),
    );
  }, [teams]);

  if (!tournament) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[98vw] px-2 py-3 sm:px-4">
      <section className="rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-medium text-cyan-200 transition hover:border-cyan-200"
          >
            ← Back
          </button>
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            {tournament.name}
          </h2>
          <div />
        </div>

        {/* Phase Navigation */}
        {(phases.length > 0 || isAdmin) && (
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
            {phases.map((phase, idx) => (
              <div
                key={`${phase.name}-${idx}`}
                className={`inline-flex items-center overflow-hidden rounded-full border text-xs font-medium transition ${
                  selectedPhase === idx
                    ? "border-cyan-300 bg-cyan-500/20 text-cyan-200"
                    : "border-white/15 text-slate-300 hover:border-cyan-300"
                }`}
              >
                <button
                  onClick={() => setSelectedPhase(idx)}
                  className="px-3 py-1"
                >
                  {phase.name}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeletePhase(idx);
                    }}
                    className="border-l border-white/20 px-2 py-1 text-[11px] text-rose-300 transition hover:bg-rose-500/20 hover:text-rose-100"
                    title={`Delete ${phase.name}`}
                    aria-label={`Delete ${phase.name}`}
                  >
                    x
                  </button>
                )}
              </div>
            ))}

            {isAdmin && (
              <Link
                href={`/admin/tournaments/${tournament.id}/phases/new`}
                className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-500 px-3 py-1 text-xs font-bold text-white transition hover:border-amber-100 hover:bg-amber-400"
                title="Add phase"
              >
                + Add Phase
              </Link>
            )}
          </div>
        )}

        {/* Teams Table */}
        {phases.length > 0 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[11px] text-slate-300">
                  {currentRuntime?.started ? "Started" : "Not started"}
                </span>

                <button
                  onClick={() => setShowMatches((value) => !value)}
                  className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200 hover:bg-cyan-500/20"
                >
                  {showMatches ? "Show Ranking" : "Show Match"}
                </button>

                {isAdmin && !currentRuntime?.started && (
                  <button
                    onClick={handleStartPhase}
                    className="rounded-full border border-amber-300/60 bg-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/30"
                  >
                    Start
                  </button>
                )}

                {isAdmin && currentRuntime?.format === "swiss-round" && (
                  <button
                    onClick={handleAddSwissRound}
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-300"
                  >
                    + Round (Swiss)
                  </button>
                )}
              </div>

              <div className="mb-2 text-xs text-slate-400">
                {currentRuntime?.lockedTeams
                  ? "Teams locked"
                  : "Teams editable before Start"}
              </div>

              {currentRuntime?.format === "swiss-round" && (
                <p className="mt-3 text-xs text-slate-300">
                  Swiss rounds: {currentRuntime.swissCurrentRound} /{" "}
                  {currentRuntime.swissTotalRounds}
                </p>
              )}
            </div>

            {!showMatches && (
              <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/40">
                {sortedTeams.map((team, idx) => (
                  <div
                    key={team.name}
                    className="grid grid-cols-[40px_1fr_auto_auto_auto_auto_auto_auto_auto_auto] gap-y-2 gap-x-5 border-b border-white/8 px-3 py-2 last:border-b-0 items-center text-xs"
                  >
                    <div className="text-center font-semibold text-cyan-300">
                      #{idx + 1}
                    </div>
                    <div className="flex items-center gap-2">
                      {teamMetaByName.get(team.name.toLowerCase())?.logo &&
                      teamMetaByName.get(team.name.toLowerCase())?.logo !==
                        "/team-placeholder.png" ? (
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/20 bg-slate-800">
                          <Image
                            src={
                              teamMetaByName.get(team.name.toLowerCase())!.logo
                            }
                            alt={`${team.name} logo`}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-cyan-500/30 text-xs font-semibold text-cyan-300">
                          {team.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">
                          {team.name}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-300">
                          <span>Team Color:</span>
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-white/40"
                            style={{
                              backgroundColor:
                                teamMetaByName.get(team.name.toLowerCase())
                                  ?.color ?? "#64748b",
                            }}
                          />
                          <span className="font-medium">
                            {(
                              teamMetaByName.get(team.name.toLowerCase())
                                ?.color ?? "#64748b"
                            ).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 uppercase tracking-wide">
                        Win
                      </p>
                      <p className="font-semibold text-green-300">{team.won}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 uppercase tracking-wide">
                        Draw
                      </p>
                      <p className="font-semibold text-slate-300">
                        {team.draw}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 uppercase tracking-wide">
                        Defeat
                      </p>
                      <p className="font-semibold text-red-300">{team.lost}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-red-400 uppercase tracking-wide">
                        Penalties
                      </p>
                      <p className="font-semibold text-red-300">
                        -{team.penalties}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 uppercase tracking-wide">
                        Map Win
                      </p>
                      <p className="font-semibold text-slate-200">
                        {team.mapsWon}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 uppercase tracking-wide">
                        Map Lost
                      </p>
                      <p className="font-semibold text-slate-200">
                        -{team.mapsLost}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 uppercase tracking-wide">
                        Total
                      </p>
                      <p className="font-semibold text-white">{team.points}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showMatches && (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                {isBracketFormat ? (
                  <>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-300">
                      Bracket - {formatLabels[effectiveFormat]}
                    </p>

                    {isAdmin && !currentRuntime?.started && (
                      <p className="mb-2 text-xs text-slate-400">
                        Before Start: click one team slot, then another slot in
                        the tree to swap them.
                      </p>
                    )}

                    <div className="overflow-x-auto overflow-y-visible rounded-lg border border-white/10 bg-slate-900/40 p-2">
                      <div className="min-w-max space-y-6 pb-2">
                        <div>
                          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                            Winners Bracket
                          </p>
                          <div
                            className="relative"
                            style={{
                              width: `${winnersConnectorLayout.width}px`,
                              height: `${winnersConnectorLayout.height}px`,
                            }}
                          >
                            <svg
                              className="pointer-events-none absolute inset-0 z-0"
                              width={winnersConnectorLayout.width}
                              height={winnersConnectorLayout.height}
                              viewBox={`0 0 ${winnersConnectorLayout.width} ${winnersConnectorLayout.height}`}
                            >
                              {winnersConnectorLayout.paths.map(
                                (path, index) => (
                                  <path
                                    key={`wb-path-${index}`}
                                    d={path}
                                    fill="none"
                                    stroke="#64748b"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                ),
                              )}
                            </svg>

                            <div className="relative z-10 flex items-start gap-6">
                              {winnersRounds.map(
                                ([round, matches], roundIndex) => {
                                  const roundGap =
                                    winnersLayout.gaps[roundIndex] ?? 24;
                                  const paddingTop =
                                    winnersLayout.topOffsets[roundIndex] ?? 0;

                                  return (
                                    <div
                                      key={`wb-round-${round}`}
                                      className="relative w-[320px] shrink-0"
                                    >
                                      <div className="mb-3 mx-auto flex h-10 w-[300px] items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 text-center text-sm font-semibold text-slate-100">
                                        Round {round}
                                      </div>

                                      <div
                                        className="flex flex-col"
                                        style={{
                                          gap: `${roundGap}px`,
                                          paddingTop: `${paddingTop}px`,
                                        }}
                                      >
                                        {matches.map((match) => (
                                          <div
                                            key={match.id}
                                            className="relative"
                                          >
                                            {renderBracketCard(match)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        </div>

                        {isDoubleEliminationLike && losersRounds.length > 0 && (
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-200">
                              Losers Bracket
                            </p>
                            <div
                              className="relative"
                              style={{
                                width: `${losersConnectorLayout.width}px`,
                                height: `${losersConnectorLayout.height}px`,
                              }}
                            >
                              <svg
                                className="pointer-events-none absolute inset-0 z-0"
                                width={losersConnectorLayout.width}
                                height={losersConnectorLayout.height}
                                viewBox={`0 0 ${losersConnectorLayout.width} ${losersConnectorLayout.height}`}
                              >
                                {losersConnectorLayout.paths.map(
                                  (path, index) => (
                                    <path
                                      key={`lb-path-${index}`}
                                      d={path}
                                      fill="none"
                                      stroke="#64748b"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  ),
                                )}
                              </svg>

                              <div className="relative z-10 flex items-start gap-6">
                                {losersRounds.map(
                                  ([round, matches], roundIndex) => {
                                    const roundGap =
                                      losersLayout.gaps[roundIndex] ?? 18;
                                    const paddingTop =
                                      losersLayout.topOffsets[roundIndex] ?? 0;

                                    return (
                                      <div
                                        key={`lb-round-${round}`}
                                        className="relative w-[320px] shrink-0"
                                      >
                                        <div className="mb-3 mx-auto flex h-10 w-[300px] items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-center text-sm font-semibold text-slate-100">
                                          LB Round {round}
                                        </div>

                                        <div
                                          className="flex flex-col"
                                          style={{
                                            gap: `${roundGap}px`,
                                            paddingTop: `${paddingTop}px`,
                                          }}
                                        >
                                          {matches.map((match) => (
                                            <div
                                              key={match.id}
                                              className="relative"
                                            >
                                              {renderBracketCard(match)}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {isDoubleEliminationLike && grandFinalMatch && (
                          <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-fuchsia-200">
                              Grand Final
                            </p>

                            <div className="rounded-lg border border-fuchsia-400/30 bg-slate-900/60 p-4">
                              <div className="relative flex items-center gap-8">
                                <div className="flex flex-col gap-8">
                                  <div className="w-60 rounded-md border border-cyan-400/30 bg-slate-950/70 px-3 py-2 text-sm text-cyan-100">
                                    WB Winner: {wbFinalToGrand?.winner ?? ""}
                                  </div>
                                  <div className="w-60 rounded-md border border-amber-400/30 bg-slate-950/70 px-3 py-2 text-sm text-amber-100">
                                    LB Winner: {lbFinalToGrand?.winner ?? ""}
                                  </div>
                                </div>

                                <div className="relative h-28 w-12">
                                  <span className="absolute left-0 top-1/4 h-px w-4 bg-slate-500" />
                                  <span className="absolute left-0 top-3/4 h-px w-4 bg-slate-500" />
                                  <span className="absolute left-4 top-1/4 h-1/2 border-r border-slate-600" />
                                  <span className="absolute left-4 top-1/2 h-px w-8 bg-slate-500" />
                                </div>

                                <div className="w-[320px]">
                                  {renderBracketCard(grandFinalMatch)}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-slate-300">
                      Matches Overview
                    </p>
                    {matchOverview.length > 0 ? (
                      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                        {matchOverview.map((match) => (
                          <div
                            key={`overview-${match.id}`}
                            className="rounded-md border border-white/10 bg-slate-950/50 px-2 py-1.5 text-sm text-slate-100"
                          >
                            <p className="font-mono text-[11px] text-cyan-300">
                              {match.id}
                            </p>
                            <p className="font-medium">
                              {match.teamA ?? ""} vs {match.teamB ?? ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No match pairings yet.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {showMatches && !isBracketFormat && currentRuntime?.started && (
              <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Matches - {formatLabels[currentRuntime.format]}
                </h3>

                <div className="space-y-2">
                  {currentRuntime.matches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-lg border border-white/10 bg-slate-900/50 p-2 text-xs"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-slate-300">
                        <span className="rounded-full border border-white/15 px-2 py-0.5">
                          {match.bracket.toUpperCase()}
                        </span>
                        <span>Round {match.round}</span>
                        <span className="font-mono text-slate-400">
                          {match.id}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${
                            match.status === "completed"
                              ? "bg-green-500/20 text-green-300"
                              : "bg-slate-700/70 text-slate-200"
                          }`}
                        >
                          {match.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-slate-100">
                        <span className="min-w-28">{match.teamA ?? ""}</span>
                        <input
                          type="number"
                          min={0}
                          value={scoreDraftByMatch[match.id]?.a ?? ""}
                          onChange={(event) =>
                            setScoreDraftByMatch((prev) => ({
                              ...prev,
                              [match.id]: {
                                a: event.target.value,
                                b: prev[match.id]?.b ?? "",
                              },
                            }))
                          }
                          disabled={
                            !isAdmin ||
                            match.status === "completed" ||
                            !match.teamA ||
                            !match.teamB
                          }
                          className="w-14 rounded border border-white/15 bg-slate-950/70 px-2 py-1 text-xs"
                        />
                        <span>-</span>
                        <input
                          type="number"
                          min={0}
                          value={scoreDraftByMatch[match.id]?.b ?? ""}
                          onChange={(event) =>
                            setScoreDraftByMatch((prev) => ({
                              ...prev,
                              [match.id]: {
                                a: prev[match.id]?.a ?? "",
                                b: event.target.value,
                              },
                            }))
                          }
                          disabled={
                            !isAdmin ||
                            match.status === "completed" ||
                            !match.teamA ||
                            !match.teamB
                          }
                          className="w-14 rounded border border-white/15 bg-slate-950/70 px-2 py-1 text-xs"
                        />
                        <span className="min-w-28">{match.teamB ?? ""}</span>

                        {isAdmin && match.status !== "completed" && (
                          <button
                            onClick={() => handleReportResult(match.id)}
                            className="rounded-full border border-cyan-300/40 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200"
                          >
                            Save Result
                          </button>
                        )}

                        {match.winner && (
                          <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-green-300">
                            Winner: {match.winner}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <p className="text-slate-400">No phases yet</p>
          </div>
        )}
        {/* Score edit modal */}
        {scoreEditMatchId &&
          (() => {
            const editMatch = currentRuntime?.matches.find(
              (m) => m.id === scoreEditMatchId,
            );
            if (!editMatch) return null;
            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={() => setScoreEditMatchId(null)}
              >
                <div
                  className="w-80 rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h2 className="mb-1 text-sm font-semibold text-white">
                    Report Result
                  </h2>
                  <p className="mb-4 font-mono text-[11px] text-slate-400">
                    {editMatch.id}
                  </p>

                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="truncate text-xs text-slate-300">
                        {editMatch.teamA ?? "TBD"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={scoreDraftByMatch[scoreEditMatchId]?.a ?? ""}
                        onChange={(e) =>
                          setScoreDraftByMatch((prev) => ({
                            ...prev,
                            [scoreEditMatchId]: {
                              a: e.target.value,
                              b: prev[scoreEditMatchId]?.b ?? "",
                            },
                          }))
                        }
                        className="w-full rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-center text-sm text-white"
                        autoFocus
                      />
                    </div>

                    <span className="mt-5 text-slate-400">–</span>

                    <div className="flex flex-1 flex-col gap-1">
                      <span className="truncate text-xs text-slate-300">
                        {editMatch.teamB ?? "TBD"}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={scoreDraftByMatch[scoreEditMatchId]?.b ?? ""}
                        onChange={(e) =>
                          setScoreDraftByMatch((prev) => ({
                            ...prev,
                            [scoreEditMatchId]: {
                              a: prev[scoreEditMatchId]?.a ?? "",
                              b: e.target.value,
                            },
                          }))
                        }
                        className="w-full rounded border border-white/15 bg-slate-950/70 px-2 py-1.5 text-center text-sm text-white"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setScoreEditMatchId(null)}
                      className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-slate-300 transition hover:border-white/30"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleReportResult(scoreEditMatchId);
                        setScoreEditMatchId(null);
                      }}
                      disabled={
                        !scoreDraftByMatch[scoreEditMatchId]?.a ||
                        !scoreDraftByMatch[scoreEditMatchId]?.b
                      }
                      className="rounded-full border border-cyan-400/40 px-4 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Save Result
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
      </section>
    </div>
  );
}
