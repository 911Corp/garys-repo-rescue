import type { Project } from './types'

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'for', 'of', 'to', 'in', 'on', 'with', 'your', 'you', 'is', 'it', 'this', 'that', 'by', 'from', 'as', 'at', 'be', 'are', 'simple', 'based', 'written', 'using', 'app', 'tool', 'library', 'open', 'source', 'project'])

export function tokens(p: Project): Set<string> {
  const words = `${p.description ?? ''} ${p.name.replace(/[-_.]/g, ' ')}`.toLowerCase().match(/[a-z0-9+#]{3,}/g) ?? []
  const s = new Set<string>()
  for (const t of p.topics) s.add(`t:${t}`)
  for (const w of words) if (!STOP.has(w)) s.add(`w:${w}`)
  if (p.language) s.add(`l:${p.language}`)
  for (const c of p.a.collections) s.add(`c:${c}`)
  return s
}

/** Weighted Jaccard-like similarity on topics, words, language and collections. Deterministic. */
export function similarity(a: Set<string>, b: Set<string>): number {
  let inter = 0
  let union = 0
  const w = (k: string) => (k.startsWith('t:') ? 3 : k.startsWith('w:') ? 1.5 : k.startsWith('c:') ? 1 : 0.5)
  for (const k of new Set([...a, ...b])) {
    const wk = w(k)
    union += wk
    if (a.has(k) && b.has(k)) inter += wk
  }
  return union ? inter / union : 0
}

export function similarProjects(target: Project, all: Project[], n = 6): { p: Project; score: number }[] {
  const tt = tokens(target)
  return all
    .filter((p) => p.id !== target.id)
    .map((p) => ({ p, score: similarity(tt, tokens(p)) }))
    .filter((x) => x.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}
