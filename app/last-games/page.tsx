export const metadata = {
  title: "Last Games - Speedball Stats",
};

const lastGames = [
  { id: 1, label: "Crimson Vipers vs Blue Phantoms", date: "2026-04-21" },
  { id: 2, label: "Iron Wolves vs Nova Pulse", date: "2026-04-20" },
  { id: 3, label: "Shadow Unit vs Arctic Echo", date: "2026-04-19" },
  { id: 4, label: "Delta Strike vs Titan Recoil", date: "2026-04-18" },
];

export default function LastGamesPage() {
  return (
    <div className="mx-auto flex flex-1 min-h-0 w-full max-w-[98vw] flex-col px-2 py-3 sm:px-4">
      <section className="flex flex-1 min-h-0 flex-col rounded-2xl border border-cyan-400/20 bg-slate-900/70 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-white sm:text-xl">
          Last Games
        </h2>
        <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
          {lastGames.map((game) => (
            <li
              key={game.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="text-slate-100">{game.label}</span>
              <span className="text-slate-400">{game.date}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
