import { describe, expect, it } from 'vitest'
import { assess, toProject } from '../src/core/assess'
import { dataConfidence } from '../src/core/confidence'
import { detectFromRoot, detectLegacy } from '../src/core/detect'
import { revivalDifficulty } from '../src/core/difficulty'
import { csvEscape, toCSV } from '../src/core/exporters'
import { licenseStatus } from '../src/core/license'
import { maintenanceStatus } from '../src/core/maintenance'
import { exclusionReason, fromSearch, INDEXED_UNAVAILABLE } from '../src/core/normalize'
import { analyzeReadme } from '../src/core/readme'
import { rescuePlanMarkdown } from '../src/core/rescuePlan'
import { RESCUE_WEIGHTS, rescueScore } from '../src/core/scoring'
import { similarity, tokens } from '../src/core/similar'
import { hasAny } from '../src/core/taxonomy'
import { applyFilters, DEFAULT_FILTERS, expandQuery, filtersToQuery, queryToFilters } from '../src/app/search'
import { facts, REF, repo } from './fixtures'

describe('license status', () => {
  it('classifies common SPDX ids', () => {
    expect(licenseStatus({ spdx: 'MIT', name: null, url: null }, true).status).toBe('Permissive')
    expect(licenseStatus({ spdx: 'GPL-3.0', name: null, url: null }, true).status).toBe('Copyleft')
    expect(licenseStatus({ spdx: 'AGPL-3.0', name: null, url: null }, true).status).toBe('Copyleft')
    expect(licenseStatus({ spdx: 'CC-BY-NC-4.0', name: null, url: null }, true).status).toBe('Other Restrictions')
    expect(licenseStatus({ spdx: 'BUSL-1.1', name: null, url: null }, true).status).toBe('Other Restrictions')
  })
  it('never treats a public repo without license as reusable', () => {
    const r = licenseStatus({ spdx: null, name: null, url: null }, false)
    expect(r.status).toBe('No Explicit License')
    expect(r.note).toMatch(/NOT free to reuse/)
  })
  it('distinguishes unidentified license files and uncollected data', () => {
    expect(licenseStatus({ spdx: 'NOASSERTION', name: 'Other', url: null }, true).status).toBe('Unknown')
    expect(licenseStatus({ spdx: null, name: null, url: null }, null).status).toBe('Unknown')
  })
})

describe('maintenance status', () => {
  it('archived wins', () => expect(maintenanceStatus(facts({ archived: true }), REF).status).toBe('Archived'))
  it('recent commits = Active', () => expect(maintenanceStatus(facts({ lastCommitAt: '2026-10-01T00:00:00Z', commits12m: 40 }), REF).status).toBe('Active'))
  it('recent but sparse = Low Activity', () => expect(maintenanceStatus(facts({ lastCommitAt: '2026-10-01T00:00:00Z', commits12m: 3 }), REF).status).toBe('Low Activity'))
  it('inactive with releases, history and few issues = Stable, not abandoned', () => {
    expect(maintenanceStatus(facts(), REF).status).toBe('Stable')
  })
  it('inactive without stability signals = Dormant', () => {
    expect(maintenanceStatus(facts({ latestRelease: null }), REF).status).toBe('Dormant')
  })
  it('uses issues+PRs as an upper bound when issues alone are unknown', () => {
    expect(maintenanceStatus(facts({ openIssues: null, openIssuesAndPrs: 10 }), REF).status).toBe('Stable')
    expect(maintenanceStatus(facts({ openIssues: null, openIssuesAndPrs: 300 }), REF).status).toBe('Dormant')
  })
  it('unknown when there is no date at all', () => {
    expect(maintenanceStatus(facts({ lastCommitAt: null, pushedAt: null }), REF).status).toBe('Unknown')
  })
})

