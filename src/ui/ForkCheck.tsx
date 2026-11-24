/**
 * On-demand fork check, run from the visitor's browser against the public GitHub REST API.
 * No token is used or needed (unauthenticated limit: 60 requests/hour per IP).
 * Results are cached in localStorage for 24 hours. Same rules as the collector (src/core/forks.ts).
 */
import { useState } from 'react'
import { fmtDate } from '../core/dates'
import { analyzeForks, type RawFork } from '../core/forks'
import type { ForkIntel, Project } from '../core/types'

const TTL = 24 * 3600 * 1000
type Cached = { at: number; intel: Omit<ForkIntel, 'successorHints'> }
type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'done'; intel: Omit<ForkIntel, 'successorHints'>; at: number }
  | { kind: 'error'; message: string }

const key = (p: Project) => `grr:forks:${p.fullName.toLowerCase()}`

function readCache(p: Project): Cached | null {
  try {
    const raw = localStorage.getItem(key(p))
    if (!raw) return null
    const c = JSON.parse(raw) as Cached
    return Date.now() - c.at < TTL ? c : null
  } catch {
    return null
  }
}

export function ForkCheck({ p }: { p: Project }) {
  const [state, setState] = useState<State>(() => {
    const c = readCache(p)
    return c ? { kind: 'done', intel: c.intel, at: c.at } : { kind: 'idle' }
  })

  async function run() {
    setState({ kind: 'loading' })
    try {
      const res = await fetch(`https://api.github.com/repos/${p.fullName}/forks?sort=stargazers&per_page=30`, {
        headers: { Accept: 'application/vnd.github+json' },
      })
      if (res.status === 403 || res.status === 429) {
        const reset = Number(res.headers.get('x-ratelimit-reset'))
        const when = reset ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString()}.` : ''
        setState({ kind: 'error', message: `GitHub's hourly limit for anonymous requests is used up on this network.${when}` })
        return
      }
      if (!res.ok) {
        setState({ kind: 'error', message: `GitHub answered ${res.status}. The repository may have moved or been removed.` })
        return
      }
      const forks = (await res.json()) as RawFork[]
      const intel = analyzeForks(forks, p.lastCommitAt ?? p.pushedAt ?? p.createdAt, p.stars, new Date())
      const at = Date.now()
      try { localStorage.setItem(key(p), JSON.stringify({ at, intel })) } catch { /* storage full or disabled */ }
      setState({ kind: 'done', intel, at })
    } catch {
      setState({ kind: 'error', message: 'Could not reach GitHub from this page (offline, blocked, or a browser extension).' })
    }
  }

  const activeLink = <a href={`${p.url}/forks?include=active&sort_by=last_updated`} target="_blank" rel="noreferrer">Browse active forks on GitHub</a>

  if (state.kind === 'idle') {
    return (
      <div className="forkcheck">
        <p>Forks were not inspected when this catalog was built. Jarvis can check the top 30 forks by stars right now, straight from GitHub.</p>
        <p><button className="btn" type="button" onClick={run}>Check forks live</button> {activeLink}</p>
        <p className="small muted">One anonymous request to the GitHub API from your browser. No account, no token.</p>
      </div>
    )
  }
  if (state.kind === 'loading') return <p className="forkcheck" aria-live="polite">jarvis is counting forks…</p>
  if (state.kind === 'error') {
    return (
      <div className="forkcheck" role="status">
        <p>{state.message}</p>
        <p><button className="btn-ghost" type="button" onClick={run}>Retry</button> {activeLink}</p>
      </div>
    )
  }
  const { intel } = state
  return (
    <div className="forkcheck" aria-live="polite">
      {intel.notable.length ? (
        <table className="breakdown">
          <thead><tr><th scope="col">Fork</th><th scope="col">Stars</th><th scope="col">Last push</th><th scope="col">Pushed after original</th></tr></thead>
          <tbody>
            {intel.notable.map((f) => (
              <tr key={f.fullName}>
                <th scope="row"><a href={f.url} target="_blank" rel="noreferrer">{f.fullName}</a>{f.fullName === intel.possibleSuccessor && <span className="tag">possible successor</span>}</th>
                <td>{f.stars}</td><td>{fmtDate(f.pushedAt)}</td><td>{f.pushedAfterOriginalDays != null ? `${f.pushedAfterOriginalDays} days` : 'n/a'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>{intel.inspected === 0 ? 'GitHub returned no forks.' : `${intel.inspected} top forks inspected, none pushed meaningfully (30+ days) after the original.`}</p>
      )}
      {intel.possibleSuccessor && <p className="small">jarvis: an active fork may already carry this project. Consider contributing there before starting your own.</p>}
      <p className="small muted">Checked live on {new Date(state.at).toLocaleString('en-US')} (cached 24 h). Top forks by stars only; heuristic, not a verdict. {activeLink}.</p>
    </div>
  )
}
