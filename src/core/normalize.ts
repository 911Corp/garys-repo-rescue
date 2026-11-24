import { UNKNOWN_QUALITY } from './detect'
import type { ProjectFacts } from './types'

/** Subset of a GitHub REST "repository" object (search results and /repos/{o}/{r}). */
export interface GhRepo {
  full_name: string
  name: string
  owner: { login: string }
  description: string | null
  html_url: string
  homepage: string | null
  has_pages?: boolean
  topics?: string[]
  language: string | null
  created_at: string
  updated_at: string
  pushed_at: string | null
  archived: boolean
  disabled: boolean
  fork: boolean
  is_template?: boolean
  mirror_url?: string | null
  stargazers_count: number
  forks_count: number
  watchers_count?: number
  subscribers_count?: number
  open_issues_count: number
  size: number
  default_branch?: string
  license: { key: string; name: string; spdx_id: string | null; url: string | null } | null
}

export const INDEXED_UNAVAILABLE = ['lastCommitAt', 'commitsTotal', 'commits12m', 'latestRelease', 'contributors', 'openPrs', 'openIssues', 'languages', 'quality', 'forkIntel', 'watchers']

/** Normalizes a search-result repository into ProjectFacts with depth "indexed". */
export function fromSearch(r: GhRepo, strategies: string[], now: string, firstSeenAt: string): ProjectFacts {
  const homepage = r.homepage && /^https?:\/\//i.test(r.homepage.trim()) ? r.homepage.trim() : null
  return {
    id: `github:${r.full_name.toLowerCase()}`,
    source: 'github',
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description?.trim() || null,
    url: r.html_url,
    homepage,
    pagesEnabled: r.has_pages ?? null,
    topics: r.topics ?? [],
    language: r.language,
    languages: null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pushedAt: r.pushed_at,
    lastCommitAt: null,
    commitsTotal: null,
    commits12m: null,
    latestRelease: null,
    archived: r.archived,
    disabled: r.disabled,
    isTemplate: !!r.is_template,
    stars: r.stargazers_count,
    forks: r.forks_count,
    watchers: null,
    contributors: null,
    contributorsBasis: null,
    openIssuesAndPrs: r.open_issues_count,
    openIssues: null,
    openPrs: null,
    sizeKb: r.size,
    defaultBranch: r.default_branch ?? null,
    license: {
      spdx: r.license?.spdx_id ?? null,
      name: r.license?.name ?? null,
      url: null, // set to the actual license file during deep analysis, never guessed
    },
    quality: { ...UNKNOWN_QUALITY },
    forkIntel: { checked: false, inspected: 0, notable: [], possibleSuccessor: null, successorHints: [] },
    meta: {
      sources: ['github-rest-search'],
      strategies,
      firstSeenAt,
      collectedAt: now,
      verifiedAt: now,
      depth: 'indexed',
      oldestSourceSync: null,
      unavailable: [...INDEXED_UNAVAILABLE],
    },
  }
}

/** Exclusion rules. Returns a reason string when the repo should be excluded. Documented in docs/CLASSIFICATION.md. */
const EXCLUDE_PATTERNS: [RegExp, string][] = [
  [/\bawesome\b|curated list|list of (resources|links|tools)|^a? ?collection of (links|resources)/i, 'list-not-software'],
  [/\bdotfiles?\b/i, 'dotfiles'],
  [/\b(homework|assignment|coursework|course project|bootcamp|leetcode|hackerrank|interview questions|exercises? for|cheat ?sheet|my first|learning \w+ by|tutorial series|course materials?)\b/i, 'learning-material'],
  [/\b(keygen|crack(ed|er)?|cheat(s|ing)? for|aimbot|ddos|botnet|ransomware|stealer|rat\b|exploit kit|phishing|spam(mer|bot)|red ?team(ing|ers)?|c2 (framework|server)|command and control|malware|payloads?|exploits?|pentest(ing)? (tool|framework)|carding|bypass (paywall|drm)|account (generator|checker))\b/i, 'harmful-or-abusive'],
  [/\b(nsfw|porn|hentai|xxx|onlyfans)\b/i, 'adult'],
  [/watermark ?remov|去水印|remove watermarks?/i, 'harmful-or-abusive'],
  [/\b(resume|cv|portfolio website|personal (website|blog|homepage))\b/i, 'personal-site'],
  [/\bmirror of\b|\bunofficial mirror\b|\bread-?only mirror\b/i, 'mirror'],
]

export function exclusionReason(r: GhRepo): string | null {
  if (r.fork) return 'fork'
  if (r.disabled) return 'disabled'
  if (r.mirror_url) return 'mirror'
  if (r.is_template) return 'template'
  if (!r.description || r.description.trim().length < 12) return 'no-description'
  if (r.stargazers_count < 30) return 'too-little-signal'
  if (r.size === 0) return 'empty'
  const text = `${r.name} ${r.description ?? ''} ${(r.topics ?? []).join(' ')}`
  for (const [re, reason] of EXCLUDE_PATTERNS) if (re.test(text)) return reason
  if ((r.topics ?? []).some((t) => ['awesome', 'awesome-list', 'dotfiles', 'homework', 'leetcode', 'tutorial', 'course', 'list'].includes(t))) return 'list-or-learning'
  return null
}

/** Cheap pre-ranking from search metadata, used to choose which candidates get deep analysis. */
export function preRank(r: GhRepo): number {
  const stars = Math.log10(Math.max(r.stargazers_count, 1))
  const forks = Math.log10(Math.max(r.forks_count, 1)) * 0.5
  const desc = Math.min((r.description?.length ?? 0) / 80, 1)
  const topics = Math.min((r.topics?.length ?? 0) / 5, 1) * 0.5
  const lic = r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? 0.6 : r.license ? 0.3 : 0
  const home = r.homepage ? 0.3 : 0
  return stars + forks + desc + topics + lic + home
}
