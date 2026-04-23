export type PhaseFormat =
  | "round-robin"
  | "swiss-round"
  | "single-elimination"
  | "double-elimination"
  | "double-elimination-half-lb";

export type MatchBracket = "rr" | "swiss" | "wb" | "lb";

export type PhaseMatch = {
  id: string;
  bracket: MatchBracket;
  round: number;
  teamA: string | null;
  teamB: string | null;
  winner: string | null;
  scoreA: number | null;
  scoreB: number | null;
  status: "pending" | "completed";
  winnerToMatchId?: string;
  winnerToSlot?: "A" | "B";
  loserToMatchId?: string;
  loserToSlot?: "A" | "B";
};

export type PhaseRuntimeState = {
  format: PhaseFormat;
  participants: string[];
  started: boolean;
  lockedTeams: boolean;
  swissTotalRounds: number;
  swissCurrentRound: number;
  matches: PhaseMatch[];
};

const STORAGE_KEY = "speedball.phaseRuntime";

type RuntimeMap = Record<string, PhaseRuntimeState>;

function readMap(): RuntimeMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as RuntimeMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(value: RuntimeMap) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function buildPhaseKey(
  tournamentId: string,
  phaseName: string,
  phaseIndex: number,
): string {
  return `${tournamentId}::${phaseIndex}::${phaseName}`;
}

export function getPhaseRuntimeState(
  tournamentId: string,
  phaseName: string,
  phaseIndex: number,
): PhaseRuntimeState | null {
  const map = readMap();
  return map[buildPhaseKey(tournamentId, phaseName, phaseIndex)] ?? null;
}

export function savePhaseRuntimeState(
  tournamentId: string,
  phaseName: string,
  phaseIndex: number,
  state: PhaseRuntimeState,
) {
  const map = readMap();
  map[buildPhaseKey(tournamentId, phaseName, phaseIndex)] = state;
  writeMap(map);
}

function pairRoundRobin(participants: string[]): PhaseMatch[] {
  const matches: PhaseMatch[] = [];
  let index = 1;

  for (let i = 0; i < participants.length; i += 1) {
    for (let j = i + 1; j < participants.length; j += 1) {
      matches.push({
        id: `rr-${index}`,
        bracket: "rr",
        round: 1,
        teamA: participants[i],
        teamB: participants[j],
        winner: null,
        scoreA: null,
        scoreB: null,
        status: "pending",
      });
      index += 1;
    }
  }

  return matches;
}

function nextPowerOfTwo(value: number): number {
  let power = 1;
  while (power < value) {
    power *= 2;
  }
  return power;
}

function autoAdvanceSingle(
  matches: PhaseMatch[],
  shouldSkipAutoAdvance?: (match: PhaseMatch) => boolean,
) {
  let changed = true;

  while (changed) {
    changed = false;

    for (const match of matches) {
      if (shouldSkipAutoAdvance?.(match)) {
        continue;
      }

      if (match.status === "completed") {
        continue;
      }

      const hasA = !!match.teamA;
      const hasB = !!match.teamB;
      if (hasA === hasB) {
        continue;
      }

      const winner = match.teamA ?? match.teamB;
      if (!winner) {
        continue;
      }

      match.winner = winner;
      match.status = "completed";
      match.scoreA = hasA ? 1 : 0;
      match.scoreB = hasB ? 1 : 0;
      changed = true;

      if (match.winnerToMatchId && match.winnerToSlot) {
        const next = matches.find((item) => item.id === match.winnerToMatchId);
        if (next) {
          if (match.winnerToSlot === "A") {
            next.teamA = winner;
          } else {
            next.teamB = winner;
          }
        }
      }
    }
  }
}

function pairSingleElimination(participants: string[]): PhaseMatch[] {
  const size = nextPowerOfTwo(Math.max(2, participants.length));
  const seeded = [...participants];
  while (seeded.length < size) {
    seeded.push("");
  }

  const rounds = Math.log2(size);
  const matches: PhaseMatch[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    const count = size / 2 ** round;
    for (let i = 0; i < count; i += 1) {
      matches.push({
        id: `wb-r${round}-m${i + 1}`,
        bracket: "wb",
        round,
        teamA: round === 1 ? seeded[i * 2] || null : null,
        teamB: round === 1 ? seeded[i * 2 + 1] || null : null,
        winner: null,
        scoreA: null,
        scoreB: null,
        status: "pending",
      });
    }
  }

  for (const match of matches) {
    if (match.round >= rounds) {
      continue;
    }

    const nextIndex = Math.ceil(Number(match.id.split("-m")[1]) / 2);
    match.winnerToMatchId = `wb-r${match.round + 1}-m${nextIndex}`;
    match.winnerToSlot = Number(match.id.split("-m")[1]) % 2 === 1 ? "A" : "B";
  }

  autoAdvanceSingle(matches);
  return matches;
}

