const SSL_MODE_WITH_LEGACY_NODE_PG_SEMANTICS = /([?&]sslmode=)(prefer|require|verify-ca)(?=(&|#|$))/gi
const LIBPQ_COMPATIBILITY_ENABLED = /[?&]uselibpqcompat=true(?=(&|#|$))/i

export function normalizePostgresConnectionString(connectionString: string) {
  if (LIBPQ_COMPATIBILITY_ENABLED.test(connectionString)) return connectionString

  return connectionString.replace(
    SSL_MODE_WITH_LEGACY_NODE_PG_SEMANTICS,
    "$1verify-full",
  )
}
