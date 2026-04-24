"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    tournamentType: "sbl",
    tournamentName: "",
    tournamentDate: "",
    tournamentEdition: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;
    const key = id.replace("tournament-", "");
    const keyMap: Record<string, keyof typeof formData> = {
      type: "tournamentType",
      name: "tournamentName",
      date: "tournamentDate",
      edition: "tournamentEdition",
    };
    setFormData((prev) => ({
      ...prev,
      [keyMap[key] || key]: value,
    }));
  };

  const handleSave = async () => {
    setError("");

    if (
      !formData.tournamentName ||
      !formData.tournamentDate ||
      !formData.tournamentEdition
    ) {
      setError("Please fill in all fields");
      return;
    }

    const edition = Number(formData.tournamentEdition);
    if (!Number.isInteger(edition) || edition <= 0) {
      setError("Tournament edition must be a positive integer");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          edition,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tournament");
      }

      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col px-2 py-4 sm:px-4">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-amber-400/20 bg-slate-900/70 p-6">
        <h1 className="mb-2 text-xl font-semibold text-white">
          Create Tournament
        </h1>
        <p className="mb-6 text-sm text-slate-300">
          Renseigne le type de tournoi et son numero d'edition.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="tournament-type"
            >
              Tournament Type
            </label>
            <select
              id="tournament-type"
              value={formData.tournamentType}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            >
              <option value="sbl">Speedball League (SBL)</option>
              <option value="sbc">Speedball Championship (SBC)</option>
              <option value="funcup">Funcup</option>
              <option value="teamcup">Teamcup</option>
            </select>
          </div>

          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="tournament-edition"
            >
              Tournament Edition
            </label>
            <input
              id="tournament-edition"
              type="number"
              min={1}
              placeholder="10"
              value={formData.tournamentEdition}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="tournament-name"
            >
              Tournament Name
            </label>
            <input
              id="tournament-name"
              type="text"
              placeholder="Speedball League (SBL) #10"
              value={formData.tournamentName}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="tournament-date"
            >
              Date
            </label>
            <input
              id="tournament-date"
              type="date"
              value={formData.tournamentDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-lg border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/30 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </section>
    </div>
  );
}
