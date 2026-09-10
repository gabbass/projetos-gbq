const users = [
  { name: "Ana Beatriz", role: "Gestora de projetos", access: "Administrador" },
  { name: "João Pedro", role: "PMO", access: "Editor" },
  { name: "Lina Souza", role: "Operações", access: "Leitura" },
];

export default function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[2rem] bg-[var(--panel)] p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 space-y-2">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            Configurações
          </span>
          <h1 className="font-heading text-3xl font-semibold text-slate-900">
            Cadastro de usuários
          </h1>
          <p className="text-sm text-slate-600">
            Controle quem acessa o sistema e qual papel cada usuário possui.
          </p>
        </div>
        <form className="space-y-4">
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            Nome completo
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
              defaultValue="Marina Costa"
            />
          </label>
          <label className="block space-y-2 text-sm font-medium text-slate-700">
            E-mail
            <input
              type="email"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
              defaultValue="marina@empresa.com"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Perfil
              <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400">
                <option>Administrador</option>
                <option>Editor</option>
                <option>Leitura</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Área
              <input
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
                defaultValue="Tecnologia"
              />
            </label>
          </div>
          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white"
          >
            Cadastrar usuário
          </button>
        </form>
      </section>

      <section className="rounded-[2rem] bg-[var(--panel)] p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-slate-900">
              Usuários ativos
            </h2>
            <p className="text-sm text-slate-600">Permissões atuais da plataforma.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {users.length} ativos
          </span>
        </div>
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.name}
              className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-900">{user.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{user.role}</p>
                </div>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                  {user.access}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
