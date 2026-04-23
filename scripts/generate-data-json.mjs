import fs from "node:fs";
import path from "node:path";

const teamNames = [
  "Crimson Vipers",
  "Blue Phantoms",
  "Iron Wolves",
  "Nova Pulse",
  "Shadow Unit",
  "Titan Recoil",
  "Arctic Echo",
  "Delta Strike",
  "Night Owls",
  "Rapid Foxes",
  "Steel Hawks",
  "Omega Drift",
];

function buildTeams(seed, limit = teamNames.length) {
  return teamNames.slice(0, limit).map((name, index) => {
    const rankFactor = limit - index;
    const points = rankFactor * 4 + ((seed + index) % 3);
    const won = Math.max(0, rankFactor - 1);
    const draw = (seed + index) % 3;
    const lost = Math.max(0, 12 - won - draw);
    const penalties = (seed + index) % 2;
    const mapsWon = won * 3 + 2;
    const mapsLost = lost + 3;

    return {
      name,
      points,
      won,
      draw,
      lost,
      penalties,
      mapsWon,
      mapsLost,
      photo: "/team-placeholder.png",
    };
  });
}

function buildLeaguePhases(seed) {
  return [
    { name: "Regular Season", teams: buildTeams(seed, 12) },
    { name: "Playoffs", teams: buildTeams(seed + 4, 8) },
    { name: "Final Stage", teams: buildTeams(seed + 8, 4) },
  ];
}

const tournaments = [
  ...Array.from({ length: 9 }, (_, index) => ({
    id: `sbl-${index + 1}`,
    name: `Speedball League (SBL) #${index + 1}`,
    date:
      index === 8
        ? ""
        : `2026-${String((index % 9) + 1).padStart(2, "0")}-1${index % 9}`,
    phases: index === 8 ? [] : buildLeaguePhases(index + 1),
  })),
  {
    id: "sbc-1",
    name: "Speedball Championship (SBC)",
    date: "",
    phases: [
      { name: "Qualifiers", teams: buildTeams(20, 12) },
      { name: "Championship Bracket", teams: buildTeams(25, 8) },
      { name: "Grand Finals", teams: buildTeams(30, 4) },
    ],
  },
];

