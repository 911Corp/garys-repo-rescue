import { dataConfidence } from './confidence'
import { detectLegacy } from './detect'
import { revivalDifficulty } from './difficulty'
import { licenseStatus } from './license'
import { maintenanceStatus } from './maintenance'
import { rescueScore } from './scoring'
import { COLLECTIONS, FAMILIES, type ClassifyCtx } from './taxonomy'
import type { Assessment, Project, ProjectFacts } from './types'

export function assess(p: ProjectFacts, ref: Date, baseline: string): Assessment {
  const legacyTech = detectLegacy({
    langs: (p.languages ?? []).map((l) => l.name).concat(p.language ? [p.language] : []),
    primary: p.language,
    topics: p.topics,
    manifests: p.quality.manifests,
    ci: p.quality.ciProviders,
    description: p.description ?? '',
  })
  const m = maintenanceStatus(p, ref)
  const lic = licenseStatus(p.license, p.quality.licenseFile)
  const diff = revivalDifficulty(p, ref, legacyTech)
  const rescue = rescueScore(p, ref, { licenseStatus: lic.status, maintenance: m.status, legacyTech })
  const confidence = dataConfidence(p, ref)

  const ctx: ClassifyCtx = { ref, maintenance: m.status, licenseStatus: lic.status, rescueScore: rescue.score, legacyTech, difficulty: diff.level, baseline }
  const families = FAMILIES.filter((f) => f.test(p, ctx)).map((f) => f.id)
  const collections = COLLECTIONS.filter((c) => c.test(p, ctx)).map((c) => c.id)

  const strengths: string[] = []
  const cautions: string[] = []
  const q = p.quality
  if (p.stars >= 1000) strengths.push(`Strong adoption: ${p.stars.toLocaleString('en-US')} stars`)
  if (p.contributors != null && p.contributors >= 10) strengths.push(`${p.contributors} contributors over its life`)
  if (q.readme) strengths.push('README present')
  if (q.docs) strengths.push('Dedicated docs folder')
  if (q.installInstructions) strengths.push('README has install / getting-started instructions')
  if (q.screenshots) strengths.push('README shows screenshots or GIFs')
  if (q.examples) strengths.push('Examples or demo folder')
  if (q.tests) strengths.push('Tests detected at root level')
  if (q.ci) strengths.push(`CI configured (${q.ciProviders.join(', ')})`)
  if (p.latestRelease) strengths.push(`Has releases (latest: ${p.latestRelease.tag})`)
  if (lic.status === 'Permissive') strengths.push(`Permissive license (${p.license.spdx})`)
  if (p.homepage) strengths.push('Has a homepage or demo link')

  if (lic.status === 'No Explicit License') cautions.push('No license: you cannot legally reuse this code without the author\'s permission.')
  if (lic.status === 'Unknown') cautions.push('License not identified automatically. Read the license file yourself.')
  if (lic.status === 'Copyleft') cautions.push(`Copyleft (${p.license.spdx}): derivatives must keep a compatible license.`)
  if (lic.status === 'Other Restrictions') cautions.push(`Restricted license (${p.license.spdx}): check commercial-use terms.`)
  if (p.forkIntel.possibleSuccessor) cautions.push(`A fork looks active (${p.forkIntel.possibleSuccessor}). Consider contributing there before starting a new fork.`)
  for (const h of p.forkIntel.successorHints) cautions.push(`The README points to ${h.repo} as a new home or successor. Check it first.`)
  if (!p.forkIntel.checked) cautions.push('Forks were not inspected in this catalog build: check the fork network for an active successor before forking.')
  if (q.deprecatedNotice) cautions.push('The README itself says the project is deprecated or unmaintained.')
  if (m.status === 'Active') cautions.push('Still active: contribute upstream rather than forking.')
  if (q.readme === false) cautions.push('No README detected.')
  if (q.tests === false && (p.sizeKb ?? 0) > 512) cautions.push('No root-level tests detected: behaviour must be verified manually.')
  if (legacyTech.length) cautions.push(`Legacy stack to migrate: ${legacyTech.join(', ')}.`)
  if (m.months != null && m.months > 60) cautions.push('Dependencies are very likely outdated: audit them before running anything.')
  if (p.openIssues != null && p.openIssues > 100) cautions.push(`${p.openIssues} open issues to triage.`)
  if (p.meta.depth === 'indexed') cautions.push('Only indexed from search metadata: tests, CI, releases and forks were not inspected yet.')

  const famLabels = FAMILIES.filter((f) => families.includes(f.id)).map((f) => f.label)
  const reasons = [
    ...famLabels.map((l) => `Matches the "${l}" family rules`),
    `Found by ${p.meta.strategies.length} discovery strateg${p.meta.strategies.length > 1 ? 'ies' : 'y'}: ${p.meta.strategies.slice(0, 3).join(', ')}${p.meta.strategies.length > 3 ? '…' : ''}`,
  ]

  return {
    maintenance: m.status,
    maintenanceReason: m.reason,
    monthsSinceActivity: m.months == null ? null : Math.round(m.months * 10) / 10,
    licenseStatus: lic.status,
    licenseNote: lic.note,
    difficulty: diff.level,
    difficultyReasons: diff.reasons,
    rescue,
    confidence,
    families,
    collections,
    reasons,
    strengths,
    cautions,
    legacyTech,
  }
}

export function toProject(p: ProjectFacts, ref: Date, baseline: string): Project {
  return { ...p, a: assess(p, ref, baseline) }
}
