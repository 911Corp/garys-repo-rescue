/**
 * Enrichment provider backed by ecosyste.ms (open data, CC BY-SA 4.0, no key needed).
 * Used when per-repository GitHub REST endpoints are not reachable with the current token.
 *
 * What it provides: README/CHANGELOG/CONTRIBUTING/LICENSE presence, total commits & committers,
 * past-year commits, latest release, dependency manifests (incl. GitHub Actions workflows).
 * What it does NOT provide: root directory listing (docs/, examples/), open PR count, last commit date, forks.
 * Those fields are marked unavailable, never guessed.
 */
import type { ProjectFacts, QualitySignals } from '../../src/core/types'
import type { GhRepo } from '../../src/core/normalize'
import { MANIFESTS } from '../../src/core/detect'
import { gh } from '../lib/github'
import { enrichReadme } from './readme'

const REPOS = 'https://repos.ecosyste.ms/api/v1/hosts/GitHub/repositories/'
const COMMITS = 'https://commits.ecosyste.ms/api/v1/hosts/GitHub/repositories/'

interface EcoRepo {
  last_synced_at: string | null
  metadata?: { files?: Record<string, string | null> }
  commit_stats?: { total_commits: number; total_committers: number } | null
}
interface EcoCommits { total_commits: number | null; total_committers: number | null; past_year_total_commits: number | null; last_synced_at: string | null }
interface EcoRelease { tag_name: string; published_at: string | null; html_url?: string; draft: boolean; prerelease: boolean }
interface EcoManifest { ecosystem: string; filepath: string; kind: string; dependencies?: { package_name: string; kind: string | null; direct: boolean }[] }

/** Test frameworks that, when declared as a dependency, indicate an automated test suite. */
export const TEST_FRAMEWORKS = new Set([
  'jest', 'mocha', 'vitest', 'ava', 'tap', 'tape', 'jasmine', 'karma', 'qunit', 'cypress', '@playwright/test', 'playwright', 'uvu', 'chai',
  'pytest', 'nose', 'nose2', 'unittest2', 'hypothesis', 'tox', 'rspec', 'rspec-core', 'minitest', 'test-unit', 'phpunit/phpunit', 'pestphp/pest',
  'junit', 'junit:junit', 'org.junit.jupiter:junit-jupiter', 'org.junit.jupiter:junit-jupiter-api', 'org.testng:testng', 'testify', 'github.com/stretchr/testify',
  'xunit', 'nunit', 'mstest.testframework', 'catch2', 'gtest', 'googletest', 'proptest', 'criterion', 'quickcheck', 'busted', 'exunit', 'hspec', 'tasty',
])

const enc = (fullName: string) => encodeURIComponent(fullName)

export async function enrichWithEcosystems(p: ProjectFacts, repo: GhRepo, opt: { maxAgeHours?: number }): Promise<ProjectFacts | string> {
  const unavailable = new Set<string>(['lastCommitAt', 'openPrs', 'openIssues', 'forkIntel', 'watchers', 'quality.docs', 'quality.examples', 'quality.rootEntries'])
  const name = enc(repo.full_name)
  const [r, c, rel, man] = await Promise.all([
    gh<EcoRepo>(`${REPOS}${name}`, opt),
    gh<EcoCommits>(`${COMMITS}${name}`, opt),
    gh<EcoRelease[]>(`${REPOS}${name}/releases?per_page=5`, opt),
    gh<EcoManifest[]>(`${REPOS}${name}/manifests`, opt),
  ])
  if (r.status === 404 || !r.data) return 'not-in-secondary-source'
  const syncs: string[] = []
  if (r.data.last_synced_at) syncs.push(r.data.last_synced_at)

  // Metadata files.
  const files = r.data.metadata?.files
  const manifests = Array.isArray(man.data) ? man.data : null
  if (!manifests) unavailable.add('manifests')
  const rootManifestNames = (manifests ?? []).map((m) => m.filepath).filter((f) => !f.includes('/') && (MANIFESTS.includes(f) || /\.(csproj|sln|cabal|gemspec)$/i.test(f)))
  const ciFromActions = (manifests ?? []).some((m) => m.ecosystem === 'actions' && m.filepath.startsWith('.github/workflows/'))
  const testDep = (manifests ?? []).some((m) => (m.dependencies ?? []).some((d) => d.direct !== false && TEST_FRAMEWORKS.has(d.package_name.toLowerCase())))
  const testPath = (manifests ?? []).some((m) => /(^|\/)(tests?|spec)\//i.test(m.filepath) || /requirements[-_]?(test|dev)/i.test(m.filepath))
  const docker = (manifests ?? []).some((m) => m.ecosystem === 'docker' || /dockerfile|docker-compose/i.test(m.filepath))
  const hasManifests = (manifests?.length ?? 0) > 0

  const quality: QualitySignals = {
    readme: files ? !!files.readme : null,
    licenseFile: files ? !!files.license : null,
    docs: null,
    examples: null,
    // "false" here means "not detected from declared dependencies", see docs/SCORING.md.
    tests: hasManifests ? testDep || testPath : null,
    ci: ciFromActions ? true : hasManifests ? false : null,
    ciProviders: ciFromActions ? ['GitHub Actions'] : [],
    contributing: files ? !!files.contributing : null,
    changelog: files ? !!files.changelog : null,
    dockerfile: hasManifests ? docker : null,
    manifests: [...new Set(rootManifestNames)],
    rootEntries: null,
    readmeBytes: null,
    installInstructions: null,
    usageSection: null,
    screenshots: null,
    deprecatedNotice: null,
  }
  if (!files) unavailable.add('quality')
  p.quality = quality
  if (files?.license) p.license.url = `${repo.html_url}/blob/${repo.default_branch ?? 'HEAD'}/${files.license.split('/').map(encodeURIComponent).join('/')}`

  // Commits.
  if (c.data && c.data.total_commits != null) {
    p.commitsTotal = c.data.total_commits
    p.commits12m = c.data.past_year_total_commits ?? null
    p.contributors = c.data.total_committers ?? null
    p.contributorsBasis = p.contributors == null ? null : 'commit-authors'
    if (c.data.last_synced_at) syncs.push(c.data.last_synced_at)
    if (p.commits12m == null) unavailable.add('commits12m')
  } else if (r.data.commit_stats) {
    p.commitsTotal = r.data.commit_stats.total_commits
    p.contributors = r.data.commit_stats.total_committers
    p.contributorsBasis = 'commit-authors'
    unavailable.add('commits12m')
  } else {
    unavailable.add('commitsTotal')
    unavailable.add('commits12m')
    unavailable.add('contributors')
  }

  // Releases.
  if (Array.isArray(rel.data)) {
    const best = rel.data.filter((x) => !x.draft).sort((a, b) => Date.parse(b.published_at ?? '0') - Date.parse(a.published_at ?? '0'))[0]
    p.latestRelease = best ? { tag: best.tag_name, publishedAt: best.published_at, url: `${repo.html_url}/releases/tag/${encodeURIComponent(best.tag_name)}` } : null
  } else unavailable.add('latestRelease')

  p.languages = null
  unavailable.add('languages')
  p.forkIntel = { checked: false, inspected: 0, notable: [], possibleSuccessor: null, successorHints: [] }
  await enrichReadme(p, files?.readme, unavailable)
  const oldest = syncs.sort()[0] ?? null
  p.meta = { ...p.meta, sources: ['github-rest-search', 'ecosyste.ms'], depth: 'analyzed', oldestSourceSync: oldest, unavailable: [...unavailable] }
  return p
}
