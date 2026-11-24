/**
 * Validates public/data/catalog.json: schema, invariants, and "no invented data" rules.
 * Exit code 1 on any error. Run in CI before publishing a refreshed catalog.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CatalogSchema } from '../src/core/schema'
import type { Catalog } from '../src/core/types'

const file = process.argv[2] ?? join(process.cwd(), 'public', 'data', 'catalog.json')
const raw = JSON.parse(readFileSync(file, 'utf8')) as Catalog
const errors: string[] = []

const parsed = CatalogSchema.safeParse(raw)
if (!parsed.success) for (const i of parsed.error.issues.slice(0, 30)) errors.push(`schema: ${i.path.join('.')}: ${i.message}`)

const ids = new Set<string>()
const NULLABLE_IF_UNAVAILABLE: (keyof Catalog['projects'][number])[] = ['lastCommitAt', 'commitsTotal', 'commits12m', 'contributors', 'openPrs', 'openIssues', 'languages', 'latestRelease']
for (const p of raw.projects) {
  if (ids.has(p.id)) errors.push(`duplicate id ${p.id}`)
  ids.add(p.id)
  // A field declared unavailable must not carry a value (prevents silently invented data).
  for (const k of NULLABLE_IF_UNAVAILABLE) if (p.meta.unavailable.includes(k as string) && p[k] != null) errors.push(`${p.fullName}: ${String(k)} is marked unavailable but has a value`)
  if (p.meta.depth === 'indexed' && p.quality.readme != null) errors.push(`${p.fullName}: indexed project must not carry quality signals`)
  if (p.a.licenseStatus === 'No Explicit License' && p.a.families.includes('fork-opportunity')) errors.push(`${p.fullName}: unlicensed project flagged as fork opportunity`)
  if (p.archived && p.a.maintenance !== 'Archived') errors.push(`${p.fullName}: archived but status ${p.a.maintenance}`)
  if (p.disabled) errors.push(`${p.fullName}: disabled repository in catalog`)
}
const c = raw.meta.counts
if (c.total !== raw.projects.length) errors.push(`meta.counts.total ${c.total} != ${raw.projects.length}`)

const by = (k: (p: Catalog['projects'][number]) => string) => raw.projects.reduce<Record<string, number>>((m, p) => ((m[k(p)] = (m[k(p)] ?? 0) + 1), m), {})
console.log(`Catalog: ${raw.projects.length} projects (${c.analyzed} analyzed, ${c.indexed} indexed), built ${raw.meta.generatedAt}`)
console.log('Maintenance:', by((p) => p.a.maintenance))
console.log('License:', by((p) => p.a.licenseStatus))
console.log('Difficulty:', by((p) => p.a.difficulty))
console.log('Confidence:', by((p) => p.a.confidence.level))
const fam: Record<string, number> = {}
const col: Record<string, number> = {}
for (const p of raw.projects) {
  for (const f of p.a.families) fam[f] = (fam[f] ?? 0) + 1
  for (const f of p.a.collections) col[f] = (col[f] ?? 0) + 1
}
console.log('Families:', fam)
console.log('Collections:', col)

if (errors.length) {
  console.error(`\n${errors.length} error(s):\n- ${errors.slice(0, 50).join('\n- ')}`)
  process.exit(1)
}
console.log('\nOK: catalog is valid.')
