"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchTournaments, Tournament } from "../lib/api-client";

export default function TournamentsList() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchTournaments().then(setTournaments).catch(console.error);
  }, []);

  async function handleEditTournament(tournament: Tournament) {
    const nextName = window.prompt("Tournament name", tournament.name);
    if (!nextName || !nextName.trim()) return;

    const currentDate = tournament.date || "";
    const nextDate = window.prompt("Tournament date (YYYY-MM-DD)", currentDate);
    if (nextDate === null) return;

    setBusyId(tournament.id);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName.trim(), date: nextDate.trim() }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to update tournament");
      }

      const updated = (await res.json()) as Tournament;
      setTournaments((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to update tournament",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteTournament(tournament: Tournament) {
    const confirmed = window.confirm(
      `Delete tournament \"${tournament.name}\"? This action is irreversible.`,
    );
    if (!confirmed) return;

    setBusyId(tournament.id);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournament.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to delete tournament");
      }

      setTournaments((prev) =>
        prev.filter((item) => item.id !== tournament.id),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Failed to delete tournament",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="relative flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
        Tournaments
      </h2>

      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
        {tournaments.map((tournament) => (
          <div
            key={tournament.id}
            className="px-4 py-3 transition hover:bg-white/5"
          >
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <Link href={`/tournaments/${tournament.id}`} className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">
                  {tournament.name}
                </p>
              </Link>
              <p className="text-sm text-slate-300">
                {tournament.date ? tournament.date : "Running"}
              </p>
            </div>

            {isAdmin && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditTournament(tournament)}
                  disabled={busyId === tournament.id}
                  className="rounded-md border border-cyan-300/40 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-200 hover:bg-cyan-500/20 disabled:opacity-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTournament(tournament)}
                  disabled={busyId === tournament.id}
                  className="rounded-md border border-red-300/40 bg-red-500/10 px-2 py-1 text-xs font-semibold text-red-200 transition hover:border-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
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
