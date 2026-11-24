export const DAY = 86_400_000

export function monthsBetween(fromIso: string | null | undefined, to: Date): number | null {
  if (!fromIso) return null
  const t = Date.parse(fromIso)
  if (Number.isNaN(t)) return null
  return Math.max(0, (to.getTime() - t) / (DAY * 30.4375))
}

export function daysBetween(fromIso: string | null | undefined, to: Date): number | null {
  if (!fromIso) return null
  const t = Date.parse(fromIso)
  if (Number.isNaN(t)) return null
  return (to.getTime() - t) / DAY
}

/** Most reliable "last activity" timestamp: last default-branch commit, else last push. */
export function lastActivity(p: { lastCommitAt: string | null; pushedAt: string | null }): string | null {
  return p.lastCommitAt ?? p.pushedAt ?? null
}

export function year(iso: string | null | undefined): number | null {
  if (!iso) return null
  const y = new Date(iso).getUTCFullYear()
  return Number.isNaN(y) ? null : y
}

export function humanAge(months: number | null): string {
  if (months == null) return 'unknown'
  if (months < 1) return 'this month'
  if (months < 12) return `${Math.round(months)} mo ago`
  const y = months / 12
  return `${y < 10 ? y.toFixed(1).replace(/\.0$/, '') : Math.round(y)} yr ago`
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'n/a'
  return iso.slice(0, 10)
}
