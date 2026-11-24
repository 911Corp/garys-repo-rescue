import { useMemo, useState } from 'react'
import { useCatalog } from '../app/data'
import { go, href, type Route } from '../app/router'
import { applyFilters, DEFAULT_FILTERS, expandQuery, filtersToQuery, queryToFilters, textSearch } from '../app/search'
import { download } from '../app/store'
import { RANDOM_INTROS, garyLine, jarvisLine, pick } from '../app/voice'
import { selectionMarkdown } from '../core/exporters'
import { COLLECTIONS, FAMILIES } from '../core/taxonomy'
import { ConfBadge, DiffBadge, Gary, Jarvis, LicenseBadge, MaintBadge, ProjectCard, Score, Strata } from '../ui/bits'

/* ---------- Collections ---------- */

export function CollectionsIndex() {
  const { projects } = useCatalog()
  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of projects) for (const id of p.a.collections) c.set(id, (c.get(id) ?? 0) + 1)
    return c
  }, [projects])
  return (
    <div>
      <h1>Collections</h1>
      <p className="lede">Each collection is a rule, not a hand-picked list. The rule is shown on every collection page and in the method notes.</p>
      <ul className="drawers">
        {COLLECTIONS.map((c) => (
          <li key={c.id}>
            <a href={href(`c/${c.id}`)} className="drawer">
              <span className="drawer-name">{c.label}</span>
              <span className="drawer-tag">{c.tagline}</span>
              <span className="drawer-n">{counts.get(c.id) ?? 0}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function CollectionPage({ id }: { id: string }) {
  const { projects } = useCatalog()
  const c = COLLECTIONS.find((x) => x.id === id)
  const [shown, setShown] = useState(30)
  const list = useMemo(() => projects.filter((p) => p.a.collections.includes(id)).sort((a, b) => b.a.rescue.score - a.a.rescue.score), [projects, id])
  if (!c) return <NotFound />
  return (
    <div>
      <p className="p-crumbs"><a href={href('collections')}>Collections</a></p>
      <h1>{c.label}</h1>
      <p className="lede">{c.tagline}</p>
      <p className="rule"><strong>Rule:</strong> {c.criteria} Sorted by Rescue Score. <a href={href('explore', `collection=${c.id}&sort=rescue`)}>Filter further in Explore</a>.</p>
      {list.length === 0 ? (
        <div className="empty"><Gary size={80} pose="think" />
          <p>{id === 'recently-discovered' ? 'This is the first catalog build, so everything is new and nothing is "recently discovered" yet. Ask again after the next refresh.' : 'No project matches this rule in the current catalog.'}</p>
        </div>
      ) : (
        <>
          <p className="muted">{list.length} projects</p>
          <div className="grid">{list.slice(0, shown).map((p) => <ProjectCard key={p.id} p={p} />)}</div>
          {shown < list.length && <button className="btn more" type="button" onClick={() => setShown((s) => s + 30)}>Show more</button>}
          <p><button className="btn-ghost" type="button" onClick={() => download(`collection-${c.id}.md`, selectionMarkdown(`Collection: ${c.label}`, list), 'text/markdown')}>Export this collection (Markdown)</button></p>
        </>
      )}
    </div>
  )
}

/* ---------- Random Rescue ---------- */

export function RandomRescue({ route }: { route: Route }) {
  const { projects } = useCatalog()
  const f = useMemo(() => queryToFilters(route.query), [route.query])
  const pool = useMemo(() => applyFilters(projects, f, new Date()).filter((p) => p.a.rescue.score >= 40), [projects, f])
  const [seed, setSeed] = useState(() => Math.random())
  const p = pool.length ? pool[Math.floor(seed * pool.length)] : null
  const set = (patch: Partial<typeof f>) => go('random', filtersToQuery({ ...f, ...patch }), true)
  const toggle = (key: 'maint' | 'license' | 'family', v: string) => set({ [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] })

  return (
    <div className="random">
      <h1>Random rescue</h1>
      <p className="lede">One project, picked at random among {pool.length.toLocaleString('en-US')} that match your filters (Rescue Score 40 or more). Your filters stay in the link.</p>
      <div className="chips" role="group" aria-label="Random filters">
        {['Dormant', 'Archived', 'Stable'].map((m) => <button key={m} type="button" aria-pressed={f.maint.includes(m)} className={`chip ${f.maint.includes(m) ? 'on' : ''}`} onClick={() => toggle('maint', m)}>{m}</button>)}
        {['Permissive', 'Copyleft'].map((m) => <button key={m} type="button" aria-pressed={f.license.includes(m)} className={`chip ${f.license.includes(m) ? 'on' : ''}`} onClick={() => toggle('license', m)}>{m}</button>)}
        {FAMILIES.filter((x) => ['hidden-gem', 'weird-wonderful', 'forgotten-software', 'unfinished-idea', 'ai-revival'].includes(x.id)).map((x) => (
          <button key={x.id} type="button" aria-pressed={f.family.includes(x.id)} className={`chip ${f.family.includes(x.id) ? 'on' : ''}`} onClick={() => toggle('family', x.id)}>{x.label}</button>
        ))}
        {filtersToQuery(f) && <button type="button" className="btn-ghost" onClick={() => go('random', '', true)}>Clear</button>}
      </div>

      {p ? (
        <div className="dig" key={p.id}>
          <div className="dig-top">
            <Gary size={70} pose="cheer" />
            <p className="bubble">{pick(RANDOM_INTROS, p.id)}</p>
          </div>
          <a className="dig-title" href={href(`p/${p.fullName}`)}><span className="owner">{p.owner}/</span>{p.name}</a>
          <p className="p-desc">{p.description}</p>
          <Strata p={p} large />
          <div className="card-badges"><Score v={p.a.rescue.score} /><MaintBadge s={p.a.maintenance} /><LicenseBadge s={p.a.licenseStatus} spdx={p.license.spdx} /><DiffBadge d={p.a.difficulty} /><ConfBadge l={p.a.confidence.level} /></div>
          <p className="voice gary-says"><span className="who">gary</span> {garyLine(p)}</p>
          <p className="voice jarvis"><span className="who">jarvis</span> {jarvisLine(p)}</p>
          <div className="plan-actions">
            <button className="btn" type="button" onClick={() => setSeed(Math.random())}>Dig again</button>
            <a className="btn-ghost" href={href(`p/${p.fullName}`)}>Open the full file</a>
            <a className="btn-ghost" href={p.url} target="_blank" rel="noreferrer">Repository on GitHub</a>
          </div>
        </div>
      ) : (
        <div className="empty"><Gary size={80} pose="think" /><p>No project left with these filters. Remove one.</p></div>
      )}
    </div>
  )
}

/* ---------- Project Finder ---------- */

const EXAMPLES = ['A self-hosted bookmark manager', 'A retro terminal game', 'A local-first inventory app', 'A lightweight crypto dashboard', 'An open-source image editor']

export function Finder({ route }: { route: Route }) {
  const { index, byId } = useCatalog()
  const initial = new URLSearchParams(route.query).get('idea') ?? ''
  const [idea, setIdea] = useState(initial)
  const [reusableOnly, setReusableOnly] = useState(true)
  const hits = useMemo(() => {
    if (!initial.trim()) return []
    const h = textSearch(index, byId, initial)
    return h.filter((x) => !reusableOnly || x.project.a.licenseStatus === 'Permissive' || x.project.a.licenseStatus === 'Copyleft').slice(0, 24)
  }, [initial, index, byId, reusableOnly])
  const exp = useMemo(() => expandQuery(initial), [initial])
  const active = hits.filter((h) => h.project.a.maintenance === 'Active' || h.project.a.maintenance === 'Low Activity')

  return (
    <div className="finder">
      <h1>Project finder</h1>
      <p className="lede">Describe the app you want to build. Repo Rescue looks for existing code you could revive, fork, or contribute to instead of starting from zero.</p>
      <form className="finder-form" onSubmit={(e) => { e.preventDefault(); go('finder', `idea=${encodeURIComponent(idea.trim())}`) }}>
        <label htmlFor="idea">What do you want to build?</label>
        <textarea id="idea" rows={2} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="A self-hosted bookmark manager with tags" />
        <div className="finder-row">
          <label className="check"><input type="checkbox" checked={reusableOnly} onChange={(e) => setReusableOnly(e.target.checked)} /><span>Only licenses that allow reuse</span></label>
          <button className="btn" type="submit">Find existing projects</button>
        </div>
      </form>
      {!initial && (
        <ul className="chips">{EXAMPLES.map((e) => <li key={e}><a className="chip" href={href('finder', `idea=${encodeURIComponent(e)}`)}>{e}</a></li>)}</ul>
      )}
      {initial && (
        <>
          <p className="small muted">Matched on names, descriptions and topics using: {exp.terms.slice(0, 14).join(', ')}{exp.langs.length ? `; language preference: ${exp.langs.join(', ')}` : ''}. Plain text matching and documented synonyms, no AI involved.</p>
          {active.length > 0 && <Jarvis>{active.length} of these are still maintained. contributing to {active[0].project.fullName} may beat a new fork.</Jarvis>}
          {hits.length ? (
            <div className="grid">{hits.map((h) => <ProjectCard key={h.project.id} p={h.project} note={<>Matched: {h.matched.slice(0, 5).join(', ')}</>} />)}</div>
          ) : (
            <div className="empty"><Gary size={80} pose="think" /><p>Nothing in the catalog matches that idea yet. Try simpler words, or search GitHub directly.</p>
              <a className="btn-ghost" href={`https://github.com/search?q=${encodeURIComponent(initial)}&type=repositories`} target="_blank" rel="noreferrer">Search GitHub for “{initial}”</a></div>
          )}
        </>
      )}
    </div>
  )
}

export function NotFound() {
  return (
    <div className="empty">
      <Gary size={90} pose="think" />
      <h1>Nothing dug up here</h1>
      <p>This page does not exist. Maybe it was archived too.</p>
      <a className="btn" href={href('')}>Back home</a>
    </div>
  )
}

export { DEFAULT_FILTERS }
