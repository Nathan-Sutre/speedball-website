"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAuthForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username === "admin" && password === "admin") {
      localStorage.setItem("isAdmin", "true");
      document.cookie = "isAdmin=true; path=/";
      setStatus("success");
      router.push("/tournaments");
      return;
    }

    setStatus("error");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label
          className="mb-1 block text-sm text-slate-300"
          htmlFor="admin-username"
        >
          Identifiant
        </label>
        <input
          id="admin-username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
        />
      </div>

      <div>
        <label
          className="mb-1 block text-sm text-slate-300"
          htmlFor="admin-password"
        >
          Mot de passe
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="admin"
          className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-lg border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/30"
      >
        Se connecter
      </button>

      {status === "success" && (
        <p className="text-sm text-green-300">Connexion reussie.</p>
      )}

      {status === "error" && (
        <p className="text-sm text-red-300">
          Identifiant ou mot de passe invalide.
        </p>
      )}
    </form>
  );
}
