"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const primaryLinks = [
  { label: "Tournaments", href: "/tournaments" },
  { label: "Last Games", href: "/last-games" },
  { label: "Player Stats", href: "/player-stats" },
  { label: "Map Stats", href: "/map-stats" },
  { label: "Team Stats", href: "/team-stats" },
];

const iconLinks = [
  {
    label: "Discord",
    href: "https://discord.gg/YAteBdV8U",
    external: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20.32 4.37A19.8 19.8 0 0 0 16.3 3a13.7 13.7 0 0 0-.51 1.05 18.2 18.2 0 0 0-7.58 0A13.7 13.7 0 0 0 7.7 3 19.8 19.8 0 0 0 3.68 4.37C1.16 8.08.47 11.7.82 15.27A20 20 0 0 0 6.03 18a14.4 14.4 0 0 0 1.11-1.8c-.62-.23-1.2-.52-1.76-.85.15-.11.3-.23.44-.35a14 14 0 0 0 12.36 0c.14.12.29.24.44.35-.56.33-1.14.62-1.76.85.3.63.67 1.23 1.11 1.8a20 20 0 0 0 5.21-2.73c.41-4.14-.7-7.72-2.86-10.9ZM8.48 13.02c-.74 0-1.35-.68-1.35-1.52s.6-1.52 1.35-1.52 1.36.68 1.35 1.52-.6 1.52-1.35 1.52Zm7.04 0c-.74 0-1.35-.68-1.35-1.52s.6-1.52 1.35-1.52 1.36.68 1.35 1.52-.6 1.52-1.35 1.52Z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/watch?v=BNSCQ30Y8CU",
    external: true,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M23.5 7.2a3 3 0 0 0-2.1-2.1C19.6 4.6 12 4.6 12 4.6s-7.6 0-9.4.5A3 3 0 0 0 .5 7.2 31.7 31.7 0 0 0 0 12a31.7 31.7 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.8.5 9.4.5 9.4.5s7.6 0 9.4-.5a3 3 0 0 0 2.1-2.1A31.7 31.7 0 0 0 24 12a31.7 31.7 0 0 0-.5-4.8ZM9.6 15.1V8.9l6 3.1-6 3.1Z" />
      </svg>
    ),
  },
  {
    label: "Timeline",
    href: "/timeline",
    external: false,
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="6" cy="12" r="1.6" />
        <circle cx="12" cy="12" r="1.6" />
        <circle cx="18" cy="12" r="1.6" />
        <path d="M7.6 12h2.8m2.8 0H16.4" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
  }, []);

  function handleLogout() {
    localStorage.removeItem("isAdmin");
    document.cookie = "isAdmin=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setIsAdmin(false);
    router.push("/admin");
  }

  return (
    <header className="sticky top-0 z-30 overflow-visible border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-5.5 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Home"
          className="absolute bottom-0 left-4 z-20 inline-flex h-24 w-24 translate-y-[20%] items-center justify-center sm:left-6 lg:left-8"
        >
          <Image
            src="/speedball-logo.png"
            alt="Speedball logo"
            width={88}
            height={88}
            className="h-[5.5rem] w-[5.5rem] object-contain transition-transform duration-1000 ease-out hover:rotate-[20deg]"
            priority
          />
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pl-24 sm:pl-28"
          aria-label="Main navigation"
        >
          {primaryLinks.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-100 transition hover:border-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {iconLinks.map((item) => {
            const sharedClass =
              "inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-400/40 text-cyan-200 transition hover:border-cyan-200 hover:text-white";

            if (item.external) {
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className={sharedClass}
                >
                  {item.icon}
                </a>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-label={item.label}
                className={sharedClass}
              >
                {item.icon}
              </Link>
            );
          })}

          {isAdmin ? (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Admin logout"
              title="Logout"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/50 text-amber-300 transition hover:border-amber-200 hover:text-amber-100"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M14 7V5.5A1.5 1.5 0 0 0 12.5 4h-6A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20h6a1.5 1.5 0 0 0 1.5-1.5V17" />
                <path d="M10 12h9" />
                <path d="m16 8 4 4-4 4" />
              </svg>
            </button>
          ) : (
            <Link
              href="/admin"
              aria-label="Admin authentication"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-400/50 text-amber-300 transition hover:border-amber-200 hover:text-amber-100"
              title="Admin"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="4.5" y="10" width="15" height="9" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
