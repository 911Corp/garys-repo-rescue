import { lastActivity, monthsBetween } from './dates'
import type { MaintenanceStatus, ProjectFacts } from './types'

export const MAINTENANCE_RULES = {
  activeMonths: 6,
  activeMinCommits12m: 12,
  lowActivityMonths: 18,
  stableMinAgeYears: 3,
  stableMaxOpenIssues: 25,
  stableMinCommits: 50,
} as const

/**
 * Apparent maintenance status. Inactivity is NEVER treated as abandonment on its own:
 * a long-inactive project with releases, few open issues and a real history is "Stable".
 */
export function maintenanceStatus(p: ProjectFacts, ref: Date): { status: MaintenanceStatus; months: number | null; reason: string } {
  const R = MAINTENANCE_RULES
  const months = monthsBetween(lastActivity(p), ref)
  if (p.archived) {
    return { status: 'Archived', months, reason: 'The owner archived this repository (read-only on GitHub).' }
  }
  if (months == null) return { status: 'Unknown', months, reason: 'No commit or push date available.' }

  if (months <= R.activeMonths) {
    if (p.commits12m == null || p.commits12m >= R.activeMinCommits12m) {
      return { status: 'Active', months, reason: `Last commit ${Math.round(months)} month(s) ago${p.commits12m != null ? `, ${p.commits12m} commits in 12 months` : ''}.` }
    }
    return { status: 'Low Activity', months, reason: `Recent commit but only ${p.commits12m} commits in 12 months.` }
  }
  if (months <= R.lowActivityMonths) {
    return { status: 'Low Activity', months, reason: `Last commit ${Math.round(months)} months ago.` }
  }

  const ageYears = (monthsBetween(p.createdAt, ref) ?? 0) / 12
  const hasRelease = p.latestRelease != null
  // If open issues alone are unknown, open issues + PRs is a valid upper bound.
  const fewIssues = p.openIssues != null ? p.openIssues <= R.stableMaxOpenIssues : p.openIssuesAndPrs <= R.stableMaxOpenIssues
  const realHistory = p.commitsTotal == null ? false : p.commitsTotal >= R.stableMinCommits
  if (hasRelease && fewIssues && realHistory && ageYears >= R.stableMinAgeYears) {
    return {
      status: 'Stable',
      months,
      reason: `Quiet for ${Math.round(months / 12)} yr, but has releases, a real history and few open issues: may simply be done.`,
    }
  }
  return { status: 'Dormant', months, reason: `No commit on the default branch for ${(months / 12).toFixed(1)} years.` }
}
