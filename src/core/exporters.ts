import type { Project } from './types'

export interface ExportRow {
  repo: string
  url: string
  description: string
  language: string
  stars: number
  forks: number
  license: string
  license_status: string
  maintenance: string
  rescue_score: number
  difficulty: string
  confidence: string
  last_push: string
  archived: boolean
  families: string
}

export function toRow(p: Project): ExportRow {
  return {
    repo: p.fullName,
    url: p.url,
    description: p.description ?? '',
    language: p.language ?? '',
    stars: p.stars,
    forks: p.forks,
    license: p.license.spdx ?? '',
    license_status: p.a.licenseStatus,
    maintenance: p.a.maintenance,
    rescue_score: p.a.rescue.score,
    difficulty: p.a.difficulty,
    confidence: p.a.confidence.level,
    last_push: p.pushedAt?.slice(0, 10) ?? '',
    archived: p.archived,
    families: p.a.families.join('|'),
  }
}

export function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCSV(projects: Project[]): string {
  const rows = projects.map(toRow)
  const head = Object.keys(rows[0] ?? toRow(projects[0] ?? ({} as Project))) as (keyof ExportRow)[]
  if (!rows.length) return ''
  return [head.join(','), ...rows.map((r) => head.map((h) => csvEscape(r[h])).join(','))].join('\n')
}

export function toJSON(projects: Project[]): string {
  return JSON.stringify(projects.map(toRow), null, 2)
}

export function selectionMarkdown(title: string, projects: Project[]): string {
  const L = [`# ${title}`, '', `_${projects.length} project(s) from Gary's Repo Rescue. Scores are heuristics from public metadata, verify before reuse._`, '']
  L.push('| Repo | Status | License | Rescue | Difficulty | Stars |', '|---|---|---|---|---|---|')
  for (const p of projects) L.push(`| [${p.fullName}](${p.url}) | ${p.a.maintenance} | ${p.license.spdx ?? p.a.licenseStatus} | ${p.a.rescue.score} | ${p.a.difficulty} | ${p.stars} |`)
  L.push('')
  for (const p of projects) L.push(`- **${p.fullName}**: ${p.description ?? 'no description'}`)
  return L.join('\n')
}

/** Free Stack bridge: a minimal, documented JSON handoff (see docs/ARCHITECTURE.md#free-stack-bridge). */
export function freeStackHandoff(p: Project) {
  return {
    schema: 'garys-adventures/handoff@1',
    from: 'repo-rescue',
    project: { repo: p.fullName, url: p.url, license: p.license.spdx, licenseStatus: p.a.licenseStatus },
    stack: { primaryLanguage: p.language, languages: p.languages?.map((l) => l.name) ?? [], manifests: p.quality.manifests, legacy: p.a.legacyTech, topics: p.topics },
    needs: [
      ...(p.quality.ci === false ? ['ci'] : []),
      ...(p.quality.tests === false ? ['testing'] : []),
      ...(p.homepage ? [] : ['hosting']),
      ...(p.quality.dockerfile ? ['container-hosting'] : []),
    ],
  }
}
