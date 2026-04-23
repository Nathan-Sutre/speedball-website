"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTournaments, Tournament } from "../lib/api-client";

export default function TournamentsList() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchTournaments().then(setTournaments).catch(console.error);
  }, []);

  return (
    <section className="relative flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
        Tournaments
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
        {tournaments.map((tournament) => (
          <Link
            key={tournament.id}
            href={`/tournaments/${tournament.id}`}
            className="block px-4 py-3 transition hover:bg-white/5"
          >
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-[1fr_auto] sm:items-center">
              <p className="text-sm font-medium text-slate-100">
                {tournament.name}
              </p>
              <p className="text-sm text-slate-300">
                {tournament.date ? tournament.date : "Running"}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {isAdmin && (
        <Link
          href="/admin/tournaments/new"
          className="absolute right-5 bottom-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-amber-500 text-3xl leading-none font-bold text-white shadow-lg shadow-black/40 transition hover:border-amber-100 hover:bg-amber-400"
          aria-label="Add tournament"
          title="Add tournament"
        >
          +
        </Link>
      )}
    </section>
  );
}
