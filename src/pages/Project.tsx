import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../app/data'
import { href, projectPath } from '../app/router'
import { copyText, download, recordVisit } from '../app/store'
import { garyLine, jarvisLine } from '../app/voice'
import { fmtDate, humanAge } from '../core/dates'
import { freeStackHandoff } from '../core/exporters'
import { agentDirectiveMarkdown } from '../core/agentDirective'
import { modernizationIdeas, rescuePlanMarkdown } from '../core/rescuePlan'
import { RESCUE_WEIGHTS } from '../core/scoring'
import { similarProjects } from '../core/similar'
import { FAMILIES } from '../core/taxonomy'
import type { Project as P } from '../core/types'
import { CompareButton, ConfBadge, DiffBadge, FavButton, Gary, LicenseBadge, MaintBadge, ProjectCard, Score, Strata, fmtN } from '../ui/bits'
import { downloadShareCard } from '../ui/shareCard'
import { ForkCheck } from '../ui/ForkCheck'

export const APP_REPO = 'https://github.com/911Corp/garys-repo-rescue'

export function ProjectPage({ fullName }: { fullName: string }) {
  const { byName, projects, meta } = useCatalog()
  const p = byName.get(fullName.toLowerCase())
  useEffect(() => { if (p) { recordVisit(p.id); document.title = `${p.fullName} · Gary's Repo Rescue` } }, [p])
  if (!p) {
    return (
      <div className="empty">
        <Gary size={90} pose="think" />
        <h1>Not in the catalog</h1>
        <p><code>{fullName}</code> is not in this catalog build. It may have been filtered out or never discovered.</p>
        <p><a className="btn" href={`https://github.com/${fullName}`} target="_blank" rel="noreferrer">Open it on GitHub</a> <a className="btn-ghost" href={href('explore')}>Back to Explore</a></p>
      </div>
    )
  }
  return <ProjectView p={p} all={projects} generatedAt={meta.generatedAt} />
}

