/**
 * Fork Intelligence (light). Pure and shared by the collector and the browser
 * on-demand check, so both apply exactly the same rules (see docs/SCORING.md).
 */
import type { ForkInfo, ForkIntel } from './types'

/** Minimal shape of a fork as returned by GET /repos/{owner}/{repo}/forks. */
export interface RawFork {
  full_name: string
  html_url: string
  stargazers_count: number
  pushed_at: string | null
  archived: boolean
}

const DAY = 86400000

/**
 * @param forks       forks returned by the API (top forks by stars)
 * @param originalPush ISO date of the original's last commit or push
 * @param originalStars stars of the original repository
 */
export function analyzeForks(forks: RawFork[], originalPush: string, originalStars: number, now: Date): Omit<ForkIntel, 'successorHints'> {
  const origPush = Date.parse(originalPush)
  const infos: ForkInfo[] = forks.map((f) => ({
    fullName: f.full_name,
    url: f.html_url,
    stars: f.stargazers_count,
    pushedAt: f.pushed_at,
    archived: f.archived,
    pushedAfterOriginalDays: f.pushed_at ? Math.round((Date.parse(f.pushed_at) - origPush) / DAY) : null,
  }))
  // A fork counts as "notable" when it was pushed more than 30 days after the original and is not archived.
  const ahead = infos.filter((f) => (f.pushedAfterOriginalDays ?? -1) > 30 && !f.archived)
  const notable = ahead
    .sort((a, b) => b.stars - a.stars || (b.pushedAfterOriginalDays ?? 0) - (a.pushedAfterOriginalDays ?? 0))
    .slice(0, 5)
  // "Possible successor": enough stars (>= 10 and >= 2% of the original), kept going 6+ months
  // after the original stopped, and still pushed within the last year.
  const minStars = Math.max(10, Math.round(originalStars * 0.02))
  const successor = notable.find(
    (f) => f.stars >= minStars && (f.pushedAfterOriginalDays ?? 0) > 180 && f.pushedAt != null && now.getTime() - Date.parse(f.pushedAt) < 365 * DAY,
  )
  return { checked: true, inspected: infos.length, notable, possibleSuccessor: successor?.fullName ?? null }
}
