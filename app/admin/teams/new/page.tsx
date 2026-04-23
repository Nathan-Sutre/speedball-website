import data from "@/data/data.json";

export const metadata = {
  title: "New Team - Admin",
};

const tournamentOptions = [
  ...new Set([
    ...data.tournaments.map((tournament) => tournament.name),
    ...data.teamStats.flatMap((team) =>
      team.competitions
        .filter((competition) => competition.type === "teamcup")
        .map((competition) => competition.name),
    ),
  ]),
];

export default function NewTeamPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col px-2 py-4 sm:px-4">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-amber-400/20 bg-slate-900/70 p-6">
        <h1 className="mb-2 text-xl font-semibold text-white">
          Add Team to Tournament
        </h1>
        <p className="mb-6 text-sm text-slate-300">
          Renseigne les infos de l'equipe et les 3 logins des membres.
        </p>

        <form
          action="/api/admin/teams"
          method="post"
          encType="multipart/form-data"
          className="space-y-4"
        >
          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="team-tournament"
            >
              Tournament
            </label>
            <select
              id="team-tournament"
              name="tournament"
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
              defaultValue={tournamentOptions[0]}
            >
              {tournamentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="mb-1 block text-sm text-slate-300"
              htmlFor="team-name"
            >
              Team Name
            </label>
            <input
              id="team-name"
              name="teamName"
              type="text"
              placeholder="Crimson Vipers"
              required
              className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="team-color"
              >
                Team Color
              </label>
              <input
                id="team-color"
                name="teamColor"
                type="color"
                defaultValue="#f59e0b"
                className="h-10 w-full cursor-pointer rounded-lg border border-white/15 bg-slate-950/70 p-1"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="team-photo"
              >
                Profile Photo
              </label>
              <input
                id="team-photo"
                name="teamPhoto"
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500/25 file:px-2 file:py-1 file:text-amber-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="member-id-1"
              >
                Login #1
              </label>
              <input
                id="member-id-1"
                name="login1"
                type="text"
                placeholder="player_one"
                className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="member-id-2"
              >
                Login #2
              </label>
              <input
                id="member-id-2"
                name="login2"
                type="text"
                placeholder="player_two"
                className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm text-slate-300"
                htmlFor="member-id-3"
              >
                Login #3
              </label>
              <input
                id="member-id-3"
                name="login3"
                type="text"
                placeholder="player_three"
                className="w-full rounded-lg border border-white/15 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-amber-300"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-200 hover:bg-amber-500/30"
          >
            Save Team (demo)
          </button>
        </form>
      </section>
    </div>
  );
}
