import { lastActivity, monthsBetween } from './dates'
import { MAINSTREAM_LANGS } from './detect'
import type { LicenseStatus, MaintenanceStatus, ProjectFacts, RescueScore, ScoreComponent } from './types'

/** Weights sum to 1. Documented in docs/SCORING.md. Changing them is a breaking change for scores. */
export const RESCUE_WEIGHTS = {
  interest: 0.15,
  adoption: 0.2,
  access: 0.1,
  documentation: 0.15,
  license: 0.15,
  modernization: 0.1,
  base: 0.1,
  maintenance: 0.05,
} as const

const clamp = (x: number) => Math.max(0, Math.min(1, x))
/** log scale: 0 at `lo`, 1 at `hi`. */
export const logScale = (v: number, lo: number, hi: number) => clamp((Math.log10(Math.max(v, 1)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)))

/** Averages available sub-signals (null = unavailable, skipped). Returns null if none available. */
function avg(parts: (number | null)[]): number | null {
  const ok = parts.filter((x): x is number => x != null)
  return ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null
}
const b = (v: boolean | null): number | null => (v == null ? null : v ? 1 : 0)

export function rescueScore(p: ProjectFacts, ref: Date, ctx: { licenseStatus: LicenseStatus; maintenance: MaintenanceStatus; legacyTech: string[] }): RescueScore {
  const W = RESCUE_WEIGHTS
  const comps: ScoreComponent[] = []
  const push = (key: keyof typeof W, label: string, value: number | null, notes: string[]) =>
    comps.push({ key, label, weight: W[key], value: value == null ? null : Math.round(value * 1000) / 1000, notes })

  // Functional interest: is it clear what this does and for whom?
  const descLen = p.description?.trim().length ?? 0
  push('interest', 'Functional interest', avg([
    descLen >= 80 ? 1 : descLen >= 40 ? 0.75 : descLen >= 15 ? 0.45 : descLen > 0 ? 0.2 : 0,
    clamp(p.topics.length / 6),
    p.homepage ? 1 : 0,
  ]), [`description ${descLen} chars`, `${p.topics.length} topics`, p.homepage ? 'has homepage' : 'no homepage'])

  // Adoption signals (log scales; stars dominate but forks/contributors matter).
  push('adoption', 'Adoption signals', avg([
    logScale(p.stars, 50, 30000),
    logScale(p.forks, 5, 3000),
    p.contributors == null ? null : logScale(p.contributors, 1, 200),
  ]), [`${p.stars} stars`, `${p.forks} forks`, p.contributors == null ? 'contributors n/a' : `${p.contributors} contributors`])

  // Code accessibility: mainstream language, manageable size, standard build manifest.
  const mb = p.sizeKb == null ? null : p.sizeKb / 1024
  push('access', 'Code accessibility', avg([
    p.language == null ? null : MAINSTREAM_LANGS.has(p.language) ? 1 : 0.5,
    mb == null ? null : mb < 20 ? 1 : mb < 100 ? 0.6 : 0.3,
    p.meta.unavailable.includes('quality') ? null : p.quality.manifests.length ? 1 : 0.3,
  ]), [p.language ?? 'language n/a', mb == null ? 'size n/a' : `${mb.toFixed(1)} MB`, `${p.quality.manifests.length} manifest(s)`])

  // Documentation.
  const q = p.quality
  // README counts for 40%; docs dir, examples, CONTRIBUTING, CHANGELOG, install section and screenshots share the other 60%.
  const docVal = q.readme == null ? null : (q.readme ? 0.4 : 0) + 0.6 * (avg([b(q.docs), b(q.examples), b(q.contributing), b(q.changelog), b(q.installInstructions), b(q.screenshots)]) ?? 0)
  push('documentation', 'Documentation', docVal,
    [q.readme ? 'README' : 'no README', q.docs ? 'docs/' : 'no docs dir', q.examples ? 'examples' : 'no examples'])

  // License.
  const licMap: Record<LicenseStatus, number | null> = { Permissive: 1, Copyleft: 0.8, 'Other Restrictions': 0.3, Unknown: 0.4, 'No Explicit License': 0 }
  push('license', 'License', p.meta.unavailable.includes('license') ? null : licMap[ctx.licenseStatus], [ctx.licenseStatus])

  // Modernization potential: room to modernize on a viable stack.
  const months = monthsBetween(lastActivity(p), ref)
  const asleep = months == null ? null : months < 12 ? 0.2 : months < 24 ? 0.6 : months < 120 ? 1 : 0.7
  push('modernization', 'Modernization potential', avg([
    asleep,
    ctx.legacyTech.length ? 1 : 0.5,
    p.language == null ? null : MAINSTREAM_LANGS.has(p.language) ? 1 : 0.6,
  ]), [months == null ? 'activity n/a' : `${Math.round(months)} months since last commit`, ctx.legacyTech.length ? `legacy: ${ctx.legacyTech.join(', ')}` : 'no legacy marker'])

  // Existing functional base.
  const spanMonths = p.pushedAt ? (Date.parse(p.pushedAt) - Date.parse(p.createdAt)) / (30.4375 * 86400000) : null
  push('base', 'Functional base', avg([
    p.meta.unavailable.includes('latestRelease') ? null : p.latestRelease ? 1 : 0.2,
    p.commitsTotal == null ? null : logScale(p.commitsTotal, 10, 2000),
    spanMonths == null ? null : clamp(spanMonths / 24),
  ]), [p.latestRelease ? `release ${p.latestRelease.tag}` : 'no release', p.commitsTotal == null ? 'commits n/a' : `${p.commitsTotal} commits`])

  // Past maintenance hygiene (tests, CI, more than one contributor).
  push('maintenance', 'Maintenance signals', avg([
    b(q.tests),
    b(q.ci),
    p.contributors == null ? null : p.contributors >= 3 ? 1 : p.contributors === 2 ? 0.5 : 0,
  ]), [q.tests ? 'tests' : 'no root tests', q.ci ? `CI (${q.ciProviders.join(', ')})` : 'no CI config'])

  const avail = comps.filter((c) => c.value != null)
  const coverage = avail.reduce((s, c) => s + c.weight, 0)
  const raw = coverage ? avail.reduce((s, c) => s + c.weight * (c.value as number), 0) / coverage : 0
  return { score: Math.round(raw * 100), components: comps, coverage: Math.round(coverage * 100) / 100 }
}
