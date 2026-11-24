/**
 * Gary's Repo Rescue collection pipeline.
 *
 *   collect (search) → normalize → filter → select → enrich (deep analysis) → assess → catalog
 *
 * Usage:
 *   GITHUB_TOKEN=... npm run collect
 *   ANALYZE_LIMIT=1100 INDEX_LIMIT=600 PER_STRATEGY=12 npm run collect
 *   CACHE_HOURS=24 npm run collect     # reuse HTTP cache younger than 24h without any request
 *
 * Never downloads or executes repository code: only metadata endpoints and directory listings are read.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { toProject } from '../src/core/assess'
import { exclusionReason, fromSearch, preRank, type GhRepo } from '../src/core/normalize'
import type { Catalog, CatalogMeta, Project, ProjectFacts } from '../src/core/types'
import { gh, pool, stats } from './lib/github'
import { buildStrategies } from './strategies'
import { enrichWithEcosystems } from './providers/ecosystems'
import { enrichWithGithub } from './providers/github'

const ANALYZE_LIMIT = Number(process.env.ANALYZE_LIMIT ?? 1100)
const INDEX_LIMIT = Number(process.env.INDEX_LIMIT ?? 600)
const PER_STRATEGY = Number(process.env.PER_STRATEGY ?? 12)
const CACHE_HOURS = Number(process.env.CACHE_HOURS ?? 0)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8)
const OUT = join(process.cwd(), 'public', 'data', 'catalog.json')

const now = new Date()
const nowIso = now.toISOString()
const log = (...a: unknown[]) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a)

interface SearchPage { total_count: number; incomplete_results: boolean; items: GhRepo[] }

async function main() {
  const previous: Catalog | null = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
  const firstSeen = new Map(previous?.projects.map((p) => [p.id, p.meta.firstSeenAt]) ?? [])
  const baseline = previous?.meta.baseline ?? nowIso

  // 1. Search
  const strategies = buildStrategies(now).slice(0, Number(process.env.STRATEGY_LIMIT ?? 1e9))
  log(`Running ${strategies.length} discovery strategies…`)
  const candidates = new Map<string, { repo: GhRepo; strategies: Set<string> }>()
  const perStrategy = new Map<string, GhRepo[]>()
  const strategyStats: CatalogMeta['strategies'] = []
  for (const [i, s] of strategies.entries()) {
    const found: GhRepo[] = []
    for (let page = 1; page <= s.pages; page++) {
      const q = encodeURIComponent(`${s.query} fork:false`)
      const res = await gh<SearchPage>(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`, { search: true, maxAgeHours: CACHE_HOURS || undefined })
      if (!res.data) break
      found.push(...res.data.items)
      if (res.data.items.length < 100) break
    }
    perStrategy.set(s.id, found)
    strategyStats.push({ id: s.id, query: s.query, found: found.length })
    for (const r of found) {
      const key = r.full_name.toLowerCase()
      const c = candidates.get(key) ?? { repo: r, strategies: new Set<string>() }
      c.strategies.add(s.id)
      candidates.set(key, c)
    }
    if ((i + 1) % 20 === 0) log(`  ${i + 1}/${strategies.length} strategies, ${candidates.size} unique candidates`)
  }
  log(`Search done: ${candidates.size} unique candidates.`)

  // 2. Filter
  const excluded: Record<string, number> = {}
  const kept = new Map<string, { repo: GhRepo; strategies: Set<string> }>()
  for (const [k, c] of candidates) {
    const why = exclusionReason(c.repo)
    if (why) excluded[why] = (excluded[why] ?? 0) + 1
    else kept.set(k, c)
  }
  log(`After exclusion rules: ${kept.size} kept.`, excluded)

  // 3. Select: diversity first (round-robin over strategies, rank by rank, up to 70% of the budget),
  // then fill with the global pre-rank. This keeps small niches (hidden gems, retro…) in the catalog.
  const analyze = new Set<string>()
  const rankedPer = strategies.map((s) => (perStrategy.get(s.id) ?? []).filter((r) => kept.has(r.full_name.toLowerCase())).sort((a, b) => preRank(b) - preRank(a)))
  const diversityBudget = Math.floor(ANALYZE_LIMIT * 0.7)
  for (let rank = 0; rank < PER_STRATEGY && analyze.size < diversityBudget; rank++) {
    for (const [i, list] of rankedPer.entries()) {
      const w = strategies[i].weight ?? 1
      for (let k = rank * w; k < (rank + 1) * w && analyze.size < diversityBudget; k++) {
        const r = list[k]
        if (r) analyze.add(r.full_name.toLowerCase())
      }
    }
  }
  const byRank = [...kept.keys()].sort((a, b) => preRank(kept.get(b)!.repo) - preRank(kept.get(a)!.repo))
  for (const k of byRank) {
    if (analyze.size >= ANALYZE_LIMIT) break
    analyze.add(k)
  }
  const analyzeList = [...analyze].slice(0, ANALYZE_LIMIT)
  const indexList = byRank.filter((k) => !analyze.has(k) && kept.get(k)!.repo.stargazers_count >= 50).slice(0, INDEX_LIMIT)
  log(`Selected ${analyzeList.length} for deep analysis, ${indexList.length} for indexing only.`)

  // 4. Enrich. Provider: ENRICH_PROVIDER=github|ecosystems|auto (auto probes GitHub per-repo access first).
  const opt = { maxAgeHours: CACHE_HOURS || undefined }
  let provider = process.env.ENRICH_PROVIDER ?? 'auto'
  if (provider === 'auto') {
    const probe = analyzeList[0] ? await gh(`/repos/${kept.get(analyzeList[0])!.repo.full_name}/languages`) : { status: 0 }
    provider = probe.status === 200 ? 'github' : 'ecosystems'
    log(`Enrichment provider: ${provider} (GitHub per-repo probe returned ${probe.status})`)
  }
  const enrich = (p: ProjectFacts, r: GhRepo) => (provider === 'github' ? enrichWithGithub(p, r, opt, now) : enrichWithEcosystems(p, r, opt))
  const facts: ProjectFacts[] = []
  const deepExcluded: Record<string, number> = {}
  await pool(analyzeList, CONCURRENCY, async (k) => {
    const c = kept.get(k)!
    const base = fromSearch(c.repo, [...c.strategies], nowIso, firstSeen.get(`github:${k}`) ?? nowIso)
    const res = await enrich(base, c.repo)
    if (typeof res === 'string') deepExcluded[res] = (deepExcluded[res] ?? 0) + 1
    else facts.push(res)
  }, (d) => { if (d % 50 === 0) log(`  enriched ${d}/${analyzeList.length} (requests ${stats.requests}, 304 ${stats.notModified}, remaining ${stats.remaining})`) })
  for (const k of indexList) {
    const c = kept.get(k)!
    facts.push(fromSearch(c.repo, [...c.strategies], nowIso, firstSeen.get(`github:${k}`) ?? nowIso))
  }
  for (const [k, v] of Object.entries(deepExcluded)) excluded[`deep:${k}`] = v

  // 5. Assess + catalog
  const projects: Project[] = facts.map((f) => toProject(f, now, baseline)).sort((a, b) => b.a.rescue.score - a.a.rescue.score)
  const meta: CatalogMeta = {
    name: "Gary's Repo Rescue catalog",
    version: '0.1.0',
    generatedAt: nowIso,
    referenceDate: nowIso,
    baseline,
    counts: { total: projects.length, analyzed: projects.filter((p) => p.meta.depth === 'analyzed').length, indexed: projects.filter((p) => p.meta.depth === 'indexed').length },
    sources: [
      { id: 'github-rest-search', label: 'GitHub REST API: repository search', url: 'https://docs.github.com/en/rest/search/search', terms: 'GitHub Terms of Service and API Terms; public metadata only' },
      provider === 'github'
        ? { id: 'github-rest', label: 'GitHub REST API: repository endpoints', url: 'https://docs.github.com/en/rest/repos', terms: 'GitHub Terms of Service and API Terms; public metadata only' }
        : { id: 'ecosyste.ms', label: 'ecosyste.ms Repos & Commits APIs', url: 'https://ecosyste.ms/api', terms: 'Data licensed CC BY-SA 4.0 (attribution required, share-alike)' },
    ],
    strategies: strategyStats,
    excluded,
  }
  mkdirSync(join(process.cwd(), 'public', 'data'), { recursive: true })
  writeFileSync(OUT, JSON.stringify({ meta, projects } satisfies Catalog))
  log(`Catalog written: ${projects.length} projects (${meta.counts.analyzed} analyzed, ${meta.counts.indexed} indexed). HTTP: ${JSON.stringify(stats)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
