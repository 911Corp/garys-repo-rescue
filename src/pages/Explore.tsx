import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../app/data'
import { go, href, type Route } from '../app/router'
import { applyFilters, DEFAULT_FILTERS, filtersToQuery, queryToFilters, sortProjects, SORTS, textSearch, type Filters } from '../app/search'
import { copyText, download } from '../app/store'
import { EMPTY, pick } from '../app/voice'
import { selectionMarkdown, toCSV, toJSON } from '../core/exporters'
import { COLLECTIONS, FAMILIES } from '../core/taxonomy'
import type { Project } from '../core/types'
import { Jarvis, ProjectCard } from '../ui/bits'

const MAINT = ['Active', 'Low Activity', 'Dormant', 'Stable', 'Archived', 'Unknown']
const LIC = ['Permissive', 'Copyleft', 'Other Restrictions', 'No Explicit License', 'Unknown']
const DIFF = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Unknown']
const CONF = ['High', 'Medium', 'Low']
const PAGE = 30

export function useFilteredProjects(f: Filters) {
  const { projects, index, byId } = useCatalog()
  return useMemo(() => {
    const now = new Date()
    if (f.q.trim()) {
      const hits = textSearch(index, byId, f.q)
      const scores = new Map(hits.map((h) => [h.project.id, h.score]))
      const filtered = applyFilters(hits.map((h) => h.project), f, now)
      return { list: sortProjects(filtered, f.sort, scores), matched: new Map(hits.map((h) => [h.project.id, h.matched])) }
    }
    const filtered = applyFilters(projects, f, now)
    return { list: sortProjects(filtered, f.sort === 'relevance' ? 'rescue' : f.sort), matched: new Map<string, string[]>() }
  }, [projects, index, byId, f])
}

