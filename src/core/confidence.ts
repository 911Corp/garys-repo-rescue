import { daysBetween } from './dates'
import type { Confidence, ProjectFacts } from './types'

/** Fields we expect for a fully analyzed project. Used to compute availability. */
export const EXPECTED_FIELDS = [
  'lastCommitAt', 'commitsTotal', 'commits12m', 'latestRelease', 'contributors', 'openPrs', 'languages', 'quality', 'forkIntel', 'license',
] as const

/**
 * Data confidence = availability (60%) + freshness (25%) + identity quality (15%).
 * Missing data lowers confidence, it never lowers the project's own scores.
 */
export function dataConfidence(p: ProjectFacts, now: Date): Confidence {
  const notes: string[] = []
  const missing = EXPECTED_FIELDS.filter((f) => p.meta.unavailable.includes(f))
  const availability = 1 - missing.length / EXPECTED_FIELDS.length
  if (missing.length) notes.push(`Not collected: ${missing.join(', ')}`)

  const days = Math.max(0, daysBetween(p.meta.verifiedAt, now) ?? 999)
  const syncDays = p.meta.oldestSourceSync ? Math.max(0, daysBetween(p.meta.oldestSourceSync, now) ?? 999) : null
  const f = (d: number) => (d <= 14 ? 1 : d <= 45 ? 0.8 : d <= 120 ? 0.5 : 0.2)
  // Search metadata (stars, push date) is as fresh as the build; secondary-source data may be older.
  const freshness = syncDays == null ? f(days) : f(days) * 0.5 + f(syncDays) * 0.5
  if (days > 45) notes.push(`Last verified ${Math.round(days)} days ago`)
  if (syncDays != null && syncDays > 45) notes.push(`Some details come from a source synced ${Math.round(syncDays)} days ago`)

  const identity = (p.description ? 0.5 : 0) + (p.license.spdx && p.license.spdx !== 'NOASSERTION' ? 0.5 : p.meta.unavailable.includes('license') ? 0 : 0.35)
  if (!p.description) notes.push('No description provided by the owner')
  if (p.meta.depth === 'indexed') notes.push('Indexed from search metadata only (no deep analysis yet)')

  const score = Math.round((availability * 0.6 + freshness * 0.25 + identity * 0.15) * 100)
  const level = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low'
  return { score, level, availability: Math.round(availability * 100) / 100, freshnessDays: Math.round(days), notes }
}
