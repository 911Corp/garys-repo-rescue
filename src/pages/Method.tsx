import { useCatalog } from '../app/data'
import { COPYLEFT, PERMISSIVE } from '../core/license'
import { MAINTENANCE_RULES as R } from '../core/maintenance'
import { RESCUE_WEIGHTS } from '../core/scoring'
import { COLLECTIONS, FAMILIES } from '../core/taxonomy'
import { fmtDate } from '../core/dates'
import { Jarvis } from '../ui/bits'

const LABELS: Record<string, string> = {
  interest: 'Functional interest: description quality, topics, homepage',
  adoption: 'Adoption signals: stars, forks, contributors (log scales)',
  access: 'Code accessibility: mainstream language, size, standard build manifest',
  documentation: 'Documentation: README (40%), docs folder, examples, CONTRIBUTING, CHANGELOG, install section, screenshots',
  license: 'License: permissive 1, copyleft 0.8, unknown 0.4, restricted 0.3, none 0',
  modernization: 'Modernization potential: time asleep, legacy markers, viable language',
  base: 'Functional base: releases, commit history, active life span',
  maintenance: 'Maintenance signals: tests, CI, more than one contributor',
}

export function Method() {
  const { meta } = useCatalog()
  return (
    <div className="method prose">
      <h1>How Repo Rescue decides</h1>
      <p className="lede">Every label on this site comes from a written rule applied to public metadata. Same data in, same result out. Nothing is run, nothing is tested, and missing data is never counted as a bad result.</p>
      <Jarvis>if a rule looks wrong, it probably is somewhere. the code lives in src/core and has tests.</Jarvis>

      <h2>Rescue Score</h2>
      <p>Apparent potential for reuse or revival, from 0 to 100. A weighted average of eight criteria, each between 0 and 1. When a criterion cannot be computed for a project, it is removed and the remaining weights are scaled up. The project page shows how much of the weight was computable.</p>
      <table className="breakdown"><thead><tr><th scope="col">Criterion</th><th scope="col">Weight</th></tr></thead>
        <tbody>{Object.entries(RESCUE_WEIGHTS).map(([k, w]) => <tr key={k}><th scope="row">{LABELS[k]}</th><td>{Math.round(w * 100)}%</td></tr>)}</tbody></table>
      <p>The Rescue Score is not a quality grade of the authors' work. A brilliant finished tool can score lower than a rough prototype with a clear license.</p>

      <h2>Maintenance status</h2>
      <ul>
        <li><strong>Archived</strong>: the owner archived the repository.</li>
        <li><strong>Active</strong>: last commit within {R.activeMonths} months and at least {R.activeMinCommits12m} commits in 12 months (when known).</li>
        <li><strong>Low Activity</strong>: last commit within {R.lowActivityMonths} months, or recent but sparse.</li>
        <li><strong>Stable</strong>: quiet for more than {R.lowActivityMonths} months, but has a release, at least {R.stableMinCommits} commits, {R.stableMaxOpenIssues} or fewer open issues and is {R.stableMinAgeYears}+ years old. It may just be finished.</li>
        <li><strong>Dormant</strong>: quiet for more than {R.lowActivityMonths} months without the Stable signals.</li>
        <li><strong>Unknown</strong>: no activity date available.</li>
      </ul>
      <p>Inactivity alone is never treated as abandonment.</p>

      <h2>License status</h2>
      <ul>
        <li><strong>Permissive</strong>: {[...PERMISSIVE].slice(0, 12).join(', ')}…</li>
        <li><strong>Copyleft</strong>: {[...COPYLEFT].filter((x) => !x.includes('-only') && !x.includes('-or-later')).join(', ')}</li>
        <li><strong>Other Restrictions</strong>: non-commercial, no-derivatives, source-available (SSPL, BUSL, Commons Clause…) or uncommon licenses.</li>
        <li><strong>No Explicit License</strong>: no license file detected. Public code without a license is not free to reuse.</li>
        <li><strong>Unknown</strong>: a license file exists but was not identified, or license data was not collected.</li>
      </ul>
      <p>Repo Rescue is not legal advice. Always read the license file itself.</p>

      <h2>Revival difficulty</h2>
      <p>Points from repository size (0 to 3), commit history (0 to 3), three or more significant languages (+1), missing README (+2) or large codebase without docs (+1), no root-level tests on a non-trivial repo (+1), 5+ years asleep (+1), legacy tech markers (+1). 0–2 Beginner, 3–4 Intermediate, 5–6 Advanced, 7+ Expert. Unknown when 3 or more inputs are missing.</p>

      <h2>Data confidence</h2>
      <p>Availability of expected fields (60%), freshness of the data (25%, recomputed in your browser against today's date, and against the sync date of secondary sources), and identity quality: description and identified license (15%). High from 75, Medium from 50.</p>

      <h2>Families</h2>
      <dl className="rules">{FAMILIES.map((f) => <div key={f.id}><dt>{f.label}</dt><dd>{f.criteria}</dd></div>)}</dl>

      <h2>Collections</h2>
      <dl className="rules">{COLLECTIONS.map((c) => <div key={c.id}><dt>{c.label}</dt><dd>{c.criteria}</dd></div>)}</dl>

      <h2>Sources</h2>
      <ul>{meta.sources.map((s) => <li key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.label}</a>. {s.terms}.</li>)}
        <li>README text from raw.githubusercontent.com, read only to detect install sections, screenshots and “moved to” notices.</li></ul>
      <p>This catalog was built on {fmtDate(meta.generatedAt)} from {meta.strategies.length} discovery queries. {meta.counts.analyzed} projects were analyzed in depth and {meta.counts.indexed} only indexed from search metadata.</p>
      <details>
        <summary>Discovery queries and exclusions</summary>
        <h3>Excluded candidates</h3>
        <ul>{Object.entries(meta.excluded).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
        <h3>Queries</h3>
        <ul className="small">{meta.strategies.map((s) => <li key={s.id}><code>{s.query}</code> ({s.found})</li>)}</ul>
      </details>

      <h2>Known limits</h2>
      <ul>
        <li>Tests, docs and CI are detected from file names and declared dependencies, not by reading code. “Not detected” is not “absent”.</li>
        <li>GitHub does not expose the date a repository was archived. “Recently Archived” uses the last push as a proxy.</li>
        <li>In this build, fork lists were not available from the data source, so possible successors come only from the README. Always check the fork network.</li>
        <li>Star counts and dates are those of the collection day.</li>
        <li>The catalog covers GitHub only for now. GitLab, Codeberg and others are planned.</li>
      </ul>
    </div>
  )
}
