import MiniSearch, { type SearchResult } from 'minisearch'
import type { Project } from '../core/types'

export interface Filters {
  q: string
  lang: string[]
  family: string[]
  collection: string
  license: string[]
  maint: string[]
  diff: string[]
  conf: string[]
  minStars: number
  maxStars: number
  inactiveYears: number // minimum years since last activity
  createdBefore: number // year, 0 = any
  archived: '' | 'yes' | 'no'
  docs: boolean
  demo: boolean
  release: boolean
  minRescue: number
  depth: '' | 'analyzed' | 'indexed'
  sort: SortKey
}

export type SortKey = 'relevance' | 'rescue' | 'stars' | 'stars-asc' | 'dormant' | 'recent' | 'oldest' | 'forks' | 'confidence' | 'easiest'

export const DEFAULT_FILTERS: Filters = {
  q: '', lang: [], family: [], collection: '', license: [], maint: [], diff: [], conf: [], minStars: 0, maxStars: 0,
  inactiveYears: 0, createdBefore: 0, archived: '', docs: false, demo: false, release: false, minRescue: 0, depth: '', sort: 'relevance',
}

export const SORTS: { id: SortKey; label: string }[] = [
  { id: 'relevance', label: 'Best match' },
  { id: 'rescue', label: 'Rescue Score' },
  { id: 'stars', label: 'Most stars' },
  { id: 'stars-asc', label: 'Least known' },
  { id: 'dormant', label: 'Longest asleep' },
  { id: 'recent', label: 'Recently active' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'forks', label: 'Most forks' },
  { id: 'easiest', label: 'Easiest revival' },
  { id: 'confidence', label: 'Data confidence' },
]

/** Synonyms used by the search box and the Project Finder (no paid AI involved). */
export const SYNONYMS: Record<string, string[]> = {
  bookmark: ['bookmarks', 'link', 'links', 'read later', 'pocket', 'favorites'],
  note: ['notes', 'note taking', 'notebook', 'wiki', 'journal', 'markdown', 'knowledge base'],
  inventory: ['stock', 'warehouse', 'asset', 'assets', 'items', 'tracking'],
  crypto: ['blockchain', 'bitcoin', 'ethereum', 'wallet', 'web3', 'defi', 'token', 'cryptocurrency'],
  dashboard: ['monitoring', 'metrics', 'admin', 'panel', 'charts', 'visualization'],
  image: ['photo', 'picture', 'paint', 'drawing', 'pixel', 'graphics', 'canvas'],
  editor: ['editing', 'edit', 'ide'],
  game: ['games', 'gaming', 'roguelike', 'arcade', 'puzzle', 'rpg', 'engine'],
  terminal: ['cli', 'tui', 'console', 'command line', 'shell', 'ascii'],
  retro: ['vintage', 'emulator', '8bit', 'old school', 'dos', 'pixel'],
  music: ['audio', 'synth', 'synthesizer', 'sound', 'midi', 'player'],
  chat: ['messenger', 'messaging', 'irc', 'xmpp', 'matrix', 'chatbot'],
  blog: ['cms', 'static site', 'publishing', 'website'],
  todo: ['task', 'tasks', 'kanban', 'productivity', 'checklist'],
  finance: ['budget', 'money', 'expenses', 'accounting', 'invoice'],
  selfhosted: ['self hosted', 'self-hosted', 'homelab', 'server', 'docker'],
  localfirst: ['local first', 'offline', 'crdt', 'sync', 'p2p'],
  scraper: ['scraping', 'crawler', 'spider', 'extract'],
  bot: ['chatbot', 'automation', 'telegram', 'discord', 'slack'],
  file: ['files', 'storage', 'sharing', 'upload', 'drive'],
  map: ['maps', 'gis', 'geo', 'location', 'osm'],
  rss: ['feed', 'feeds', 'reader', 'news', 'aggregator'],
  lightweight: ['minimal', 'tiny', 'small', 'simple', 'lightweight'],
}

const LANG_WORDS: Record<string, string> = {
  python: 'Python', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript', ts: 'TypeScript', rust: 'Rust', go: 'Go', golang: 'Go',
  java: 'Java', kotlin: 'Kotlin', ruby: 'Ruby', php: 'PHP', swift: 'Swift', c: 'C', 'c++': 'C++', cpp: 'C++', 'c#': 'C#', csharp: 'C#',
  elixir: 'Elixir', haskell: 'Haskell', lua: 'Lua', dart: 'Dart', flutter: 'Dart', shell: 'Shell', bash: 'Shell', scala: 'Scala', clojure: 'Clojure', perl: 'Perl',
}

export function buildIndex(projects: Project[]) {
  const ms = new MiniSearch<Project>({
    idField: 'id',
    fields: ['name', 'fullName', 'description', 'topicsText', 'language', 'collectionsText'],
    storeFields: [],
    extractField: (doc, field) => {
      if (field === 'topicsText') return doc.topics.join(' ').replace(/-/g, ' ')
      if (field === 'collectionsText') return doc.a.collections.join(' ').replace(/-/g, ' ')
      if (field === 'name') return doc.name.replace(/[-_.]/g, ' ')
      return (doc as unknown as Record<string, string>)[field] ?? ''
    },
    searchOptions: { boost: { name: 3, topicsText: 2, description: 1.5, fullName: 1 }, prefix: (t) => t.length > 3, fuzzy: (t) => (t.length > 5 ? 0.15 : false), combineWith: 'OR' },
  })
  ms.addAll(projects)
  return ms
}

