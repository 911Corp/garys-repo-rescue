import { lastActivity, monthsBetween } from './dates'
import type { ProjectFacts, RevivalDifficulty } from './types'

/**
 * Apparent revival difficulty from observable facts only.
 * Points are summed; each input that is unavailable is skipped and counted.
 * If 3 or more of the 6 inputs are unavailable, the result is "Unknown".
 */
export function revivalDifficulty(p: ProjectFacts, ref: Date, legacyTech: string[]): { level: RevivalDifficulty; points: number | null; reasons: string[] } {
  const reasons: string[] = []
  let points = 0
  let missing = 0

  // 1. Repository size (includes history and assets, so it is a coarse proxy).
  if (p.sizeKb == null) missing++
  else {
    const mb = p.sizeKb / 1024
    const s = mb < 0.5 ? 0 : mb < 5 ? 1 : mb < 50 ? 2 : 3
    points += s
    reasons.push(`Repository size ${mb < 1 ? `${p.sizeKb} KB` : `${mb.toFixed(1)} MB`} (+${s})`)
  }

  // 2. History depth.
  if (p.commitsTotal == null) missing++
  else {
    const s = p.commitsTotal < 100 ? 0 : p.commitsTotal < 1000 ? 1 : p.commitsTotal < 5000 ? 2 : 3
    points += s
    reasons.push(`${p.commitsTotal.toLocaleString('en-US')} commits on default branch (+${s})`)
  }

  // 3. Language spread.
  if (p.languages == null) missing++
  else {
    const significant = p.languages.filter((l) => l.share >= 0.1).length
    const s = significant >= 3 ? 1 : 0
    points += s
    if (s) reasons.push(`${significant} significant languages (+1)`)
  }

  // 4. Docs.
  if (p.quality.readme == null) missing++
  else if (!p.quality.readme) {
    points += 2
    reasons.push('No README detected (+2)')
  } else if (!p.quality.docs && (p.sizeKb ?? 0) > 5 * 1024) {
    points += 1
    reasons.push('Large codebase without a docs folder (+1)')
  }

  // 5. Tests.
  if (p.quality.tests == null) missing++
  else if (!p.quality.tests && (p.sizeKb ?? 0) > 512) {
    points += 1
    reasons.push('No root-level tests detected (+1)')
  }

  // 6. Time asleep and legacy stack.
  const months = monthsBetween(lastActivity(p), ref)
  if (months == null) missing++
  else if (months > 60) {
    points += 1
    reasons.push(`Untouched for ${(months / 12).toFixed(0)}+ years: dependencies likely outdated (+1)`)
  }
  if (legacyTech.length) {
    points += 1
    reasons.push(`Legacy tech: ${legacyTech.join(', ')} (+1)`)
  }

  if (missing >= 3) return { level: 'Unknown', points: null, reasons: [...reasons, `${missing} of 6 inputs unavailable`] }
  const level: RevivalDifficulty = points <= 2 ? 'Beginner' : points <= 4 ? 'Intermediate' : points <= 6 ? 'Advanced' : 'Expert'
  if (missing) reasons.push(`${missing} input(s) unavailable, estimate may be low`)
  return { level, points, reasons }
}
