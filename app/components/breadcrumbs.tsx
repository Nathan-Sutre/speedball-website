"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const staticLabels: Record<string, string> = {
  tournaments: "Tournaments",
  "team-stats": "Team Stats",
  "player-stats": "Player Stats",
  "map-stats": "Map Stats",
  players: "Player Stats",
  maps: "Map Stats",
  "last-games": "Last Games",
  admin: "Admin",
  teams: "Teams",
  new: "New",
  phases: "Phases",
};

function getSegmentHref(index: number, segments: string[]): string {
  if (index === 0 && segments[0] === "maps") {
    return "/map-stats";
  }

  if (index === 0 && segments[0] === "players") {
    return "/player-stats";
  }

  return `/${segments.slice(0, index + 1).join("/")}`;
}

function titleCaseSegment(segment: string): string {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getSegmentLabel(
  segment: string,
  _index: number,
  _all: string[],
): string {
  if (staticLabels[segment]) {
    return staticLabels[segment];
  }

  return titleCaseSegment(segment);
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-[98vw] px-2 pt-2 sm:px-4">
      <nav
        aria-label="Breadcrumb"
        className="rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2"
      >
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-300">
          <li>
            <Link
              href="/"
              className="rounded px-1 py-0.5 text-slate-200 hover:bg-white/10 hover:text-white"
            >
              Home
            </Link>
          </li>
          {segments.map((segment, index) => {
            const href = getSegmentHref(index, segments);
            const isLast = index === segments.length - 1;
            const label = getSegmentLabel(segment, index, segments);

            return (
              <li
                key={`${href}-${segment}`}
                className="flex items-center gap-1.5"
              >
                <span className="text-slate-500">/</span>
                {isLast ? (
                  <span className="font-semibold text-cyan-200">{label}</span>
                ) : (
                  <Link
                    href={href}
                    className="rounded px-1 py-0.5 text-slate-200 hover:bg-white/10 hover:text-white"
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
