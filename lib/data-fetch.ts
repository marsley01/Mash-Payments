import { getSupabaseAdmin } from "./supabase"
import { getCached, setCache } from "./cache"

type TableName = "profiles" | "daraja_credentials" | "transactions"

export async function fetchWithCache<T>(
  table: TableName,
  query: (qb: ReturnType<typeof getSupabaseAdmin>) => Promise<{ data: T | null; error: unknown }>,
  cacheKey: string,
  ttlMs = 30_000,
): Promise<{ data: T | null; error: unknown }> {
  const cached = getCached<{ data: T | null }>(cacheKey)
  if (cached) return cached

  const supabase = getSupabaseAdmin()
  const result = await query(supabase)

  if (!result.error && result.data) {
    setCache(cacheKey, { data: result.data }, ttlMs)
  }

  return result
}
