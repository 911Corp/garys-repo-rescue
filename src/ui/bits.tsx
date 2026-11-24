import type { ReactNode } from 'react'
import { lastActivity } from '../core/dates'
import type { ConfidenceLevel, LicenseStatus, MaintenanceStatus, Project, RevivalDifficulty } from '../core/types'
import { href, projectPath } from '../app/router'
import { compareStore, favoritesStore, toggleCompare, toggleFavorite, useStore } from '../app/store'

/** Gary: deliberately MS-Paint-ish stick gamer on his chair, headset on. Decorative. */
export function Gary({ size = 64, pose = 'sit' }: { size?: number; pose?: 'sit' | 'think' | 'cheer' }) {
  const arm = pose === 'cheer' ? 'M30 30 L20 12 M30 30 L42 13' : pose === 'think' ? 'M30 31 L37 37 L33 22' : 'M30 31 L40 38 L50 37'
  return (
    <svg className="gary" width={size} height={size} viewBox="0 0 72 72" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {/* desk + screen */}
      <path d="M44 44 L70 44 M48 44 L48 66 M66 44 L66 66" strokeWidth="2" />
      <path d="M52 26 L68 25 L68 39 L52 40 Z" strokeWidth="2" />
      <path d="M60 40 L60 44" strokeWidth="2" />
      {/* chair */}
      <path d="M14 33 L13 50 L32 51 M22 51 L21 66 M14 66 L30 66" strokeWidth="2" />
      {/* head */}
      <path d="M24 9 C31 8 33 14 31 18 C29 22 22 22 20 18 C18 13 20 10 24 9 Z" />
      {/* headset */}
      <path d="M19 15 C19 5 33 4 33 14" strokeWidth="2" />
      <path d="M33 15 C35 18 34 21 31 23" strokeWidth="1.6" />
      {/* body + legs */}
      <path d="M25 22 L24 48 L40 49 L41 64" />
      <path d={arm} />
    </svg>
  )
}

const maintClass: Record<MaintenanceStatus, string> = { Active: 'm-active', 'Low Activity': 'm-low', Dormant: 'm-dormant', Archived: 'm-archived', Stable: 'm-stable', Unknown: 'm-unknown' }
const maintGlyph: Record<MaintenanceStatus, string> = { Active: '●', 'Low Activity': '◐', Dormant: '○', Archived: '■', Stable: '◆', Unknown: '?' }

export function MaintBadge({ s }: { s: MaintenanceStatus }) {
  return <span className={`badge ${maintClass[s]}`} title={`Maintenance: ${s}`}><span aria-hidden="true">{maintGlyph[s]}</span> {s}</span>
}

const licClass: Record<LicenseStatus, string> = { Permissive: 'l-ok', Copyleft: 'l-copy', 'Other Restrictions': 'l-warn', 'No Explicit License': 'l-bad', Unknown: 'l-unknown' }
export function LicenseBadge({ s, spdx }: { s: LicenseStatus; spdx?: string | null }) {
  return <span className={`badge ${licClass[s]}`} title={`License status: ${s}`}>{spdx && spdx !== 'NOASSERTION' ? spdx : s === 'No Explicit License' ? 'No license' : s}</span>
}

