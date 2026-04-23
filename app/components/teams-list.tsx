"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { teamsStatsData } from "../lib/team-stats-data";

export default function TeamsList() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
  }, []);

  return (
    <section className="relative flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
        Team Stats
      </h2>
      <p className="mb-4 text-sm text-slate-300">
        Choose a team to open its competitions and map performance details.
      </p>

      <ul className="flex-1 min-h-0 space-y-3 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-3">
        {teamsStatsData.map((team) => (
          <li
            key={team.id}
            className="rounded-xl border border-white/10 bg-slate-900/50 p-3"
          >
            <div className="flex items-center gap-3">
              {team.logo && team.logo !== "/team-placeholder.png" ? (
                <div className="h-11 w-11 rounded-full border border-white/20 overflow-hidden bg-slate-800 shrink-0">
                  <Image
                    src={team.logo}
                    alt={`${team.name} logo`}
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-11 w-11 rounded-full border border-white/20 bg-cyan-500/30 flex items-center justify-center text-sm font-semibold text-cyan-300 shrink-0">
                  {team.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">
                  {team.name}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-300">
                  <span>Team Color:</span>
                  <span
                    className="inline-block h-3.5 w-3.5 rounded-full border border-white/40"
                    style={{ backgroundColor: team.color }}
                  />
                  <span className="font-medium">
                    {team.color.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-xs text-slate-300">
                Competitions: {team.competitions.length}
              </p>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-400">
                Players Login
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
                {team.players.map((login) => (
                  <span
                    key={login}
                    className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1 text-xs text-slate-200"
                  >
                    {login}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Link
                href={`/team-stats/${team.id}`}
                className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200 hover:bg-cyan-500/20"
              >
                View competitions
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {isAdmin && (
        <Link
          href="/admin/teams/new"
          className="absolute right-5 bottom-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-amber-500 text-3xl leading-none font-bold text-white shadow-lg shadow-black/40 transition hover:border-amber-100 hover:bg-amber-400"
          aria-label="Add team"
          title="Add team"
        >
          +
        </Link>
      )}
    </section>
  );
}
