import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type MiniSearch from 'minisearch'
import { dataConfidence } from '../core/confidence'
import type { Catalog, CatalogMeta, Project } from '../core/types'
import { buildIndex } from './search'

export interface CatalogState {
  meta: CatalogMeta
  projects: Project[]
  byId: Map<string, Project>
  byName: Map<string, Project>
  index: MiniSearch<Project>
  languages: { name: string; n: number }[]
}

const Ctx = createContext<CatalogState | null>(null)

export function useCatalog(): CatalogState {
  const c = useContext(Ctx)
  if (!c) throw new Error('Catalog not loaded')
  return c
}

export function CatalogProvider({ children, fallback, error }: { children: ReactNode; fallback: ReactNode; error: (msg: string) => ReactNode }) {
  const [cat, setCat] = useState<Catalog | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`The catalog file could not be loaded (HTTP ${r.status}). Run "npm run collect" to build it.`)
        return r.json() as Promise<Catalog>
      })
      .then(setCat)
      .catch((e: Error) => setErr(e.message))
  }, [])

  const state = useMemo<CatalogState | null>(() => {
    if (!cat) return null
    const now = new Date()
    // Confidence decays with time: recompute freshness against today, not the build date.
    const projects = cat.projects.map((p) => ({ ...p, a: { ...p.a, confidence: dataConfidence(p, now) } }))
    const langCount = new Map<string, number>()
    for (const p of projects) if (p.language) langCount.set(p.language, (langCount.get(p.language) ?? 0) + 1)
    return {
      meta: cat.meta,
      projects,
      byId: new Map(projects.map((p) => [p.id, p])),
      byName: new Map(projects.map((p) => [p.fullName.toLowerCase(), p])),
      index: buildIndex(projects),
      languages: [...langCount].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n),
    }
  }, [cat])

  if (err) return <>{error(err)}</>
  if (!state) return <>{fallback}</>
  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}