export function DiffBadge({ d }: { d: RevivalDifficulty }) {
  const n = { Beginner: 1, Intermediate: 2, Advanced: 3, Expert: 4, Unknown: 0 }[d]
  return (
    <span className="badge diff" title={`Revival difficulty: ${d}`}>
      <span className="pips" aria-hidden="true">{[1, 2, 3, 4].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
      {d}
    </span>
  )
}

export function ConfBadge({ l, score }: { l: ConfidenceLevel; score?: number }) {
  return <span className={`badge conf c-${l.toLowerCase()}`} title={`Data confidence${score != null ? ` ${score}/100` : ''}`}>{l} confidence</span>
}

export function Score({ v, big }: { v: number; big?: boolean }) {
  return (
    <span className={`score ${big ? 'score-big' : ''}`} title="Rescue Score: apparent reuse/revival potential, 0 to 100">
      <span className="score-n">{v}</span>
      <span className="score-bar" aria-hidden="true"><i style={{ width: `${v}%` }} /></span>
    </span>
  )
}

/**
 * The strata line: a project's life drawn as rock layers.
 * Solid band = created → last activity. Hatched band = time asleep until today.
 */
export function Strata({ p, large }: { p: Project; large?: boolean }) {
  const start = Date.parse(p.createdAt)
  const end = Date.now()
  const last = Date.parse(lastActivity(p) ?? p.createdAt)
  const span = Math.max(end - start, 1)
  const activePct = Math.max(1.5, ((last - start) / span) * 100)
  const rel = p.latestRelease?.publishedAt ? ((Date.parse(p.latestRelease.publishedAt) - start) / span) * 100 : null
  const y0 = new Date(start).getUTCFullYear()
  const y1 = new Date(last).getUTCFullYear()
  const label = `Created ${y0}, last activity ${y1}${p.archived ? ', archived' : ''}`
  return (
    <div className={`strata ${large ? 'strata-lg' : ''} ${p.archived ? 'is-archived' : ''}`} role="img" aria-label={label}>
      <div className="strata-track">
        <span className="strata-life" style={{ width: `${activePct}%` }} />
        <span className="strata-sleep" style={{ left: `${activePct}%` }} />
        {rel != null && rel >= 0 && rel <= 100 && <span className="strata-rel" style={{ left: `${rel}%` }} title={`Latest release ${p.latestRelease!.tag}`} />}
      </div>
      <div className="strata-years" aria-hidden="true">
        <span>{y0}</span>
        {large && y1 !== y0 && <span style={{ left: `${activePct}%` }} className="mid">{y1}</span>}
        <span>{new Date(end).getUTCFullYear()}</span>
      </div>
    </div>
  )
}

export function FavButton({ id, compact }: { id: string; compact?: boolean }) {
  const favs = useStore(favoritesStore)
  const on = favs.includes(id)
  return (
    <button type="button" className={`btn-ghost fav ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleFavorite(id)} title={on ? 'Remove from saved' : 'Save'}>
      <span aria-hidden="true">{on ? '★' : '☆'}</span>
      {!compact && <span>{on ? 'Saved' : 'Save'}</span>}
      {compact && <span className="sr-only">{on ? 'Remove from saved' : 'Save'}</span>}
    </button>
  )
}

export function CompareButton({ id }: { id: string }) {
  const c = useStore(compareStore)
  const on = c.includes(id)
  return (
    <button type="button" className={`btn-ghost ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggleCompare(id)}>
      {on ? 'In comparison' : 'Compare'}
    </button>
  )
}

export function ProjectCard({ p, note }: { p: Project; note?: ReactNode }) {
  return (
    <article className="card">
      <header className="card-head">
        <a className="card-title" href={href(projectPath(p.fullName))}>
          <span className="owner">{p.owner}/</span>
          <span className="repo">{p.name}</span>
        </a>
        <FavButton id={p.id} compact />
      </header>
      <p className="card-desc">{p.description ?? <em className="muted">No description provided by the owner.</em>}</p>
      <Strata p={p} />
      <div className="card-badges">
        <MaintBadge s={p.a.maintenance} />
        <LicenseBadge s={p.a.licenseStatus} spdx={p.license.spdx} />
        <DiffBadge d={p.a.difficulty} />
      </div>
      <footer className="card-foot">
        <Score v={p.a.rescue.score} />
        <span className="card-facts">
          <span title="Stars">★ {fmtN(p.stars)}</span>
          <span title="Forks">⑂ {fmtN(p.forks)}</span>
          {p.language && <span>{p.language}</span>}
        </span>
      </footer>
      {note && <div className="card-note">{note}</div>}
    </article>
  )
}

export const fmtN = (n: number) => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n))

export function Jarvis({ children }: { children: ReactNode }) {
  return <p className="voice jarvis"><span className="who">jarvis</span> {children}</p>
}
export function GarySays({ children }: { children: ReactNode }) {
  return <p className="voice gary-says"><span className="who">gary</span> {children}</p>
}