function pairDoubleElimination(participants: string[]): PhaseMatch[] {
  const wb = pairSingleElimination(participants);
  const wbRounds = Math.max(...wb.map((match) => match.round));

  const getMatchNumber = (id: string): number => {
    const value = Number(id.split("-m")[1]);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  };

  const wbByRound = new Map<number, PhaseMatch[]>();
  for (const match of wb) {
    const cur = wbByRound.get(match.round) ?? [];
    cur.push(match);
    wbByRound.set(match.round, cur);
  }
  for (const [round, matches] of wbByRound.entries()) {
    wbByRound.set(
      round,
      [...matches].sort((a, b) => getMatchNumber(a.id) - getMatchNumber(b.id)),
    );
  }

  type LBRoundMeta = {
    round: number;
    type: "first" | "injection" | "consolidation";
    wbSourceRound: number | null;
    count: number;
  };

  const lbMeta: LBRoundMeta[] = [];
  const lb: PhaseMatch[] = [];

  function makeLbMatches(lbRound: number, count: number) {
    for (let i = 1; i <= count; i += 1) {
      lb.push({
        id: `lb-r${lbRound}-m${i}`,
        bracket: "lb",
        round: lbRound,
        teamA: null,
        teamB: null,
        winner: null,
        scoreA: null,
        scoreB: null,
        status: "pending",
      });
    }
  }

  // LB R1: WB R1 losers fight each other
  const wbR1Count = wbByRound.get(1)?.length ?? 0;
  const lbR1Count = Math.floor(wbR1Count / 2);
  if (lbR1Count > 0) {
    lbMeta.push({
      round: 1,
      type: "first",
      wbSourceRound: 1,
      count: lbR1Count,
    });
    makeLbMatches(1, lbR1Count);
  }

  let currentSurvivors = lbR1Count;

  // For each subsequent WB round: injection then optional consolidation
  for (let wbRound = 2; wbRound <= wbRounds; wbRound += 1) {
    const wbLosersCount = wbByRound.get(wbRound)?.length ?? 0;

    // Injection: WB losers (slot A) face LB survivors (slot B), 1:1
    const injRound = lbMeta.length + 1;
    lbMeta.push({
      round: injRound,
      type: "injection",
      wbSourceRound: wbRound,
      count: wbLosersCount,
    });
    makeLbMatches(injRound, wbLosersCount);
    currentSurvivors = wbLosersCount;

    // Consolidation: LB survivors fight each other
    if (currentSurvivors > 1) {
      const consolRound = lbMeta.length + 1;
      const consolCount = Math.ceil(currentSurvivors / 2);
      lbMeta.push({
        round: consolRound,
        type: "consolidation",
        wbSourceRound: null,
        count: consolCount,
      });
      makeLbMatches(consolRound, consolCount);
      currentSurvivors = consolCount;
    }
  }

  const byId = new Map<string, PhaseMatch>(
    [...wb, ...lb].map((match) => [match.id, match]),
  );

  // WB R1 losers → LB R1 (pair up, both slots)
  (wbByRound.get(1) ?? []).forEach((match, index) => {
    const targetMatchIndex = Math.floor(index / 2) + 1;
    match.loserToMatchId = `lb-r1-m${targetMatchIndex}`;
    match.loserToSlot = index % 2 === 0 ? "A" : "B";
  });

  // WB R≥2 losers → injection rounds (slot A, one per match)
  for (let wbRound = 2; wbRound <= wbRounds; wbRound += 1) {
    const wbRoundMatches = wbByRound.get(wbRound) ?? [];
    const injMeta = lbMeta.find(
      (m) => m.type === "injection" && m.wbSourceRound === wbRound,
    );
    if (!injMeta) {
      continue;
    }

    wbRoundMatches.forEach((match, index) => {
      match.loserToMatchId = `lb-r${injMeta.round}-m${index + 1}`;
      match.loserToSlot = "A";
    });
  }

  // LB winners to next round
  for (let i = 0; i < lbMeta.length - 1; i += 1) {
    const cur = lbMeta[i];
    const next = lbMeta[i + 1];

    for (let matchIndex = 1; matchIndex <= cur.count; matchIndex += 1) {
      const source = byId.get(`lb-r${cur.round}-m${matchIndex}`);
      if (!source) {
        continue;
      }

      if (next.type === "injection") {
        // LB survivor → slot B of same-indexed injection match
        source.winnerToMatchId = `lb-r${next.round}-m${matchIndex}`;
        source.winnerToSlot = "B";
      } else {
        // Consolidation: pair up
        const targetMatchIndex = Math.floor((matchIndex - 1) / 2) + 1;
        source.winnerToMatchId = `lb-r${next.round}-m${targetMatchIndex}`;
        source.winnerToSlot = (matchIndex - 1) % 2 === 0 ? "A" : "B";
      }
    }
  }

  const grandFinalId = `wb-r${wbRounds + 1}-m1`;
  const grandFinal: PhaseMatch = {
    id: grandFinalId,
    bracket: "wb",
    round: wbRounds + 1,
    teamA: null,
    teamB: null,
    winner: null,
    scoreA: null,
    scoreB: null,
    status: "pending",
  };

  const wbFinal = (wbByRound.get(wbRounds) ?? [])[0];
  if (wbFinal) {
    wbFinal.winnerToMatchId = grandFinalId;
    wbFinal.winnerToSlot = "A";
  }

  const lastLbMeta = lbMeta[lbMeta.length - 1];
  const lbFinal = byId.get(`lb-r${lastLbMeta.round}-m1`);
  if (lbFinal) {
    lbFinal.winnerToMatchId = grandFinalId;
    lbFinal.winnerToSlot = "B";
  }

  const result = [...wb, ...lb, grandFinal];
  autoAdvanceSingle(result);
  return result;
}

