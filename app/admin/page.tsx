import AdminAuthForm from "../components/admin-auth-form";

export const metadata = {
  title: "Admin Authentication - Speedball Stats",
};

export default function AdminPage() {
  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[98vw] flex-col px-2 py-4 sm:px-4">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-amber-400/20 bg-slate-900/70 p-6">
        <h1 className="mb-1 text-xl font-semibold text-white">Admin Login</h1>
        <p className="mb-6 text-sm text-slate-300">
          Connecte-toi avec identifiant admin et mot de passe admin.
        </p>

        <AdminAuthForm />
      </section>
    </div>
  );
}
