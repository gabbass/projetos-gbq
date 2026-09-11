import os from "node:os"

import Link from "next/link"
import {
  CheckCircle2,
  Cloud,
  Database,
  RefreshCw,
  Server,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react"
import { Client } from "pg"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type DatabaseInfo = {
  database: string
  user_name: string
  server_version: string
  timezone: string
  server_address: string | null
  server_port: number | null
  database_time: Date
  tls: boolean
}

type DatabaseDiagnostic = {
  configured: boolean
  connected: boolean
  latencyMs: number | null
  target: string | null
  info: DatabaseInfo | null
  error: string | null
}

function getRuntimeInfo() {
  if (process.env.VERCEL === "1") {
    return {
      name: "Vercel",
      description: process.env.VERCEL_ENV
        ? `Ambiente ${process.env.VERCEL_ENV}`
        : "Deployment Vercel",
      detail: process.env.VERCEL_REGION
        ? `Região ${process.env.VERCEL_REGION}`
        : "Região não informada",
      icon: Cloud,
    }
  }

  if (process.env.APP_ENVIRONMENT === "vps" || process.env.NODE_ENV === "production") {
    return {
      name: "VPS",
      description: "Processo Node.js em produção",
      detail: os.hostname(),
      icon: Server,
    }
  }

  return {
    name: "Local",
    description: "Ambiente de desenvolvimento",
    detail: os.hostname(),
    icon: Server,
  }
}

function describeTarget(connectionString: string) {
  try {
    const url = new URL(connectionString)
    const database = url.pathname.replace(/^\//, "") || "postgres"
    return `${url.hostname}:${url.port || "5432"}/${database}`
  } catch {
    return "Destino configurado"
  }
}

function safeError(error: unknown, connectionString: string) {
  const message = error instanceof Error ? error.message : "Falha desconhecida ao conectar"

  try {
    const url = new URL(connectionString)
    return url.password ? message.replaceAll(url.password, "********") : message
  } catch {
    return message
  }
}

async function checkDatabase(): Promise<DatabaseDiagnostic> {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    return {
      configured: false,
      connected: false,
      latencyMs: null,
      target: null,
      info: null,
      error: "A variável DATABASE_URL não está definida neste ambiente.",
    }
  }

  const client = new Client({
    connectionString,
    application_name: "gbq-diagnostico",
    connectionTimeoutMillis: 5_000,
    query_timeout: 5_000,
  })
  const startedAt = performance.now()

  try {
    await client.connect()
    const result = await client.query<DatabaseInfo>(`
      SELECT
        current_database() AS database,
        current_user AS user_name,
        current_setting('server_version') AS server_version,
        current_setting('TimeZone') AS timezone,
        inet_server_addr()::text AS server_address,
        inet_server_port() AS server_port,
        current_timestamp AS database_time,
        COALESCE(
          (SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()),
          false
        ) AS tls
    `)

    return {
      configured: true,
      connected: true,
      latencyMs: Math.round(performance.now() - startedAt),
      target: describeTarget(connectionString),
      info: result.rows[0] ?? null,
      error: null,
    }
  } catch (error) {
    return {
      configured: true,
      connected: false,
      latencyMs: Math.round(performance.now() - startedAt),
      target: describeTarget(connectionString),
      info: null,
      error: safeError(error, connectionString),
    }
  } finally {
    await client.end().catch(() => undefined)
  }
}

function formatDatabaseTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value))
}

export default async function DiagnosticPage() {
  const runtime = getRuntimeInfo()
  const database = await checkDatabase()
  const RuntimeIcon = runtime.icon
  const statusLabel = database.connected
    ? "Conexão saudável"
    : database.configured
      ? "Falha na conexão"
      : "Configuração ausente"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="secondary" className="mb-3">
            <Database />
            Infraestrutura
          </Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Diagnóstico do ambiente
          </h1>
          <p className="mt-1 text-muted-foreground">
            Identifica onde a aplicação está executando e valida o acesso ao PostgreSQL.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/diagnostico">
            <RefreshCw />
            Testar novamente
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          title="Ambiente"
          value={runtime.name}
          description={runtime.description}
          icon={RuntimeIcon}
        />
        <StatusCard
          title="Banco de dados"
          value={database.connected ? "Conectado" : "Desconectado"}
          description={database.target ?? "DATABASE_URL não configurada"}
          icon={database.connected ? CheckCircle2 : XCircle}
          healthy={database.connected}
        />
        <StatusCard
          title="Criptografia"
          value={database.info?.tls ? "TLS ativo" : "Sem TLS"}
          description={database.connected ? "Sessão atual com o PostgreSQL" : "Aguardando conexão"}
          icon={ShieldCheck}
          healthy={database.info?.tls === true}
        />
        <StatusCard
          title="Tempo de resposta"
          value={database.latencyMs === null ? "—" : `${database.latencyMs} ms`}
          description="Conexão e consulta de diagnóstico"
          icon={Timer}
          healthy={database.connected}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Status da conexão</CardTitle>
          <CardDescription>
            A senha e a URL completa nunca são exibidas nesta página.
          </CardDescription>
          <CardAction>
            <Badge variant={database.connected ? "default" : "destructive"}>
              {database.connected ? <CheckCircle2 /> : <XCircle />}
              {statusLabel}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {database.connected && database.info ? (
            <Table>
              <TableBody>
                <DetailRow label="Execução" value={`${runtime.name} · ${runtime.detail}`} />
                <DetailRow label="Destino" value={database.target ?? "Não informado"} />
                <DetailRow label="Banco" value={database.info.database} />
                <DetailRow label="Usuário" value={database.info.user_name} />
                <DetailRow label="PostgreSQL" value={database.info.server_version} />
                <DetailRow
                  label="Servidor"
                  value={`${database.info.server_address ?? "socket local"}:${database.info.server_port ?? "padrão"}`}
                />
                <DetailRow label="Fuso do banco" value={database.info.timezone} />
                <DetailRow label="Horário do banco" value={formatDatabaseTime(database.info.database_time)} />
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="font-medium text-destructive">Não foi possível acessar o banco</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                {database.error}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({
  title,
  value,
  description,
  icon: Icon,
  healthy,
}: {
  title: string
  value: string
  description: string
  icon: typeof Server
  healthy?: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <div
            className={`flex size-9 items-center justify-center rounded-xl ${
              healthy === false
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            <Icon className="size-4" />
          </div>
        </CardAction>
        <CardTitle className="font-sans text-2xl font-semibold">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="truncate text-xs text-muted-foreground" title={description}>
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <TableRow>
      <TableCell className="w-40 font-medium text-muted-foreground">{label}</TableCell>
      <TableCell className="break-all font-mono text-xs sm:text-sm">{value}</TableCell>
    </TableRow>
  )
}