function pairDoubleEliminationHalfLoserBracket(
  participants: string[],
): PhaseMatch[] {
  const wbCount = Math.ceil(participants.length / 2);
  const wbParticipants = participants.slice(0, wbCount);
  const lbParticipants = participants.slice(wbCount);

  const wb = pairSingleElimination(wbParticipants).map((match) => ({
    ...match,
    loserToMatchId: undefined as string | undefined,
    loserToSlot: undefined as "A" | "B" | undefined,
  }));

  const wbRounds = Math.max(...wb.map((match) => match.round));
  const wbByRound = new Map<number, PhaseMatch[]>();
  for (const match of wb) {
    const cur = wbByRound.get(match.round) ?? [];
    cur.push(match);
    wbByRound.set(match.round, cur);
  }

  type LBRoundMeta = {
    round: number;
    type: "first" | "injection" | "consolidation";
    wbSourceRound: number | null;
    count: number;
  };

  const lbMeta: LBRoundMeta[] = [];
  const lb: PhaseMatch[] = [];

  function makeLbMatches(lbRound: number, count: number) {
    for (let i = 1; i <= count; i += 1) {
      lb.push({
        id: `lb-r${lbRound}-m${i}`,
        bracket: "lb",
        round: lbRound,
        teamA: null,
        teamB: null,
        winner: null,
        scoreA: null,
        scoreB: null,
        status: "pending",
      });
    }
  }

  // LB R1: direct LB participants fight each other
  const lbR1Count = Math.max(1, Math.floor(lbParticipants.length / 2));
  lbMeta.push({
    round: 1,
    type: "first",
    wbSourceRound: null,
    count: lbR1Count,
  });
  makeLbMatches(1, lbR1Count);
  let currentSurvivors = lbR1Count;

  // For each WB round: injection (WB losers vs LB survivors), then optional consolidation
  for (let wbRound = 1; wbRound <= wbRounds; wbRound += 1) {
    const wbLosersCount = wbByRound.get(wbRound)?.length ?? 0;

    // Injection: WB losers (slot A) face LB survivors (slot B), 1:1
    const injRound = lbMeta.length + 1;
    lbMeta.push({
      round: injRound,
      type: "injection",
      wbSourceRound: wbRound,
      count: wbLosersCount,
    });
    makeLbMatches(injRound, wbLosersCount);
    currentSurvivors = wbLosersCount;

    // Consolidation if more than 1 survivor
    if (currentSurvivors > 1) {
      const consolRound = lbMeta.length + 1;
      const consolCount = Math.ceil(currentSurvivors / 2);
      lbMeta.push({
        round: consolRound,
        type: "consolidation",
        wbSourceRound: null,
        count: consolCount,
      });
      makeLbMatches(consolRound, consolCount);
      currentSurvivors = consolCount;
    }
  }

  const byId = new Map<string, PhaseMatch>(
    [...wb, ...lb].map((match) => [match.id, match]),
  );

  // WB losers → injection rounds (slot A, one per match)
  for (let wbRound = 1; wbRound <= wbRounds; wbRound += 1) {
    const wbRoundMatches = (wbByRound.get(wbRound) ?? []).sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const injMeta = lbMeta.find(
      (m) => m.type === "injection" && m.wbSourceRound === wbRound,
    );
    if (!injMeta) {
      continue;
    }

    wbRoundMatches.forEach((match, index) => {
      match.loserToMatchId = `lb-r${injMeta.round}-m${index + 1}`;
      match.loserToSlot = "A";
    });
  }

  // LB winners to next round
  for (let i = 0; i < lbMeta.length - 1; i += 1) {
    const cur = lbMeta[i];
    const next = lbMeta[i + 1];

    for (let matchIndex = 1; matchIndex <= cur.count; matchIndex += 1) {
      const source = byId.get(`lb-r${cur.round}-m${matchIndex}`);
      if (!source) {
        continue;
      }

      if (next.type === "injection") {
        // LB survivor → slot B of same-indexed injection match
        source.winnerToMatchId = `lb-r${next.round}-m${matchIndex}`;
        source.winnerToSlot = "B";
      } else {
        // Consolidation: pair up
        const targetMatchIndex = Math.floor((matchIndex - 1) / 2) + 1;
        source.winnerToMatchId = `lb-r${next.round}-m${targetMatchIndex}`;
        source.winnerToSlot = (matchIndex - 1) % 2 === 0 ? "A" : "B";
      }
    }
  }

  // Seed WB R1 participants
  const wbRoundOne = wb
    .filter((match) => match.round === 1)
    .sort((a, b) => a.id.localeCompare(b.id));
  const wbSlots: Array<{ match: PhaseMatch; slot: "A" | "B" }> = [];
  for (const match of wbRoundOne) {
    wbSlots.push({ match, slot: "A" });
    wbSlots.push({ match, slot: "B" });
  }
  wbParticipants.forEach((teamName, index) => {
    const slot = wbSlots[index];
    if (!slot) {
      return;
    }
    if (slot.slot === "A") {
      slot.match.teamA = teamName;
    } else {
      slot.match.teamB = teamName;
    }
  });

  // Seed LB R1 participants
  const lbRoundOne = lb
    .filter((match) => match.round === 1)
    .sort((a, b) => a.id.localeCompare(b.id));
  const lbSlots: Array<{ match: PhaseMatch; slot: "A" | "B" }> = [];
  for (const match of lbRoundOne) {
    lbSlots.push({ match, slot: "A" });
    lbSlots.push({ match, slot: "B" });
  }
  lbParticipants.forEach((teamName, index) => {
    const slot = lbSlots[index];
    if (!slot) {
      return;
    }
    if (slot.slot === "A") {
      slot.match.teamA = teamName;
    } else {
      slot.match.teamB = teamName;
    }
  });

  const grandFinalId = `wb-r${wbRounds + 1}-m1`;
  const grandFinal: PhaseMatch = {
    id: grandFinalId,
    bracket: "wb",
    round: wbRounds + 1,
    teamA: null,
    teamB: null,
    winner: null,
    scoreA: null,
    scoreB: null,
    status: "pending",
  };

  const wbFinal = (wbByRound.get(wbRounds) ?? [])[0];
  if (wbFinal) {
    wbFinal.winnerToMatchId = grandFinalId;
    wbFinal.winnerToSlot = "A";
  }

  const lastLbMeta = lbMeta[lbMeta.length - 1];
  const lbFinal = byId.get(`lb-r${lastLbMeta.round}-m1`);
  if (lbFinal) {
    lbFinal.winnerToMatchId = grandFinalId;
    lbFinal.winnerToSlot = "B";
  }

  const result = [...wb, ...lb, grandFinal];
  autoAdvanceSingle(result);
  return result;
}

