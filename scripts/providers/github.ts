/**
 * Enrichment provider backed by per-repository GitHub REST endpoints (full depth: root listing,
 * tests/CI detection, contributors, commits, open PRs, releases, languages, forks).
 * Requires a token allowed to read public repositories (a normal PAT or GITHUB_TOKEN in Actions).
 */
import { detectFromRoot, type RootEntry } from '../../src/core/detect'
import type { GhRepo } from '../../src/core/normalize'
import { analyzeForks } from '../../src/core/forks'
import type { ProjectFacts } from '../../src/core/types'
import { gh } from '../lib/github'
import { enrichReadme } from './readme'

export async function enrichWithGithub(p: ProjectFacts, repo: GhRepo, opt: { maxAgeHours?: number }, now: Date): Promise<ProjectFacts | string> {
  const path = `/repos/${repo.full_name}`
  const unavailable = new Set<string>()
  const yearAgo = new Date(now.getTime() - 365 * 86400000).toISOString()

  const [root, releases, langs, contrib, commits, commits12, prs] = await Promise.all([
    gh<RootEntry[]>(`${path}/contents/`, opt),
    gh<{ tag_name: string; published_at: string | null; html_url: string; draft: boolean }[]>(`${path}/releases?per_page=1`, opt),
    gh<Record<string, number>>(`${path}/languages`, opt),
    gh<unknown[]>(`${path}/contributors?per_page=1&anon=1`, opt),
    gh<{ commit: { committer: { date: string } | null; author: { date: string } | null } }[]>(`${path}/commits?per_page=1`, opt),
    gh<unknown[]>(`${path}/commits?per_page=1&since=${yearAgo}`, opt),
    gh<unknown[]>(`${path}/pulls?state=open&per_page=1`, opt),
  ])

  if (root.status === 404 || root.status === 409 || (Array.isArray(root.data) && root.data.length === 0)) return 'empty-or-unreadable'
  let readmePath: string | null = null
  if (!Array.isArray(root.data)) unavailable.add('quality')
  else {
    readmePath = root.data.find((e) => /^readme(\.|$)/i.test(e.name) && e.type === 'file')?.name ?? null
    const entries = root.data
    let workflows: boolean | null = false
    if (entries.some((e) => e.name === '.github' && e.type === 'dir')) {
      const wf = await gh<RootEntry[]>(`${path}/contents/.github/workflows`, opt)
      workflows = wf.status === 404 ? false : Array.isArray(wf.data) ? wf.data.some((e) => /\.ya?ml$/i.test(e.name)) : null
    }
    p.quality = detectFromRoot(entries, workflows)
    const licFile = entries.find((e) => /^(licen[cs]e|copying|unlicense)(\.|$|-)/i.test(e.name))
    if (licFile) p.license.url = `${repo.html_url}/blob/${repo.default_branch ?? 'HEAD'}/${encodeURIComponent(licFile.name)}`
    if (p.quality.rootEntries != null && p.quality.rootEntries <= 2 && p.quality.manifests.length === 0 && (p.sizeKb ?? 0) < 50) return 'near-empty'
  }

  if (releases.status === 200 && Array.isArray(releases.data)) {
    const r = releases.data[0]
    p.latestRelease = r ? { tag: r.tag_name, publishedAt: r.published_at, url: r.html_url } : null
  } else unavailable.add('latestRelease')

  if (langs.data && typeof langs.data === 'object') {
    const total = Object.values(langs.data).reduce((a, b) => a + b, 0)
    p.languages = total ? Object.entries(langs.data).map(([name, n]) => ({ name, share: Math.round((n / total) * 1000) / 1000 })).slice(0, 8) : []
  } else unavailable.add('languages')

  if (contrib.status === 200) p.contributors = contrib.lastPage ?? (Array.isArray(contrib.data) ? contrib.data.length : 0)
  else if (contrib.status === 204) p.contributors = 0
  else unavailable.add('contributors')

  if (commits.status === 200 && Array.isArray(commits.data)) {
    const c = commits.data[0]
    p.lastCommitAt = c?.commit.committer?.date ?? c?.commit.author?.date ?? null
    p.commitsTotal = commits.lastPage ?? commits.data.length
  } else {
    unavailable.add('lastCommitAt')
    unavailable.add('commitsTotal')
  }
  if (commits12.status === 200 && Array.isArray(commits12.data)) p.commits12m = commits12.lastPage ?? commits12.data.length
  else unavailable.add('commits12m')

  if (prs.status === 200 && Array.isArray(prs.data)) {
    p.openPrs = prs.lastPage ?? prs.data.length
    p.openIssues = Math.max(0, repo.open_issues_count - p.openPrs)
  } else {
    unavailable.add('openPrs')
    unavailable.add('openIssues')
  }

  // Fork intelligence (light): inspect top forks by stars.
  if (repo.forks_count >= 3) {
    const forks = await gh<GhRepo[]>(`${path}/forks?sort=stargazers&per_page=30`, opt)
    if (Array.isArray(forks.data)) {
      p.forkIntel = { ...analyzeForks(forks.data, p.lastCommitAt ?? p.pushedAt ?? p.createdAt, p.stars, now), successorHints: [] }
    } else unavailable.add('forkIntel')
  } else {
    p.forkIntel = { checked: true, inspected: 0, notable: [], possibleSuccessor: null, successorHints: [] }
  }

  await enrichReadme(p, readmePath, unavailable)
  p.watchers = null
  unavailable.add('watchers')
  p.contributorsBasis = p.contributors == null ? null : 'github-contributors'
  p.meta = { ...p.meta, sources: ['github-rest-search', 'github-rest'], depth: 'analyzed', oldestSourceSync: null, unavailable: [...unavailable] }
  return p
}

