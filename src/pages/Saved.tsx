import { useState } from 'react'
import { useCatalog } from '../app/data'
import { href } from '../app/router'
import { compareStore, download, favoritesStore, historyStore, listsStore, toggleCompare, useStore } from '../app/store'
import { fmtDate, humanAge } from '../core/dates'
import { selectionMarkdown, toCSV, toJSON } from '../core/exporters'
import type { Project } from '../core/types'
import { ConfBadge, DiffBadge, LicenseBadge, MaintBadge, ProjectCard, Score, Strata } from '../ui/bits'

export function Saved() {
  const { byId } = useCatalog()
  const favs = useStore(favoritesStore).map((id) => byId.get(id)).filter((p): p is Project => !!p)
  const hist = useStore(historyStore).map((h) => ({ p: byId.get(h.id), at: h.at })).filter((x): x is { p: Project; at: string } => !!x.p)
  const lists = useStore(listsStore)
  const [name, setName] = useState('')

  const addList = () => {
    if (!name.trim()) return
    listsStore.set([...lists, { id: `l${Date.now()}`, name: name.trim(), ids: favs.map((p) => p.id) }])
    setName('')
  }

  return (
    <div>
      <h1>Saved</h1>
      <p className="lede">Stored in this browser only. No account, nothing sent anywhere.</p>
      <section>
        <h2>Saved projects ({favs.length})</h2>
        {favs.length ? (
          <>
            <div className="grid">{favs.map((p) => <ProjectCard key={p.id} p={p} />)}</div>
            <div className="export-row">
              <button className="btn-ghost" type="button" onClick={() => download('saved.csv', toCSV(favs), 'text/csv')}>Export CSV</button>
              <button className="btn-ghost" type="button" onClick={() => download('saved.json', toJSON(favs), 'application/json')}>Export JSON</button>
              <button className="btn-ghost" type="button" onClick={() => download('saved.md', selectionMarkdown('My saved repos', favs), 'text/markdown')}>Export Markdown</button>
            </div>
            <form className="inline-form" onSubmit={(e) => { e.preventDefault(); addList() }}>
              <label htmlFor="ln">Save the current set as a personal collection</label>
              <input id="ln" value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend ideas" />
              <button className="btn" type="submit">Create collection</button>
            </form>
          </>
        ) : <div className="empty"><p>Nothing saved yet. Use the star on any project.</p><a className="btn" href={href('explore')}>Explore</a></div>}
      </section>
      {lists.length > 0 && (
        <section>
          <h2>Personal collections</h2>
          <ul className="drawers">
            {lists.map((l) => (
              <li key={l.id} className="drawer">
                <span className="drawer-name">{l.name}</span>
                <span className="drawer-tag">{l.ids.map((id) => byId.get(id)?.fullName).filter(Boolean).slice(0, 3).join(', ')}{l.ids.length > 3 ? '…' : ''}</span>
                <span className="drawer-n">{l.ids.length}</span>
                <span className="drawer-actions">
                  <button className="btn-ghost" type="button" onClick={() => download(`${l.name}.md`, selectionMarkdown(l.name, l.ids.map((id) => byId.get(id)).filter((p): p is Project => !!p)), 'text/markdown')}>Export</button>
                  <button className="btn-ghost" type="button" onClick={() => listsStore.set(lists.filter((x) => x.id !== l.id))}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2>Discovery history</h2>
        {hist.length ? (
          <ol className="history">
            {hist.slice(0, 30).map(({ p, at }) => <li key={p.id}><a href={href(`p/${p.fullName}`)}>{p.fullName}</a> <span className="muted small">{fmtDate(at)}</span></li>)}
          </ol>
        ) : <p className="muted">Projects you open will show up here.</p>}
        {hist.length > 0 && <button className="btn-ghost" type="button" onClick={() => historyStore.set([])}>Clear history</button>}
      </section>
    </div>
  )
}

export function Compare() {
  const { byId } = useCatalog()
  const items = useStore(compareStore).map((id) => byId.get(id)).filter((p): p is Project => !!p)
  if (!items.length) return <div className="empty"><h1>Compare projects</h1><p>Add up to four projects with the Compare button on a project page.</p><a className="btn" href={href('explore')}>Explore</a></div>
  const rows: [string, (p: Project) => React.ReactNode][] = [
    ['Timeline', (p) => <Strata p={p} />],
    ['Rescue Score', (p) => <Score v={p.a.rescue.score} />],
    ['Maintenance', (p) => <MaintBadge s={p.a.maintenance} />],
    ['License', (p) => <LicenseBadge s={p.a.licenseStatus} spdx={p.license.spdx} />],
    ['Revival difficulty', (p) => <DiffBadge d={p.a.difficulty} />],
    ['Data confidence', (p) => <ConfBadge l={p.a.confidence.level} />],
    ['Language', (p) => p.language ?? 'n/a'],
    ['Stars / forks', (p) => `${p.stars} / ${p.forks}`],
    ['Last activity', (p) => humanAge(p.a.monthsSinceActivity)],
    ['Created', (p) => fmtDate(p.createdAt)],
    ['Latest release', (p) => p.latestRelease?.tag ?? (p.meta.unavailable.includes('latestRelease') ? 'not collected' : 'none')],
    ['Commits', (p) => p.commitsTotal ?? 'not collected'],
    ['Tests / CI', (p) => `${p.quality.tests == null ? '?' : p.quality.tests ? 'yes' : 'no'} / ${p.quality.ci == null ? '?' : p.quality.ci ? 'yes' : 'no'}`],
    ['Successor hint', (p) => p.forkIntel.successorHints[0]?.repo ?? p.forkIntel.possibleSuccessor ?? 'none found'],
  ]
  return (
    <div>
      <h1>Compare</h1>
      <div className="compare-wrap" tabIndex={0} role="region" aria-label="Comparison table">
        <table className="compare">
          <thead><tr><th scope="col"><span className="sr-only">Criterion</span></th>{items.map((p) => <th scope="col" key={p.id}><a href={href(`p/${p.fullName}`)}>{p.fullName}</a><br /><button className="btn-ghost small" type="button" onClick={() => toggleCompare(p.id)}>Remove</button></th>)}</tr></thead>
          <tbody>{rows.map(([k, f]) => <tr key={k}><th scope="row">{k}</th>{items.map((p) => <td key={p.id}>{f(p)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p><button className="btn-ghost" type="button" onClick={() => download('comparison.md', selectionMarkdown('Comparison', items), 'text/markdown')}>Export comparison (Markdown)</button></p>
    </div>
  )
}
