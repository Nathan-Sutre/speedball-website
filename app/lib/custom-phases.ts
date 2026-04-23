import type { Phase } from "./tournaments-data";

const CUSTOM_PHASES_STORAGE_KEY = "speedball.customPhases";

type CustomPhasesByTournament = Record<string, Phase[]>;

function readCustomPhasesMap(): CustomPhasesByTournament {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = localStorage.getItem(CUSTOM_PHASES_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as CustomPhasesByTournament;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCustomPhasesMap(value: CustomPhasesByTournament) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(CUSTOM_PHASES_STORAGE_KEY, JSON.stringify(value));
}

export function getCustomPhases(tournamentId: string): Phase[] {
  const phasesMap = readCustomPhasesMap();
  return phasesMap[tournamentId] ?? [];
}

export function addCustomPhase(tournamentId: string, phase: Phase) {
  const phasesMap = readCustomPhasesMap();
  const existingPhases = phasesMap[tournamentId] ?? [];
  phasesMap[tournamentId] = [...existingPhases, phase];
  writeCustomPhasesMap(phasesMap);
}

export function removeCustomPhase(tournamentId: string, phaseIndex: number) {
  const phasesMap = readCustomPhasesMap();
  const existingPhases = phasesMap[tournamentId] ?? [];

  if (phaseIndex < 0 || phaseIndex >= existingPhases.length) {
    return;
  }

  phasesMap[tournamentId] = existingPhases.filter(
    (_, index) => index !== phaseIndex,
  );
  writeCustomPhasesMap(phasesMap);
}
