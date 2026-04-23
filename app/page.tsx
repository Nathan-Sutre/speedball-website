export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.15),_transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,0.92))] p-8 sm:p-12">
        <p className="mb-3 text-xs font-semibold tracking-[0.24em] text-cyan-200 uppercase">
          Dashboard
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-5xl">
          Follow every match with clean stats and instant highlights.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Use the navigation above to explore tournaments, latest games,
          results, and detailed performance breakdowns for players, teams, and
          maps.
        </p>
      </section>
    </div>
  );
}