export function Explore({ route }: { route: Route }) {
  const { languages, meta } = useCatalog()
  const f = useMemo(() => queryToFilters(route.query), [route.query])
  const [draftQ, setDraftQ] = useState(f.q)
  const [shown, setShown] = useState(PAGE)
  const [panel, setPanel] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { setDraftQ(f.q); setShown(PAGE) }, [f.q, route.query])

  const set = (patch: Partial<Filters>) => go('explore', filtersToQuery({ ...f, ...patch }), true)
  const toggle = (key: 'lang' | 'family' | 'license' | 'maint' | 'diff' | 'conf', v: string) => {
    const cur = f[key]
    set({ [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as Partial<Filters>)
  }
  const { list } = useFilteredProjects(f)
  const activeCount = Object.entries(f).filter(([k, v]) => k !== 'q' && k !== 'sort' && (Array.isArray(v) ? v.length : v !== (DEFAULT_FILTERS as unknown as Record<string, unknown>)[k])).length

  const exportName = `repo-rescue-${new Date().toISOString().slice(0, 10)}`
  const exportList: Project[] = list.slice(0, 500)

  return (
    <div className="explore">
      <form className="prompt prompt-sm" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: draftQ.trim(), sort: draftQ.trim() ? 'relevance' : f.sort }) }}>
        <label htmlFor="ex-q" className="prompt-sign">$ rescue</label>
        <input id="ex-q" value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder="Search names, descriptions, topics…" autoComplete="off" />
        <button className="btn" type="submit">Search</button>
      </form>

      <div className="explore-bar">
        <button type="button" className="btn-ghost only-mobile" onClick={() => setPanel(true)} aria-expanded={panel} aria-controls="filters">
          Filters{activeCount ? ` (${activeCount})` : ''}
        </button>
        <p className="result-count" aria-live="polite">{list.length.toLocaleString('en-US')} of {meta.counts.total.toLocaleString('en-US')} projects</p>
        <label className="sort">
          <span>Sort</span>
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value as Filters['sort'] })}>
            {SORTS.filter((s) => s.id !== 'relevance' || f.q).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="explore-body">
        <aside id="filters" className={`filters ${panel ? 'open' : ''}`} aria-label="Filters">
          <div className="filters-head only-mobile">
            <strong>Filters</strong>
            <button type="button" className="btn" onClick={() => setPanel(false)}>Show {list.length} results</button>
          </div>
          {activeCount > 0 && <button type="button" className="btn-ghost reset" onClick={() => go('explore', f.q ? `q=${encodeURIComponent(f.q)}` : '', true)}>Clear all filters</button>}

          <Group title="Maintenance">{MAINT.map((m) => <Check key={m} label={m} on={f.maint.includes(m)} onChange={() => toggle('maint', m)} />)}</Group>
          <Group title="License">{LIC.map((m) => <Check key={m} label={m} on={f.license.includes(m)} onChange={() => toggle('license', m)} />)}</Group>
          <Group title="Family">{FAMILIES.map((x) => <Check key={x.id} label={x.label} on={f.family.includes(x.id)} onChange={() => toggle('family', x.id)} />)}</Group>
          <Group title="Collection">
            <select value={f.collection} onChange={(e) => set({ collection: e.target.value })} aria-label="Collection">
              <option value="">Any collection</option>
              {COLLECTIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </Group>
          <Group title="Language">
            <div className="lang-list">
              {languages.slice(0, 24).map((l) => <Check key={l.name} label={`${l.name}`} count={l.n} on={f.lang.includes(l.name)} onChange={() => toggle('lang', l.name)} />)}
            </div>
          </Group>
          <Group title="Revival difficulty">{DIFF.map((m) => <Check key={m} label={m} on={f.diff.includes(m)} onChange={() => toggle('diff', m)} />)}</Group>
          <Group title="Popularity">
            <div className="row2">
              <label>Min stars<input type="number" min={0} value={f.minStars || ''} onChange={(e) => set({ minStars: Number(e.target.value) || 0 })} /></label>
              <label>Max stars<input type="number" min={0} value={f.maxStars || ''} onChange={(e) => set({ maxStars: Number(e.target.value) || 0 })} /></label>
            </div>
          </Group>
          <Group title="Age and inactivity">
            <label>Asleep for at least
              <select value={f.inactiveYears} onChange={(e) => set({ inactiveYears: Number(e.target.value) })}>
                <option value={0}>any time</option>{[1, 2, 3, 5, 8, 10].map((y) => <option key={y} value={y}>{y} year{y > 1 ? 's' : ''}</option>)}
              </select>
            </label>
            <label>Created before
              <select value={f.createdBefore} onChange={(e) => set({ createdBefore: Number(e.target.value) })}>
                <option value={0}>any year</option>{[2012, 2014, 2016, 2018, 2020, 2022].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label>Archived
              <select value={f.archived} onChange={(e) => set({ archived: e.target.value as Filters['archived'] })}>
                <option value="">either</option><option value="yes">archived only</option><option value="no">not archived</option>
              </select>
            </label>
          </Group>
          <Group title="Has">
            <Check label="Docs or install guide" on={f.docs} onChange={() => set({ docs: !f.docs })} />
            <Check label="Homepage or demo link" on={f.demo} onChange={() => set({ demo: !f.demo })} />
            <Check label="A release" on={f.release} onChange={() => set({ release: !f.release })} />
          </Group>
          <Group title="Rescue Score">
            <label>At least <strong>{f.minRescue}</strong>
              <input type="range" min={0} max={90} step={5} value={f.minRescue} onChange={(e) => set({ minRescue: Number(e.target.value) })} />
            </label>
          </Group>
          <Group title="Data">
            {CONF.map((m) => <Check key={m} label={`${m} confidence`} on={f.conf.includes(m)} onChange={() => toggle('conf', m)} />)}
            <label>Analysis depth
              <select value={f.depth} onChange={(e) => set({ depth: e.target.value as Filters['depth'] })}>
                <option value="">all</option><option value="analyzed">analyzed in depth</option><option value="indexed">indexed only</option>
              </select>
            </label>
          </Group>
        </aside>

        <section className="results" aria-label="Results">
          {list.length === 0 ? (
            <div className="empty">
              
              <p>{pick(EMPTY, route.query)}</p>
              <p className="muted">Try removing a filter or a word. Search also understands plain descriptions like “offline note app in rust”.</p>
            </div>
          ) : (
            <>
              <div className="grid">{list.slice(0, shown).map((p) => <ProjectCard key={p.id} p={p} />)}</div>
              {shown < list.length && <button type="button" className="btn more" onClick={() => setShown((s) => s + PAGE)}>Show {Math.min(PAGE, list.length - shown)} more</button>}
              <div className="export-row">
                <span className="muted">This selection ({Math.min(list.length, 500)}{list.length > 500 ? ' first' : ''} results):</span>
                <button type="button" className="btn-ghost" onClick={() => download(`${exportName}.csv`, toCSV(exportList), 'text/csv')}>Export CSV</button>
                <button type="button" className="btn-ghost" onClick={() => download(`${exportName}.json`, toJSON(exportList), 'application/json')}>Export JSON</button>
                <button type="button" className="btn-ghost" onClick={() => download(`${exportName}.md`, selectionMarkdown('Repo Rescue selection', exportList), 'text/markdown')}>Export Markdown</button>
                <button type="button" className="btn-ghost" onClick={async () => { setCopied(await copyText(window.location.href)) ; setTimeout(() => setCopied(false), 2000) }}>{copied ? 'Link copied' : 'Copy link to this selection'}</button>
              </div>
              <Jarvis>scores are heuristics from public metadata. <a href={href('method')}>how they are computed</a>.</Jarvis>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="fgroup">
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function Check({ label, on, onChange, count }: { label: string; on: boolean; onChange: () => void; count?: number }) {
  return (
    <label className="check">
      <input type="checkbox" checked={on} onChange={onChange} />
      <span>{label}</span>
      {count != null && <span className="muted n">{count}</span>}
    </label>
  )
}
