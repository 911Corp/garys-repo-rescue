import type { ReactNode } from 'react'
import { lastActivity } from '../core/dates'
import type { ConfidenceLevel, LicenseStatus, MaintenanceStatus, Project, RevivalDifficulty } from '../core/types'
import { href, projectPath } from '../app/router'
import { compareStore, favoritesStore, toggleCompare, toggleFavorite, useStore } from '../app/store'

/** Gary: deliberately MS-Paint-ish stick gamer on his chair, headset on. Decorative. */
/**
 * Gary, header mark only. Stick-figure gamer with a headset, sitting on his chair
 * (with room left on the seat) in front of his PC. Deliberately simple, MS Paint spirit.
 */
export function Gary({ size = 40 }: { size?: number }) {
  return (
    <svg className="gary" width={size * 1.33} height={size} viewBox="0 0 64 48" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {/* chair: backrest, seat, column, base */}
      <path d="M5 13 L6 33 L25 33 M15 33 L15 44 M8 45 L22 45" />
      {/* desk + PC */}
      <path d="M36 31 L62 31 M39 31 L39 46 M59 31 L59 46" />
      <path d="M43 12 L59 12 L59 25 L43 25 Z" />
      <path d="M51 25 L51 31" />
      {/* head */}
      <circle cx="19" cy="9" r="4.6" />
      {/* headset: band, ear cups, mic */}
      <path d="M12.6 9 C12.4 0.6 25.6 0.6 25.4 9" strokeWidth="1.8" />
      <rect x="11.4" y="7.6" width="2.6" height="4.6" rx="1" fill="currentColor" strokeWidth="1" />
      <rect x="24" y="7.6" width="2.6" height="4.6" rx="1" fill="currentColor" strokeWidth="1" />
      <path d="M25.6 12 Q26.2 15.4 22.4 15.2" strokeWidth="1.6" />
      {/* body, leg, arm on the keyboard */}
      <path d="M18.5 13.8 L17 32" />
      <path d="M17 32 L30 31.5 L31 45 L34 45" />
      <path d="M18 19 L25 26 L37 29.5" />
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
        {large && y1 !== y0 && y1 !== new Date(end).getUTCFullYear() && activePct >= 12 && activePct <= 88 && <span style={{ left: `${activePct}%` }} className="mid">{y1}</span>}
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
  return <p className="voice jarvis"><span className="who">jarvis</span><span>{children}</span></p>
}
export function GarySays({ children }: { children: ReactNode }) {
  return <p className="voice gary-says"><span className="who">gary</span><span>{children}</span></p>
}
