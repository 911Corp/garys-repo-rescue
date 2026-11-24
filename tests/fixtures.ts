import { fromSearch, type GhRepo } from '../src/core/normalize'
import type { ProjectFacts } from '../src/core/types'

export const REF = new Date('2026-11-24T00:00:00Z')

export function repo(over: Partial<GhRepo> = {}): GhRepo {
  return {
    full_name: 'alice/bookmarkr',
    name: 'bookmarkr',
    owner: { login: 'alice' },
    description: 'A self-hosted bookmark manager with tags and full-text search',
    html_url: 'https://github.com/alice/bookmarkr',
    homepage: null,
    topics: ['self-hosted', 'bookmarks'],
    language: 'JavaScript',
    created_at: '2016-03-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    pushed_at: '2020-05-01T00:00:00Z',
    archived: false,
    disabled: false,
    fork: false,
    is_template: false,
    mirror_url: null,
    stargazers_count: 420,
    forks_count: 40,
    open_issues_count: 12,
    size: 3000,
    default_branch: 'main',
    license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT', url: null },
    ...over,
  }
}

/** An "analyzed" project with all quality signals known. */
export function facts(over: Partial<ProjectFacts> = {}, r: Partial<GhRepo> = {}): ProjectFacts {
  const base = fromSearch(repo(r), ['topic-dormant:self-hosted'], REF.toISOString(), REF.toISOString())
  return {
    ...base,
    lastCommitAt: '2020-04-30T00:00:00Z',
    commitsTotal: 320,
    commits12m: 0,
    latestRelease: { tag: 'v1.2.0', publishedAt: '2019-11-01T00:00:00Z', url: 'https://github.com/alice/bookmarkr/releases/tag/v1.2.0' },
    contributors: 7,
    contributorsBasis: 'commit-authors',
    openIssues: 9,
    openPrs: 3,
    languages: [{ name: 'JavaScript', share: 0.8 }, { name: 'CSS', share: 0.2 }],
    quality: {
      readme: true, licenseFile: true, docs: false, examples: false, tests: true, ci: false, ciProviders: [], contributing: false, changelog: true,
      dockerfile: true, manifests: ['package.json'], rootEntries: 14, readmeBytes: 4000, installInstructions: true, usageSection: true, screenshots: true, deprecatedNotice: false,
    },
    forkIntel: { checked: true, inspected: 10, notable: [], possibleSuccessor: null, successorHints: [] },
    ...over,
    meta: { ...base.meta, depth: 'analyzed', unavailable: ['watchers'], ...(over.meta ?? {}) },
  }
}