function pairSwissRoundOne(participants: string[]): PhaseMatch[] {
  const matches: PhaseMatch[] = [];
  let idx = 1;

  for (let i = 0; i < participants.length; i += 2) {
    matches.push({
      id: `swiss-r1-m${idx}`,
      bracket: "swiss",
      round: 1,
      teamA: participants[i] ?? null,
      teamB: participants[i + 1] ?? null,
      winner: null,
      scoreA: null,
      scoreB: null,
      status: "pending",
    });
    idx += 1;
  }

  return matches;
}

export function createInitialMatches(
  format: PhaseFormat,
  participants: string[],
): PhaseMatch[] {
  if (format === "round-robin") {
    return pairRoundRobin(participants);
  }

  if (format === "swiss-round") {
    return pairSwissRoundOne(participants);
  }

  if (format === "single-elimination") {
    return pairSingleElimination(participants);
  }

  if (format === "double-elimination-half-lb") {
    return pairDoubleEliminationHalfLoserBracket(participants);
  }

  return pairDoubleElimination(participants);
}

function computeSwissWins(matches: PhaseMatch[]): Record<string, number> {
  const wins: Record<string, number> = {};

  for (const match of matches) {
    if (match.bracket !== "swiss") {
      continue;
    }

    if (match.teamA) {
      wins[match.teamA] = wins[match.teamA] ?? 0;
    }

    if (match.teamB) {
      wins[match.teamB] = wins[match.teamB] ?? 0;
    }

    if (match.status === "completed" && match.winner) {
      wins[match.winner] = (wins[match.winner] ?? 0) + 1;
    }
  }

  return wins;
}

