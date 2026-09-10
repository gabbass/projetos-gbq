const projects = [
  { name: "Portal do cliente", sponsor: "Diretoria comercial", status: "Em andamento" },
  { name: "Aplicativo mobile", sponsor: "Produto", status: "Backlog" },
  { name: "Onboarding de fornecedores", sponsor: "Operações", status: "Concluído" },
];

export default function ProjectsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] bg-[var(--panel)] p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 space-y-2">
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            Cadastro
          </span>
          <h1 className="font-heading text-3xl font-semibold text-slate-900">
            Cadastro de projeto
          </h1>
          <p className="text-sm text-slate-600">
            Registre novos projetos com área responsável, prioridade e janela de entrega.
          </p>
        </div>
        <form className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Nome do projeto
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
              defaultValue="Novo portal de parceiros"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Área responsável
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
              defaultValue="Transformação digital"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Prioridade
            <select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400">
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Prazo previsto
            <input
              type="date"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-400"
              defaultValue="2026-11-30"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700 md:col-span-2">
            Objetivo
            <textarea
              className="min-h-32 w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
              defaultValue="Centralizar o acompanhamento comercial e reduzir o tempo de resposta ao cliente."
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-medium text-white"
            >
              Salvar projeto
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-[2rem] bg-[var(--panel)] p-6 shadow-sm ring-1 ring-black/5">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-semibold text-slate-900">
              Projetos cadastrados
            </h2>
            <p className="text-sm text-slate-600">Exemplo de carteira atual do sistema.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            {projects.length} registros
          </span>
        </div>
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.name}
              className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <h3 className="font-medium text-slate-900">{project.name}</h3>
              <dl className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between gap-4">
                  <dt>Patrocinador</dt>
                  <dd>{project.sponsor}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Status</dt>
                  <dd>{project.status}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