const teamStatsData = [
  {
    id: "crimson-vipers",
    name: "Crimson Vipers",
    color: "#ef4444",
    logo: "/team-placeholder.png",
    players: ["vex_crimson", "kai_flare", "luna_blade"],
    competitions: [
      {
        id: "sbl-9",
        name: "Speedball League (SBL) #9",
        type: "sbl",
        matches: [
          {
            id: "cv-sbl9-m1",
            opponent: "Blue Phantoms",
            map: "Factory",
            scoreFor: 4,
            scoreAgainst: 2,
            pickedByTeam: true,
            result: "win",
          },
          {
            id: "cv-sbl9-m2",
            opponent: "Iron Wolves",
            map: "Temple",
            scoreFor: 2,
            scoreAgainst: 4,
            pickedByTeam: false,
            result: "loss",
          },
          {
            id: "cv-sbl9-m3",
            opponent: "Nova Pulse",
            map: "Ruins",
            scoreFor: 5,
            scoreAgainst: 1,
            pickedByTeam: true,
            result: "win",
          },
        ],
        mapStats: [
          {
            mapName: "Factory",
            pickedCount: 3,
            bannedCount: 1,
            playedCount: 4,
            wonCount: 3,
            wonWhenPickedCount: 2,
            wonWhenNotPickedCount: 1,
          },
          {
            mapName: "Temple",
            pickedCount: 1,
            bannedCount: 2,
            playedCount: 3,
            wonCount: 1,
            wonWhenPickedCount: 0,
            wonWhenNotPickedCount: 1,
          },
          {
            mapName: "Ruins",
            pickedCount: 2,
            bannedCount: 1,
            playedCount: 2,
            wonCount: 2,
            wonWhenPickedCount: 2,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
      {
        id: "sbc-1",
        name: "Speedball Championship (SBC)",
        type: "sbc",
        matches: [
          {
            id: "cv-sbc1-m1",
            opponent: "Delta Strike",
            map: "Dockyard",
            scoreFor: 3,
            scoreAgainst: 2,
            pickedByTeam: false,
            result: "win",
          },
          {
            id: "cv-sbc1-m2",
            opponent: "Shadow Unit",
            map: "Factory",
            scoreFor: 1,
            scoreAgainst: 4,
            pickedByTeam: true,
            result: "loss",
          },
        ],
        mapStats: [
          {
            mapName: "Dockyard",
            pickedCount: 1,
            bannedCount: 1,
            playedCount: 2,
            wonCount: 1,
            wonWhenPickedCount: 0,
            wonWhenNotPickedCount: 1,
          },
          {
            mapName: "Factory",
            pickedCount: 2,
            bannedCount: 0,
            playedCount: 2,
            wonCount: 1,
            wonWhenPickedCount: 1,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
      {
        id: "teamcup-2026-1",
        name: "TeamCup Spring 2026",
        type: "teamcup",
        matches: [
          {
            id: "cv-tc1-m1",
            opponent: "Arctic Echo",
            map: "Hangar",
            scoreFor: 4,
            scoreAgainst: 3,
            pickedByTeam: true,
            result: "win",
          },
        ],
        mapStats: [
          {
            mapName: "Hangar",
            pickedCount: 2,
            bannedCount: 1,
            playedCount: 2,
            wonCount: 1,
            wonWhenPickedCount: 1,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "blue-phantoms",
    name: "Blue Phantoms",
    color: "#3b82f6",
    logo: "/team-placeholder.png",
    players: ["ash_runner", "neo_wave", "milo_ghost"],
    competitions: [
      {
        id: "sbl-9",
        name: "Speedball League (SBL) #9",
        type: "sbl",
        matches: [
          {
            id: "bp-sbl9-m1",
            opponent: "Crimson Vipers",
            map: "Factory",
            scoreFor: 2,
            scoreAgainst: 4,
            pickedByTeam: false,
            result: "loss",
          },
          {
            id: "bp-sbl9-m2",
            opponent: "Titan Recoil",
            map: "Canal",
            scoreFor: 4,
            scoreAgainst: 1,
            pickedByTeam: true,
            result: "win",
          },
        ],
        mapStats: [
          {
            mapName: "Factory",
            pickedCount: 1,
            bannedCount: 2,
            playedCount: 2,
            wonCount: 0,
            wonWhenPickedCount: 0,
            wonWhenNotPickedCount: 0,
          },
          {
            mapName: "Canal",
            pickedCount: 2,
            bannedCount: 1,
            playedCount: 2,
            wonCount: 2,
            wonWhenPickedCount: 1,
            wonWhenNotPickedCount: 1,
          },
        ],
      },
      {
        id: "teamcup-2026-1",
        name: "TeamCup Spring 2026",
        type: "teamcup",
        matches: [
          {
            id: "bp-tc1-m1",
            opponent: "Nova Pulse",
            map: "Temple",
            scoreFor: 3,
            scoreAgainst: 4,
            pickedByTeam: true,
            result: "loss",
          },
        ],
        mapStats: [
          {
            mapName: "Temple",
            pickedCount: 1,
            bannedCount: 0,
            playedCount: 1,
            wonCount: 0,
            wonWhenPickedCount: 0,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
    ],
  },
  {
    id: "iron-wolves",
    name: "Iron Wolves",
    color: "#94a3b8",
    logo: "/team-placeholder.png",
    players: ["rex_core", "dax_iron", "sora_hunt"],
    competitions: [
      {
        id: "sbl-8",
        name: "Speedball League (SBL) #8",
        type: "sbl",
        matches: [
          {
            id: "iw-sbl8-m1",
            opponent: "Titan Recoil",
            map: "Ruins",
            scoreFor: 4,
            scoreAgainst: 2,
            pickedByTeam: true,
            result: "win",
          },
        ],
        mapStats: [
          {
            mapName: "Ruins",
            pickedCount: 2,
            bannedCount: 1,
            playedCount: 2,
            wonCount: 1,
            wonWhenPickedCount: 1,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
      {
        id: "sbl-9",
        name: "Speedball League (SBL) #9",
        type: "sbl",
        matches: [
          {
            id: "iw-sbl9-m1",
            opponent: "Crimson Vipers",
            map: "Temple",
            scoreFor: 4,
            scoreAgainst: 2,
            pickedByTeam: true,
            result: "win",
          },
        ],
        mapStats: [
          {
            mapName: "Temple",
            pickedCount: 1,
            bannedCount: 1,
            playedCount: 1,
            wonCount: 1,
            wonWhenPickedCount: 1,
            wonWhenNotPickedCount: 0,
          },
        ],
      },
    ],
  },
];

const teamPlayerLogins = [
  "vex_crimson",
  "kai_flare",
  "luna_blade",
  "ash_runner",
  "neo_wave",
  "milo_ghost",
  "rex_core",
  "dax_iron",
  "sora_hunt",
  "zen_bolt",
  "faye_pulse",
  "loki_dash",
  "onyx_shade",
  "kai_flux",
  "vex_strike",
  "atlas_titan",
  "ryu_recoil",
  "mara_lock",
  "frost_echo",
  "nina_glace",
  "taro_ice",
  "delta_one",
  "drift_kill",
  "volt_line",
];

function formatClock(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function toNickname(login) {
  const base = login.split("_")[0] ?? login;
  return `${base.charAt(0).toUpperCase()}${base.slice(1)}`;
}

const playerStats = teamPlayerLogins.map((login, index) => {
  const rank = index + 1;
  const points = 640 - index * 12;
  const kills = 124 - index * 3;
  const deaths = 56 + index;
  const kdRatio = Number((kills / deaths).toFixed(2));
  const captureTries = 14 - Math.floor(index / 3);
  const captures = Math.max(2, Math.floor(captureTries * 0.45));
  const capturePercent = ((captures / captureTries) * 100).toFixed(1);

  return {
    login,
    nickname: toNickname(login),
    rank,
    ladderPoints: 2890 - index * 41,
    points,
    damage: 10800 - index * 145,
    shots: 470 - index * 8,
    kills,
    deaths,
    kdRatio,
    accuracy: `${(64 - index * 0.7).toFixed(1)}%`,
    passesDone: 78 - index,
    passesReceived: 70 - Math.floor(index * 0.8),
    ballHits: 24 - Math.floor(index / 2),
    backstabs: 18 - Math.floor(index / 2),
    backspaced: 2 + (index % 7),
    ballGivenAway: 6 + (index % 10),
    ballStolen: 20 - Math.floor(index / 2),
    ballPossession: formatClock(530 - index * 9),
    nearMisses: 10 + index,
    captureTries,
    captures,
    captureTotalPercent: `${capturePercent}%`,
    captureTotalTime: formatClock(112 - index * 2),
    playtime: formatDuration(6200 - index * 63),
    mapsPlayed: 17 - Math.floor(index / 2),
    wonMap: 12 - Math.floor(index / 3),
  };
});

const data = {
  tournaments,
  teamStats: teamStatsData,
  playerStats,
};

const outputPath = path.join(process.cwd(), "data", "data.json");
fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
console.log(`Generated ${outputPath}`);
