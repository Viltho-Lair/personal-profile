/**
 * The visitor count, kept in Upstash Redis. The Vercel Marketplace integration
 * sets KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN);
 * without them the count is null and the counter stays hidden.
 */

export const VISITOR_KEY = "visitors:slayer-legends-analyzer";
/** localStorage key holding the day (YYYY-MM-DD) this browser was last counted. */
export const VISIT_COUNTED_KEY = "slayer-analyzer.visit-counted";

type Env = Record<string, string | undefined>;

export function redisConfig(env: Env) {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

/** Counts a visit (INCR) or reads the count (GET); null when Redis isn't set up or can't be reached. */
export async function visitorCount(action: "count" | "read", env: Env, fetcher: typeof fetch = fetch): Promise<number | null> {
  const config = redisConfig(env);
  if (!config) return null;
  try {
    const response = await fetcher(config.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify([action === "count" ? "INCR" : "GET", VISITOR_KEY]),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const { result } = (await response.json()) as { result?: unknown };
    const count = Number(result ?? 0);
    return Number.isFinite(count) ? count : null;
  } catch {
    return null;
  }
}

/** A browser is counted once a day: a new visit unless it was already counted today. */
export const isNewVisit = (lastCounted: string | null, today: string) => lastCounted !== today;