function hasPlayedTogether(
  matches: PhaseMatch[],
  teamA: string,
  teamB: string,
): boolean {
  return matches.some((match) => {
    if (match.bracket !== "swiss") {
      return false;
    }

    return (
      (match.teamA === teamA && match.teamB === teamB) ||
      (match.teamA === teamB && match.teamB === teamA)
    );
  });
}

function createSwissNextRound(state: PhaseRuntimeState): PhaseRuntimeState {
  const currentRound = state.swissCurrentRound;
  const currentMatches = state.matches.filter(
    (m) => m.bracket === "swiss" && m.round === currentRound,
  );

  if (currentMatches.some((m) => m.status !== "completed")) {
    return state;
  }

  if (currentRound >= state.swissTotalRounds) {
    return state;
  }

  const wins = computeSwissWins(state.matches);
  const ordered = [...state.participants].sort((a, b) => {
    const byWins = (wins[b] ?? 0) - (wins[a] ?? 0);
    return byWins !== 0 ? byWins : a.localeCompare(b);
  });

  const used = new Set<string>();
  const nextRound = currentRound + 1;
  let matchNumber = 1;
  const newMatches: PhaseMatch[] = [];

  for (let i = 0; i < ordered.length; i += 1) {
    const teamA = ordered[i];
    if (used.has(teamA)) {
      continue;
    }

    let opponent: string | null = null;
    for (let j = i + 1; j < ordered.length; j += 1) {
      const candidate = ordered[j];
      if (used.has(candidate)) {
        continue;
      }

      if (!hasPlayedTogether(state.matches, teamA, candidate)) {
        opponent = candidate;
        break;
      }
    }

    if (!opponent) {
      opponent =
        ordered.find(
          (candidate) => !used.has(candidate) && candidate !== teamA,
        ) ?? null;
    }

    used.add(teamA);
    if (opponent) {
      used.add(opponent);
    }

    newMatches.push({
      id: `swiss-r${nextRound}-m${matchNumber}`,
      bracket: "swiss",
      round: nextRound,
      teamA,
      teamB: opponent,
      winner: null,
      scoreA: null,
      scoreB: null,
      status: "pending",
    });

    matchNumber += 1;
  }

  return {
    ...state,
    swissCurrentRound: nextRound,
    matches: [...state.matches, ...newMatches],
  };
}

export function reportMatchResult(
  state: PhaseRuntimeState,
  matchId: string,
  scoreA: number,
  scoreB: number,
): PhaseRuntimeState {
  const matches = state.matches.map((match) => ({ ...match }));
  const target = matches.find((match) => match.id === matchId);

  if (!target || !target.teamA || !target.teamB || scoreA === scoreB) {
    return state;
  }

  target.scoreA = scoreA;
  target.scoreB = scoreB;
  target.winner = scoreA > scoreB ? target.teamA : target.teamB;
  target.status = "completed";

  if (target.winnerToMatchId && target.winnerToSlot && target.winner) {
    const next = matches.find((match) => match.id === target.winnerToMatchId);
    if (next) {
      if (target.winnerToSlot === "A") {
        next.teamA = target.winner;
      } else {
        next.teamB = target.winner;
      }
    }
  }

  if (target.loserToMatchId && target.loserToSlot) {
    const loser = target.winner === target.teamA ? target.teamB : target.teamA;
    const lb = matches.find((match) => match.id === target.loserToMatchId);
    if (lb && loser) {
      if (target.loserToSlot === "A") {
        lb.teamA = loser;
      } else {
        lb.teamB = loser;
      }
    }
  }

  const nextState: PhaseRuntimeState = {
    ...state,
    matches,
  };

  if (state.format === "swiss-round") {
    return createSwissNextRound(nextState);
  }

  return nextState;
}

export function addSwissRound(state: PhaseRuntimeState): PhaseRuntimeState {
  if (state.format !== "swiss-round") {
    return state;
  }

  return {
    ...state,
    swissTotalRounds: state.swissTotalRounds + 1,
  };
}
