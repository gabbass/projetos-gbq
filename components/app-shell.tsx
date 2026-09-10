"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const items = [
  { href: "/", label: "Kanban" },
  { href: "/projetos", label: "Cadastro de projetos" },
  { href: "/configuracoes", label: "Configurações" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <aside className="w-full rounded-[2rem] bg-[var(--panel)] p-5 shadow-sm ring-1 ring-black/5 lg:min-h-[calc(100vh-3rem)] lg:w-80">
          <div className="space-y-2 border-b border-slate-200 pb-5">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              GBQ
            </span>
            <h1 className="font-heading text-2xl font-semibold">Controle de projetos</h1>
            <p className="text-sm leading-6 text-slate-600">
              Plataforma com visão kanban, cadastro de projetos e gestão de usuários.
            </p>
          </div>

          <nav className="mt-5 space-y-2">
            {items.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xs opacity-70">{active ? "Atual" : "Abrir"}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