export function expandQuery(q: string): { text: string; langs: string[]; terms: string[] } {
  const words = q.toLowerCase().replace(/[^a-z0-9+#\s-]/g, ' ').split(/\s+/).filter(Boolean)
  const langs: string[] = []
  const terms = new Set<string>()
  for (const w of words) {
    if (LANG_WORDS[w]) langs.push(LANG_WORDS[w])
    if (['a', 'an', 'the', 'app', 'application', 'tool', 'for', 'with', 'and', 'my', 'some', 'open', 'source', 'open-source', 'that', 'i', 'want', 'to', 'build', 'like'].includes(w)) continue
    terms.add(w)
    const key = w.replace(/s$/, '').replace(/-/g, '')
    for (const [k, syn] of Object.entries(SYNONYMS)) if (k === key || syn.includes(w)) { terms.add(k); syn.forEach((s) => terms.add(s)) }
  }
  return { text: [...terms].join(' '), langs, terms: [...terms] }
}

export function applyFilters(projects: Project[], f: Filters, ref: Date): Project[] {
  const now = ref.getTime()
  return projects.filter((p) => {
    const a = p.a
    if (f.lang.length && !f.lang.includes(p.language ?? '—')) return false
    if (f.family.length && !f.family.some((x) => a.families.includes(x as never))) return false
    if (f.collection && !a.collections.includes(f.collection)) return false
    if (f.license.length && !f.license.includes(a.licenseStatus)) return false
    if (f.maint.length && !f.maint.includes(a.maintenance)) return false
    if (f.diff.length && !f.diff.includes(a.difficulty)) return false
    if (f.conf.length && !f.conf.includes(a.confidence.level)) return false
    if (f.minStars && p.stars < f.minStars) return false
    if (f.maxStars && p.stars > f.maxStars) return false
    if (f.inactiveYears) {
      const last = Date.parse(p.lastCommitAt ?? p.pushedAt ?? p.createdAt)
      if ((now - last) / (365.25 * 86400000) < f.inactiveYears) return false
    }
    if (f.createdBefore && new Date(p.createdAt).getUTCFullYear() >= f.createdBefore) return false
    if (f.archived === 'yes' && !p.archived) return false
    if (f.archived === 'no' && p.archived) return false
    if (f.docs && !(p.quality.docs || p.quality.installInstructions)) return false
    if (f.demo && !p.homepage) return false
    if (f.release && !p.latestRelease) return false
    if (f.minRescue && a.rescue.score < f.minRescue) return false
    if (f.depth && p.meta.depth !== f.depth) return false
    return true
  })
}

const diffRank: Record<string, number> = { Beginner: 0, Intermediate: 1, Advanced: 2, Expert: 3, Unknown: 4 }
const lastTs = (p: Project) => Date.parse(p.lastCommitAt ?? p.pushedAt ?? p.createdAt)

export function sortProjects(list: Project[], sort: SortKey, scores?: Map<string, number>): Project[] {
  const arr = [...list]
  const by: Record<SortKey, (a: Project, b: Project) => number> = {
    relevance: (a, b) => (scores ? (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) : 0) || b.a.rescue.score - a.a.rescue.score,
    rescue: (a, b) => b.a.rescue.score - a.a.rescue.score,
    stars: (a, b) => b.stars - a.stars,
    'stars-asc': (a, b) => a.stars - b.stars,
    dormant: (a, b) => lastTs(a) - lastTs(b),
    recent: (a, b) => lastTs(b) - lastTs(a),
    oldest: (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
    forks: (a, b) => b.forks - a.forks,
    confidence: (a, b) => b.a.confidence.score - a.a.confidence.score,
    easiest: (a, b) => diffRank[a.a.difficulty] - diffRank[b.a.difficulty] || b.a.rescue.score - a.a.rescue.score,
  }
  return arr.sort(by[sort])
}

export interface SearchHit { project: Project; score: number; matched: string[] }

/** Free-text search with synonym expansion. Returns relevance scores keyed by id. */
export function textSearch(ms: MiniSearch<Project>, byId: Map<string, Project>, q: string): SearchHit[] {
  const { text, langs } = expandQuery(q)
  if (!text.trim() && !langs.length) return []
  const res: SearchResult[] = text.trim() ? ms.search(text) : []
  const hits: SearchHit[] = []
  for (const r of res) {
    const p = byId.get(r.id as string)
    if (!p) continue
    let score = r.score
    if (langs.length) score *= langs.includes(p.language ?? '') ? 1.8 : 0.6
    score *= 0.85 + p.a.rescue.score / 400
    hits.push({ project: p, score, matched: r.terms })
  }
  if (!res.length && langs.length) for (const p of byId.values()) if (langs.includes(p.language ?? '')) hits.push({ project: p, score: p.a.rescue.score / 100, matched: [p.language!.toLowerCase()] })
  return hits.sort((a, b) => b.score - a.score)
}

// URL <-> filters (shareable selections).
export function filtersToQuery(f: Filters): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(f) as [keyof Filters, unknown][]) {
    const d = DEFAULT_FILTERS[k]
    if (Array.isArray(v)) { if (v.length) sp.set(k, v.join(',')) }
    else if (v !== d) sp.set(k, String(v))
  }
  return sp.toString()
}

export function queryToFilters(qs: string): Filters {
  const sp = new URLSearchParams(qs)
  const f: Filters = { ...DEFAULT_FILTERS, lang: [], family: [], license: [], maint: [], diff: [], conf: [] }
  for (const [k, raw] of sp) {
    const key = k as keyof Filters
    if (!(key in DEFAULT_FILTERS)) continue
    const d = DEFAULT_FILTERS[key]
    const target = f as unknown as Record<string, unknown>
    if (Array.isArray(d)) target[key] = raw.split(',').filter(Boolean)
    else if (typeof d === 'number') target[key] = Number(raw) || 0
    else if (typeof d === 'boolean') target[key] = raw === 'true'
    else target[key] = raw
  }
  return f
}
