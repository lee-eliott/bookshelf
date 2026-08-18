const BASE_URL = "https://www.googleapis.com/books/v1";

/** Backoff before each retry. Length also sets the number of retries. */
const RETRY_DELAYS_MS = [200, 500, 1100, 2000];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(path: string, params: Record<string, string | number>): string {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * Fetches the Google Books API with retries.
 *
 * The API answers a large share of requests with a transient
 * 503 `backendFailed` — unrelated to quota or API key — so a single attempt
 * fails often enough to be visible to the user. Retrying on 429/5xx makes the
 * search reliable; 4xx statuses are permanent and returned as-is.
 *
 * Only the first attempt uses the Next.js data cache: a cached failure would
 * otherwise be replayed instantly on every retry, defeating the backoff.
 */
export async function fetchGoogleBooks(
  path: string,
  params: Record<string, string | number>,
  revalidate: number
): Promise<Response> {
  const url = buildUrl(path, params);
  let lastResponse: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(
        url,
        attempt === 0 ? { next: { revalidate } } : { cache: "no-store" }
      );

      if (res.ok) return res;

      lastResponse = res;
      // Permanent failures (bad request, forbidden, not found) — stop here.
      if (res.status < 500 && res.status !== 429) return res;
    } catch (err) {
      lastError = err;
    }

    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error("Google Books unreachable");
}