function ProjectView({ p, all, generatedAt }: { p: P; all: P[]; generatedAt: string }) {
  const a = p.a
  const [planOpen, setPlanOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const similar = useMemo(() => similarProjects(p, all, 6), [p, all])
  const plan = useMemo(() => rescuePlanMarkdown(p, { generatedAt, appUrl: window.location.href }), [p, generatedAt])
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2200) }
  const na = (k: string) => p.meta.unavailable.includes(k)
  const fam = FAMILIES.filter((f) => a.families.includes(f.id))
  const tweet = `${p.fullName}: ${a.maintenance.toLowerCase()}, rescue score ${a.rescue.score}/100. ${garyLine(p)}`

  return (
    <article className="project">
      <header className="p-head">
        <p className="p-crumbs"><a href={href('explore')}>Explore</a> / {p.owner}</p>
        <h1 className="p-title"><span className="owner">{p.owner}/</span>{p.name}</h1>
        <p className="p-desc">{p.description ?? <em className="muted">No description provided by the owner.</em>}</p>
        <div className="p-links">
          <a className="btn" href={p.url} target="_blank" rel="noreferrer">Open repository on GitHub</a>
          {p.homepage && <a className="btn-ghost" href={p.homepage} target="_blank" rel="noreferrer nofollow">Homepage or demo</a>}
          <FavButton id={p.id} />
          <CompareButton id={p.id} />
        </div>
        {p.topics.length > 0 && <ul className="topics">{p.topics.map((t) => <li key={t}><a href={href('explore', `q=${encodeURIComponent(t)}`)}>{t}</a></li>)}</ul>}
      </header>

      <section className="p-strata" aria-label="Activity timeline">
        <Strata p={p} large />
        <p className="muted small">Solid: from creation to the last {p.lastCommitAt ? 'commit' : 'push'} ({fmtDate(p.lastCommitAt ?? p.pushedAt)}). Hatched: time asleep since. {p.latestRelease?.publishedAt ? 'Tick: latest release.' : ''}</p>
      </section>

      <section className="indicators" aria-label="Assessment">
        <div className="ind ind-score"><h2>Rescue Score</h2><Score v={a.rescue.score} big /><p className="small muted">{Math.round(a.rescue.coverage * 100)}% of the criteria could be computed.</p></div>
        <div className="ind"><h2>Maintenance</h2><MaintBadge s={a.maintenance} /><p className="small">{a.maintenanceReason}</p></div>
        <div className="ind"><h2>Revival difficulty</h2><DiffBadge d={a.difficulty} /><ul className="small tight">{a.difficultyReasons.map((r) => <li key={r}>{r}</li>)}</ul></div>
        <div className="ind"><h2>License</h2><LicenseBadge s={a.licenseStatus} spdx={p.license.spdx} /><p className="small">{a.licenseNote}</p>{p.license.url && <a className="small" href={p.license.url} target="_blank" rel="noreferrer">Read the license file</a>}</div>
        <div className="ind"><h2>Data confidence</h2><ConfBadge l={a.confidence.level} score={a.confidence.score} /><ul className="small tight">{a.confidence.notes.length ? a.confidence.notes.map((n) => <li key={n}>{n}</li>) : <li>All expected fields collected recently.</li>}</ul></div>
      </section>

      <div className="split">
        <section className="facts-panel" aria-labelledby="facts-h">
          <h2 id="facts-h">Verified facts</h2>
          <p className="small muted">From {p.meta.sources.join(' and ')}. Collected {fmtDate(p.meta.collectedAt)}{p.meta.oldestSourceSync ? `; some details synced by ecosyste.ms on ${fmtDate(p.meta.oldestSourceSync)}` : ''}. {p.meta.depth === 'indexed' ? 'Indexed only: not analyzed in depth yet.' : 'Analyzed in depth.'}</p>
          <dl className="facts">
            <Fact k="Created" v={fmtDate(p.createdAt)} />
            <Fact k="Last push" v={`${fmtDate(p.pushedAt)} (${humanAge(a.monthsSinceActivity)})`} />
            <Fact k="Last commit" v={p.lastCommitAt ? fmtDate(p.lastCommitAt) : null} missing={na('lastCommitAt')} />
            <Fact k="Archived" v={p.archived ? 'Yes, read-only' : 'No'} />
            <Fact k="Stars / forks" v={`${p.stars.toLocaleString('en-US')} / ${p.forks.toLocaleString('en-US')}`} />
            <Fact k={p.contributorsBasis === 'commit-authors' ? 'Commit authors' : 'Contributors'} v={p.contributors?.toLocaleString('en-US') ?? null} missing={na('contributors')} />
            <Fact k="Commits (default branch)" v={p.commitsTotal?.toLocaleString('en-US') ?? null} missing={na('commitsTotal')} />
            <Fact k="Commits, last 12 months" v={p.commits12m?.toLocaleString('en-US') ?? null} missing={na('commits12m')} />
            <Fact k="Latest release" v={p.latestRelease ? `${p.latestRelease.tag} (${fmtDate(p.latestRelease.publishedAt)})` : 'None published'} missing={na('latestRelease')} />
            <Fact k="Open issues + PRs" v={String(p.openIssuesAndPrs)} />
            <Fact k="Primary language" v={p.language ?? 'Not reported'} />
            {p.languages && p.languages.length > 0 && <Fact k="Languages" v={p.languages.map((l) => `${l.name} ${Math.round(l.share * 100)}%`).join(', ')} />}
            <Fact k="Repository size" v={p.sizeKb != null ? (p.sizeKb > 1024 ? `${(p.sizeKb / 1024).toFixed(1)} MB` : `${p.sizeKb} KB`) : null} />
            <Fact k="Root manifests" v={p.quality.manifests.length ? p.quality.manifests.join(', ') : p.meta.depth === 'indexed' ? null : 'None detected'} missing={p.meta.depth === 'indexed'} />
          </dl>
          <h3>Documentation and hygiene</h3>
          <ul className="signals">
            <Sig label="README" v={p.quality.readme} />
            <Sig label="Install or getting-started section" v={p.quality.installInstructions} />
            <Sig label="Screenshots in README" v={p.quality.screenshots} />
            <Sig label="Docs folder" v={p.quality.docs} />
            <Sig label="Examples folder" v={p.quality.examples} />
            <Sig label="Tests" v={p.quality.tests} />
            <Sig label={`CI${p.quality.ciProviders.length ? ` (${p.quality.ciProviders.join(', ')})` : ''}`} v={p.quality.ci} />
            <Sig label="CONTRIBUTING" v={p.quality.contributing} />
            <Sig label="CHANGELOG" v={p.quality.changelog} />
            <Sig label="Container setup" v={p.quality.dockerfile} />
          </ul>
          <p className="small muted">“Not detected” means the signal was looked for and not found where Repo Rescue looks; it does not prove absence. Nothing was run or tested.</p>
        </section>

        <section className="notebook" aria-labelledby="nb-h">
          <h2 id="nb-h">Gary's notebook <span className="tag">hypotheses</span></h2>
          <div className="duo">
            <Gary size={56} />
            <div>
              <p className="voice gary-says"><span className="who">gary</span> {garyLine(p)}</p>
              <p className="voice jarvis"><span className="who">jarvis</span> {jarvisLine(p)}</p>
            </div>
          </div>
          <h3>Why it was selected</h3>
          <ul className="tight">{a.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
          {fam.length > 0 && <ul className="fam-tags">{fam.map((f) => <li key={f.id}><a href={href('explore', `family=${f.id}&sort=rescue`)}>{f.label}</a></li>)}</ul>}
          <h3>Modernization ideas</h3>
          <ul className="tight">{modernizationIdeas(p).map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>

      <div className="split">
        <section>
          <h2>Strengths</h2>
          {a.strengths.length ? <ul className="plus">{a.strengths.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">No particular strength detected from metadata.</p>}
        </section>
        <section>
          <h2>Watch out</h2>
          {a.cautions.length ? <ul className="minus">{a.cautions.map((s) => <li key={s}>{s}</li>)}</ul> : <p className="muted">No caution flagged from metadata. Not proof of absence.</p>}
        </section>
      </div>

      <section>
        <h2>Score breakdown</h2>
        <table className="breakdown">
          <caption className="sr-only">Rescue Score components</caption>
          <thead><tr><th scope="col">Criterion</th><th scope="col">Weight</th><th scope="col">Value</th><th scope="col">Based on</th></tr></thead>
          <tbody>
            {a.rescue.components.map((c) => (
              <tr key={c.key} className={c.value == null ? 'na' : ''}>
                <th scope="row">{c.label}</th>
                <td>{Math.round(RESCUE_WEIGHTS[c.key as keyof typeof RESCUE_WEIGHTS] * 100)}%</td>
                <td>{c.value == null ? 'not computable' : <span className="mini-bar"><i style={{ width: `${Math.round(c.value * 80)}px` }} />{Math.round(c.value * 100)}</span>}</td>
                <td className="small">{c.notes.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="small muted">Unavailable criteria are left out and the others reweighted: missing data never counts as a bad result. <a href={href('method')}>Full method</a>.</p>
      </section>

      <section>
        <h2>Forks and successors</h2>
        {p.forkIntel.successorHints.length > 0 && (
          <ul className="minus">{p.forkIntel.successorHints.map((h) => <li key={h.repo}>The README points to <a href={`https://github.com/${h.repo}`} target="_blank" rel="noreferrer">{h.repo}</a> as a new home or successor.</li>)}</ul>
        )}
        {p.forkIntel.checked ? (
          p.forkIntel.notable.length ? (
            <table className="breakdown">
              <thead><tr><th scope="col">Fork</th><th scope="col">Stars</th><th scope="col">Last push</th><th scope="col">Pushed after original</th></tr></thead>
              <tbody>{p.forkIntel.notable.map((f) => <tr key={f.fullName}><th scope="row"><a href={f.url} target="_blank" rel="noreferrer">{f.fullName}</a>{f.fullName === p.forkIntel.possibleSuccessor && <span className="tag">possible successor</span>}</th><td>{f.stars}</td><td>{fmtDate(f.pushedAt)}</td><td>{f.pushedAfterOriginalDays != null ? `${f.pushedAfterOriginalDays} days` : 'n/a'}</td></tr>)}</tbody>
            </table>
          ) : <p>{p.forkIntel.inspected} top forks inspected, none pushed meaningfully after the original.</p>
        ) : p.forks > 0 ? (
          <ForkCheck p={p} />
        ) : (
          <p>No forks on record at collection time.</p>
        )}
      </section>

      <section className="plan">
        <div className="section-head">
          <h2>Rescue Plan</h2>
          <p className="muted">A Markdown report for you, and an AGENTS.md directive to drop into your clone for a coding agent. Facts are marked, suggestions are labelled, no commands are invented.</p>
        </div>
        <div className="plan-actions">
          <button className="btn" type="button" onClick={() => download(`${p.fullName.replace('/', '__')}-rescue-plan.md`, plan, 'text/markdown')}>Download Rescue Plan (.md)</button>
          <button className="btn-ghost" type="button" onClick={async () => flash((await copyText(plan)) ? 'Rescue Plan copied' : 'Copy failed: use the download')}>Copy Markdown</button>
          <button className="btn-ghost" type="button" aria-expanded={planOpen} onClick={() => setPlanOpen((o) => !o)}>{planOpen ? 'Hide preview' : 'Preview'}</button>
          <button className="btn-ghost" type="button" onClick={() => download('AGENTS.md', agentDirectiveMarkdown(p, { generatedAt, appUrl: window.location.href }), 'text/markdown')}>Agent directive (AGENTS.md)</button>
          <button className="btn-ghost" type="button" onClick={async () => flash((await copyText(agentDirectiveMarkdown(p, { generatedAt, appUrl: window.location.href }))) ? 'Agent directive copied' : 'Copy failed: use the download')}>Copy directive</button>
          <button className="btn-ghost" type="button" onClick={() => download(`${p.fullName.replace('/', '__')}-free-stack.json`, JSON.stringify(freeStackHandoff(p), null, 2), 'application/json')}>Export for Free Stack</button>
        </div>
        {planOpen && <pre className="plan-preview" tabIndex={0}>{plan}</pre>}
      </section>

      <section>
        <h2>Share</h2>
        <div className="plan-actions">
          <button className="btn-ghost" type="button" onClick={() => downloadShareCard(p, garyLine(p)).catch(() => flash('Could not render the card'))}>Download share card (PNG)</button>
          <a className="btn-ghost" href={`https://x.com/intent/post?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer">Post on X</a>
          <button className="btn-ghost" type="button" onClick={async () => flash((await copyText(window.location.href)) ? 'Link copied' : 'Copy failed')}>Copy link</button>
          <a className="btn-ghost" href={`${APP_REPO}/issues/new?title=${encodeURIComponent(`Report: ${p.fullName}`)}&body=${encodeURIComponent(`Project: ${p.url}\n\nWhat is wrong (broken link, wrong data, should be excluded…):\n`)}`} target="_blank" rel="noreferrer">Report a problem</a>
        </div>
      </section>
      <p role="status" aria-live="polite" className="toast">{msg}</p>

      {similar.length > 0 && (
        <section>
          <h2>Similar projects</h2>
          <div className="grid">{similar.map(({ p: s }) => <ProjectCard key={s.id} p={s} />)}</div>
        </section>
      )}
      <p className="small muted">Last verified {fmtDate(p.meta.verifiedAt)}. <a href={href(projectPath(p.fullName))}>Permalink</a> · {fmtN(p.stars)} stars at collection time.</p>
    </article>
  )
}

function Fact({ k, v, missing }: { k: string; v: string | null; missing?: boolean }) {
  return (
    <>
      <dt>{k}</dt>
      <dd className={v == null ? 'na' : ''}>{v ?? (missing ? 'not collected' : 'none')}</dd>
    </>
  )
}

function Sig({ label, v }: { label: string; v: boolean | null }) {
  return <li className={v == null ? 'sig-na' : v ? 'sig-yes' : 'sig-no'}><span aria-hidden="true">{v == null ? '·' : v ? '✓' : '✗'}</span> {label}<span className="sr-only">: {v == null ? 'not checked' : v ? 'yes' : 'not detected'}</span>{v == null && <span className="muted"> (not checked)</span>}</li>
}
