/**
 * Minimal GitHub REST client for collection scripts (Node only, never shipped to the browser).
 *  - Token read from GITHUB_TOKEN / GH_TOKEN env only.
 *  - Disk cache with ETag conditional requests (a 304 does not count against the primary rate limit).
 *  - Search endpoint throttled to stay under 30 requests/minute.
 *  - Waits on primary/secondary rate limits instead of hammering.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const API = 'https://api.github.com'
const CACHE_DIR = join(process.cwd(), 'data', 'cache', 'http')
mkdirSync(CACHE_DIR, { recursive: true })

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
if (!token) console.warn('[github] No GITHUB_TOKEN set: unauthenticated limits are 60 req/h and 10 search/min.')

export interface GhResponse<T> {
  status: number
  data: T | null
  lastPage: number | null
  fromCache: boolean
}

interface CacheEntry { etag: string | null; status: number; data: unknown; lastPage: number | null; at: string }

export const stats = { requests: 0, notModified: 0, cacheHits: 0, errors: 0, remaining: null as number | null }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const keyOf = (url: string) => createHash('sha1').update(url).digest('hex')

function parseLastPage(link: string | null): number | null {
  if (!link) return null
  const m = link.match(/[?&]page=(\d+)>; rel="last"/)
  return m ? Number(m[1]) : null
}

let searchQueue = Promise.resolve()
let lastSearch = 0
const SEARCH_INTERVAL = 2200 // ms, ~27/min

/**
 * GET a GitHub API path. `maxAgeHours`: reuse a cached body without any request if younger than this
 * (useful for re-running the pipeline offline); otherwise revalidate with If-None-Match.
 */
export async function gh<T>(path: string, opts: { maxAgeHours?: number; search?: boolean } = {}): Promise<GhResponse<T>> {
  const url = path.startsWith('http') ? path : `${API}${path}`
  const file = join(CACHE_DIR, `${keyOf(url)}.json`)
  const cached: CacheEntry | null = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null
  if (cached && opts.maxAgeHours && Date.now() - Date.parse(cached.at) < opts.maxAgeHours * 3600_000) {
    stats.cacheHits++
    return { status: cached.status, data: cached.data as T, lastPage: cached.lastPage, fromCache: true }
  }

  if (opts.search) {
    searchQueue = searchQueue.then(async () => {
      const wait = lastSearch + SEARCH_INTERVAL - Date.now()
      if (wait > 0) await sleep(wait)
      lastSearch = Date.now()
    })
    await searchQueue
  }

  for (let attempt = 0; attempt < 6; attempt++) {
    const headers: Record<string, string> = {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'garys-repo-rescue-collector',
    }
    // The token is only ever sent to api.github.com, never to secondary sources.
    if (token && url.startsWith(API)) headers.authorization = `Bearer ${token}`
    if (!url.startsWith(API)) headers.accept = 'application/json'
    if (cached?.etag) headers['if-none-match'] = cached.etag
    let res: Response
    try {
      stats.requests++
      res = await fetch(url, { headers })
    } catch (e) {
      stats.errors++
      await sleep(1000 * 2 ** attempt)
      continue
    }
    const rem = res.headers.get('x-ratelimit-remaining')
    if (rem != null && !opts.search && url.startsWith(API)) stats.remaining = Number(rem)

    if (res.status === 304 && cached) {
      stats.notModified++
      writeFileSync(file, JSON.stringify({ ...cached, at: new Date().toISOString() }))
      return { status: cached.status, data: cached.data as T, lastPage: cached.lastPage, fromCache: true }
    }
    if (res.status === 403 || res.status === 429) {
      const retryAfter = Number(res.headers.get('retry-after') || 0)
      const reset = Number(res.headers.get('x-ratelimit-reset') || 0)
      const body = await res.text()
      if (/rate limit|abuse|secondary/i.test(body) || res.status === 429) {
        const waitMs = retryAfter ? retryAfter * 1000 : reset && rem === '0' ? reset * 1000 - Date.now() + 2000 : 60_000
        console.warn(`[github] rate limited on ${path}, waiting ${Math.round(waitMs / 1000)}s`)
        await sleep(Math.min(Math.max(waitMs, 5000), 15 * 60_000))
        continue
      }
      // 403 that is not a rate limit (e.g. "contributor list too large"): treat as unavailable.
      stats.errors++
      return { status: 403, data: null, lastPage: null, fromCache: false }
    }
    if (res.status >= 500) {
      stats.errors++
      await sleep(1500 * 2 ** attempt)
      continue
    }
    const lastPage = parseLastPage(res.headers.get('link'))
    const data = res.status === 204 ? null : res.ok ? ((await res.json()) as T) : null
    if (!res.ok) await res.body?.cancel()
    const entry: CacheEntry = { etag: res.headers.get('etag'), status: res.status, data, lastPage, at: new Date().toISOString() }
    if (res.ok || res.status === 404 || res.status === 409) writeFileSync(file, JSON.stringify(entry))
    return { status: res.status, data, lastPage, fromCache: false }
  }
  return { status: 0, data: null, lastPage: null, fromCache: false }
}

/** Run async tasks with bounded concurrency. */
export async function pool<T, R>(items: T[], size: number, fn: (item: T, i: number) => Promise<R>, onProgress?: (done: number) => void): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0
  let done = 0
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i], i)
        done++
        onProgress?.(done)
      }
    }),
  )
  return out
}
