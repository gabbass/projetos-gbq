const columns = [
  {
    title: "Backlog",
    accent: "bg-slate-200 text-slate-700",
    cards: [
      { title: "Portal do cliente", owner: "Ana", priority: "Alta" },
      { title: "Integração com financeiro", owner: "Rafael", priority: "Média" },
    ],
  },
  {
    title: "Em andamento",
    accent: "bg-blue-100 text-blue-700",
    cards: [
      { title: "Aplicativo mobile", owner: "Maya", priority: "Alta" },
      { title: "Dashboard executivo", owner: "João", priority: "Baixa" },
    ],
  },
  {
    title: "Concluído",
    accent: "bg-emerald-100 text-emerald-700",
    cards: [{ title: "Onboarding de fornecedores", owner: "Lina", priority: "Média" }],
  },
];

const metrics = [
  { label: "Projetos ativos", value: "12" },
  { label: "Entregas na semana", value: "08" },
  { label: "Usuários cadastrados", value: "27" },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-[2rem] bg-[var(--panel)] p-6 shadow-sm ring-1 ring-black/5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            Visão geral
          </span>
          <h1 className="font-heading text-3xl font-semibold text-slate-900">
            Kanban de projetos
          </h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Acompanhe prioridades, responsáveis e o andamento das principais frentes
            do sistema de controle de projetos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5"
            >
              <p className="text-sm text-slate-500">{metric.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        {columns.map((column) => (
          <article
            key={column.title}
            className="rounded-[2rem] bg-[var(--panel)] p-5 shadow-sm ring-1 ring-black/5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-xl font-semibold text-slate-900">
                {column.title}
              </h2>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${column.accent}`}>
                {column.cards.length} itens
              </span>
            </div>
            <div className="space-y-4">
              {column.cards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-[1.5rem] bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium text-slate-900">{card.title}</h3>
                      <p className="text-sm text-slate-500">Responsável: {card.owner}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                      {card.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