describe('rescue score', () => {
  it('weights sum to 1', () => {
    expect(Object.values(RESCUE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
  })
  it('is deterministic and bounded', () => {
    const a = rescueScore(facts(), REF, { licenseStatus: 'Permissive', maintenance: 'Stable', legacyTech: [] })
    const b = rescueScore(facts(), REF, { licenseStatus: 'Permissive', maintenance: 'Stable', legacyTech: [] })
    expect(a).toEqual(b)
    expect(a.score).toBeGreaterThanOrEqual(0)
    expect(a.score).toBeLessThanOrEqual(100)
    expect(a.coverage).toBe(1)
  })
  it('missing data is skipped, not punished', () => {
    const full = facts()
    const partial = facts({ contributors: null, commitsTotal: null, meta: { ...full.meta, unavailable: ['contributors', 'commitsTotal'] } })
    const s1 = rescueScore(full, REF, { licenseStatus: 'Permissive', maintenance: 'Stable', legacyTech: [] })
    const s2 = rescueScore(partial, REF, { licenseStatus: 'Permissive', maintenance: 'Stable', legacyTech: [] })
    // Contributors (7) and commits (320) are mid-range; dropping them must not collapse the score.
    expect(Math.abs(s1.score - s2.score)).toBeLessThan(8)
  })
  it('no license scores lower than permissive, all else equal', () => {
    const p = facts()
    const ok = rescueScore(p, REF, { licenseStatus: 'Permissive', maintenance: 'Stable', legacyTech: [] }).score
    const none = rescueScore(p, REF, { licenseStatus: 'No Explicit License', maintenance: 'Stable', legacyTech: [] }).score
    expect(ok - none).toBe(15)
  })
  it('indexed projects still get a score with partial coverage', () => {
    const idx = fromSearch(repo(), ['x'], REF.toISOString(), REF.toISOString())
    const s = rescueScore(idx, REF, { licenseStatus: 'Permissive', maintenance: 'Dormant', legacyTech: [] })
    expect(s.coverage).toBeLessThan(1)
    expect(s.score).toBeGreaterThan(0)
  })
})

describe('revival difficulty', () => {
  it('small documented project is Beginner', () => {
    expect(revivalDifficulty(facts({ sizeKb: 200, commitsTotal: 40 }), REF, []).level).toBe('Beginner')
  })
  it('huge legacy project is Expert', () => {
    const p = facts({ sizeKb: 200_000, commitsTotal: 9000, lastCommitAt: '2014-01-01T00:00:00Z', quality: { ...facts().quality, readme: false, tests: false } })
    expect(revivalDifficulty(p, REF, ['CoffeeScript']).level).toBe('Expert')
  })
  it('Unknown when inputs are missing', () => {
    const idx = fromSearch(repo(), ['x'], REF.toISOString(), REF.toISOString())
    expect(revivalDifficulty(idx, REF, []).level).toBe('Unknown')
  })
})

describe('data confidence', () => {
  it('high for fresh, complete data', () => expect(dataConfidence(facts(), REF).level).toBe('High'))
  it('low for stale indexed data', () => {
    const idx = fromSearch(repo(), ['x'], '2025-01-01T00:00:00Z', '2025-01-01T00:00:00Z')
    expect(idx.meta.unavailable).toEqual(INDEXED_UNAVAILABLE)
    expect(dataConfidence(idx, REF).level).toBe('Low')
  })
  it('decays with time', () => {
    const p = facts()
    expect(dataConfidence(p, new Date('2027-06-01')).score).toBeLessThan(dataConfidence(p, REF).score)
  })
})

describe('detection', () => {
  it('reads quality signals from root entries', () => {
    const q = detectFromRoot(
      [{ name: 'README.md', type: 'file' }, { name: 'LICENSE', type: 'file' }, { name: 'docs', type: 'dir' }, { name: 'tests', type: 'dir' }, { name: '.travis.yml', type: 'file' }, { name: 'package.json', type: 'file' }, { name: 'bower.json', type: 'file' }],
      false,
    )
    expect(q).toMatchObject({ readme: true, licenseFile: true, docs: true, tests: true, ci: true, ciProviders: ['Travis CI'] })
    expect(q.manifests).toEqual(['package.json', 'bower.json'])
  })
  it('detects legacy tech from facts only', () => {
    expect(detectLegacy({ langs: ['CoffeeScript'], primary: 'JavaScript', topics: [], manifests: ['bower.json'], ci: [], description: '' })).toEqual(['CoffeeScript', 'Bower'])
    expect(detectLegacy({ langs: ['TypeScript'], primary: 'TypeScript', topics: [], manifests: [], ci: [], description: '' })).toEqual([])
  })
  it('finds explicit successor notices in a README', () => {
    const r = analyzeReadme('# Old\n\n> This project has moved to https://github.com/newowner/newrepo\n\n## Installation\n\nnpm i', 'old/old')
    expect(r.successorHints[0].repo).toBe('newowner/newrepo')
    expect(r.hasInstall).toBe(true)
    const none = analyzeReadme('# Thing\nSee https://github.com/someone/lib for the parser we use.', 'me/thing')
    expect(none.successorHints).toEqual([])
  })
})

describe('exclusions', () => {
  it('drops forks, lists, homework, harmful tools and empty descriptions', () => {
    expect(exclusionReason(repo({ fork: true }))).toBe('fork')
    expect(exclusionReason(repo({ name: 'awesome-selfhosted', description: 'A curated list of self-hosted software' }))).toBe('list-not-software')
    expect(exclusionReason(repo({ description: 'My homework for CS101 course' }))).toBe('learning-material')
    expect(exclusionReason(repo({ description: 'Simple keygen for windows' }))).toBe('harmful-or-abusive')
    expect(exclusionReason(repo({ description: null }))).toBe('no-description')
    expect(exclusionReason(repo())).toBeNull()
  })
})

describe('classification', () => {
  it('keyword matching respects word boundaries', () => {
    const p = facts({}, { description: 'Retro emulator for the Game Boy' })
    expect(hasAny(p, ['game boy'])).toBe(true)
    expect(hasAny(p, ['ai'])).toBe(false) // "retro" contains no standalone "ai"
  })
  it('stable projects are not labelled abandoned', () => {
    const a = assess(facts(), REF, REF.toISOString())
    expect(a.maintenance).toBe('Stable')
    expect(a.families).toContain('stable-timeless')
    expect(a.families).not.toContain('abandoned')
  })
  it('no-license projects never become fork opportunities', () => {
    const p = facts({ license: { spdx: null, name: null, url: null }, quality: { ...facts().quality, licenseFile: false }, latestRelease: null })
    const a = assess(p, REF, REF.toISOString())
    expect(a.licenseStatus).toBe('No Explicit License')
    expect(a.families).not.toContain('fork-opportunity')
    expect(a.cautions.join(' ')).toMatch(/cannot legally reuse/)
  })
  it('a README successor blocks the fork-opportunity family', () => {
    const p = facts({ latestRelease: null, forkIntel: { checked: true, inspected: 0, notable: [], possibleSuccessor: null, successorHints: [{ repo: 'x/y', snippet: 'moved to' }] } })
    expect(assess(p, REF, REF.toISOString()).families).not.toContain('fork-opportunity')
  })
})

describe('rescue plan', () => {
  it('never invents install commands and flags unchecked data', () => {
    const md = rescuePlanMarkdown(toProject(facts({ quality: { ...facts().quality, docs: null }, meta: { ...facts().meta, unavailable: ['quality.docs'] } }), REF, REF.toISOString()), { generatedAt: REF.toISOString() })
    expect(md).toContain('# Rescue Plan: alice/bookmarkr')
    expect(md).toContain('Docs folder: not checked')
    expect(md).not.toMatch(/npm (install|run|start)/)
    expect(md).toContain('read the `scripts` section of package.json')
  })
})

describe('search helpers', () => {
  it('expands synonyms and detects languages', () => {
    const e = expandQuery('a self-hosted bookmark manager in rust')
    expect(e.langs).toEqual(['Rust'])
    expect(e.terms).toContain('bookmarks')
  })
  it('filters round-trip through the URL', () => {
    const f = { ...DEFAULT_FILTERS, lang: ['Go', 'Rust'], minStars: 100, archived: 'yes' as const, docs: true, sort: 'stars' as const }
    expect(queryToFilters(filtersToQuery(f))).toEqual(f)
  })
  it('applies combined filters', () => {
    const p = toProject(facts(), REF, REF.toISOString())
    expect(applyFilters([p], { ...DEFAULT_FILTERS, license: ['Permissive'], inactiveYears: 5 }, REF)).toHaveLength(1)
    expect(applyFilters([p], { ...DEFAULT_FILTERS, archived: 'yes' }, REF)).toHaveLength(0)
  })
  it('similarity is symmetric and 1 for identical', () => {
    const p = toProject(facts(), REF, REF.toISOString())
    const q = toProject(facts({}, { full_name: 'bob/links', name: 'links', description: 'Bookmark manager', topics: ['bookmarks'] }), REF, REF.toISOString())
    expect(similarity(tokens(p), tokens(p))).toBe(1)
    expect(similarity(tokens(p), tokens(q))).toBeCloseTo(similarity(tokens(q), tokens(p)))
  })
})

describe('exports', () => {
  it('escapes CSV correctly', () => {
    expect(csvEscape('a,"b"')).toBe('"a,""b"""')
    const csv = toCSV([toProject(facts(), REF, REF.toISOString())])
    expect(csv.split('\n')[0]).toMatch(/^repo,url,description/)
  })
})

import { analyzeForks, type RawFork } from '../src/core/forks'

describe('fork intelligence', () => {
  const now = new Date('2026-11-24T00:00:00Z')
  const fork = (name: string, stars: number, pushed: string | null, archived = false): RawFork => ({
    full_name: name, html_url: `https://github.com/${name}`, stargazers_count: stars, pushed_at: pushed, archived,
  })

  it('ignores forks pushed before or shortly after the original', () => {
    const r = analyzeForks([fork('a/x', 50, '2022-01-10T00:00:00Z'), fork('b/x', 50, '2021-06-01T00:00:00Z')], '2022-01-01T00:00:00Z', 1000, now)
    expect(r.inspected).toBe(2)
    expect(r.notable).toHaveLength(0)
    expect(r.possibleSuccessor).toBeNull()
  })

  it('flags an active, starred fork as possible successor', () => {
    const r = analyzeForks([fork('a/x', 40, '2026-10-01T00:00:00Z'), fork('b/x', 3, '2026-09-01T00:00:00Z')], '2022-01-01T00:00:00Z', 1000, now)
    expect(r.notable.map((f) => f.fullName)).toEqual(['a/x', 'b/x'])
    expect(r.possibleSuccessor).toBe('a/x')
  })

  it('never picks archived or stale forks as successor', () => {
    const r = analyzeForks([fork('a/x', 400, '2026-10-01T00:00:00Z', true), fork('b/x', 400, '2024-01-01T00:00:00Z')], '2022-01-01T00:00:00Z', 1000, now)
    expect(r.notable.map((f) => f.fullName)).toEqual(['b/x'])
    expect(r.possibleSuccessor).toBeNull()
  })

  it('requires stars relative to the original', () => {
    const r = analyzeForks([fork('a/x', 15, '2026-10-01T00:00:00Z')], '2022-01-01T00:00:00Z', 10000, now)
    expect(r.possibleSuccessor).toBeNull()
  })
})
