import { useMemo, useState } from 'react'
import { useCatalog } from '../app/data'
import { go, href } from '../app/router'
import { pick } from '../app/voice'
import { COLLECTIONS, FAMILIES } from '../core/taxonomy'
import { Jarvis, ProjectCard } from '../ui/bits'

export function Home() {
  const { projects, meta } = useCatalog()
  const [q, setQ] = useState('')
  const day = new Date().toISOString().slice(0, 10)

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of projects) for (const id of p.a.collections) c.set(id, (c.get(id) ?? 0) + 1)
    return c
  }, [projects])
  const famCounts = useMemo(() => {
    const c = new Map<string, number>()
    for (const p of projects) for (const id of p.a.families) c.set(id, (c.get(id) ?? 0) + 1)
    return c
  }, [projects])

  // Today's dig: the best-scoring analyzed project of six different families, rotated daily.
  const picks = useMemo(() => {
    const out: typeof projects = []
    const fams = [...FAMILIES].sort((a, b) => (pick([0, 1, 2, 3], day + a.id) as number) - (pick([0, 1, 2, 3], day + b.id) as number))
    for (const f of fams) {
      const pool = projects.filter((p) => p.meta.depth === 'analyzed' && p.a.families.includes(f.id) && !out.includes(p)).slice(0, 25)
      if (pool.length) out.push(pick(pool, day + f.id))
      if (out.length === 6) break
    }
    return out
  }, [projects, day])

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <h1>good code deserves<br />a second life.</h1>
          <p className="lede">
            Find forgotten, archived and overlooked open source projects worth reviving, check whether you can legally reuse them, and leave with a plan.
          </p>
          <form className="prompt" role="search" onSubmit={(e) => { e.preventDefault(); go('explore', q.trim() ? `q=${encodeURIComponent(q.trim())}` : '') }}>
            <label htmlFor="home-q" className="prompt-sign">$ rescue</label>
            <input id="home-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="bookmark manager, retro game, rust cli…" autoComplete="off" />
            <button type="submit" className="btn">Search</button>
          </form>
          <div className="hero-actions">
            <a className="btn btn-alt" href={href('random')}>Random rescue</a>
            <a className="btn-ghost" href={href('finder')}>Describe what you want to build</a>
          </div>
          <p className="catalog-line">
            {meta.counts.total.toLocaleString('en-US')} repositories in the catalog, {meta.counts.analyzed.toLocaleString('en-US')} analyzed in depth. Built {new Date(meta.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Today's dig</h2>
          <p className="muted">Six finds from six different families. Changes every day.</p>
        </div>
        <div className="grid">{picks.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Collections</h2>
          <p className="muted">Filled automatically by documented rules. <a href={href('method')}>See the rules</a>.</p>
        </div>
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
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Browse by family</h2>
        </div>
        <ul className="families">
          {FAMILIES.map((f) => (
            <li key={f.id}>
              <a href={href('explore', `family=${f.id}&sort=rescue`)}>
                <strong>{f.label}</strong> <span className="muted">{famCounts.get(f.id) ?? 0}</span>
                <span className="fam-blurb">{f.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
        <Jarvis>inactive is not abandoned. a quiet repo with releases and few open issues is filed under stable, not dead.</Jarvis>
      </section>
    </div>
  )
}
