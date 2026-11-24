/**
 * Core data model for Gary's Repo Rescue.
 *
 * Convention for missing data (see docs/DATA_MODEL.md):
 *  - `null` on a field means "checked, and there is none" ONLY when the field
 *    name is NOT listed in `meta.unavailable`.
 *  - When a field could not be collected (not requested, API error, quota),
 *    its key is listed in `meta.unavailable` and the value is `null`.
 *  - `0` always means a real, observed zero.
 * Never infer a value that was not observed.
 */

export type MaintenanceStatus = 'Active' | 'Low Activity' | 'Dormant' | 'Archived' | 'Stable' | 'Unknown'
export type RevivalDifficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Unknown'
export type LicenseStatus = 'Permissive' | 'Copyleft' | 'Other Restrictions' | 'No Explicit License' | 'Unknown'
export type ConfidenceLevel = 'High' | 'Medium' | 'Low'
export type AnalysisDepth = 'analyzed' | 'indexed'

export type FamilyId =
  | 'abandoned'
  | 'archived-treasure'
  | 'hidden-gem'
  | 'unfinished-idea'
  | 'forgotten-software'
  | 'modernization-candidate'
  | 'fork-opportunity'
  | 'stable-timeless'
  | 'weird-wonderful'
  | 'ai-revival'

export interface Release {
  tag: string
  publishedAt: string | null
  url: string
}

export interface LanguageShare {
  name: string
  share: number // 0..1 of bytes
}

export interface QualitySignals {
  readme: boolean | null
  licenseFile: boolean | null
  docs: boolean | null
  examples: boolean | null
  tests: boolean | null
  ci: boolean | null
  ciProviders: string[]
  contributing: boolean | null
  changelog: boolean | null
  dockerfile: boolean | null
  /** Build / dependency manifests detected at repository root (file names). */
  manifests: string[]
  /** Root entries count (files + dirs). */
  rootEntries: number | null
  /** README analysis (documentation text only). null = README not fetched. */
  readmeBytes: number | null
  installInstructions: boolean | null
  usageSection: boolean | null
  screenshots: boolean | null
  /** README explicitly says the project is deprecated / unmaintained. */
  deprecatedNotice: boolean | null
}

export interface ForkInfo {
  fullName: string
  url: string
  stars: number
  pushedAt: string | null
  archived: boolean
  /** Days the fork was pushed after the original's last push (negative = before). */
  pushedAfterOriginalDays: number | null
}

export interface ForkIntel {
  checked: boolean
  /** Number of forks inspected (top forks by stars). */
  inspected: number
  notable: ForkInfo[]
  /** A fork that looks like an active continuation, if any. Heuristic, not a verdict. */
  possibleSuccessor: string | null
  /** Repositories the README itself points to next to a "moved to / successor / use X instead" phrase. */
  successorHints: { repo: string; snippet: string }[]
}

export interface LicenseInfo {
  spdx: string | null
  name: string | null
  url: string | null
}

/** Raw-ish normalized project facts, produced by the collection pipeline. */
export interface ProjectFacts {
  id: string // "github:owner/name"
  source: 'github'
  owner: string
  name: string
  fullName: string
  description: string | null
  url: string
  homepage: string | null
  pagesEnabled: boolean | null
  topics: string[]
  language: string | null
  languages: LanguageShare[] | null
  createdAt: string
  updatedAt: string
  pushedAt: string | null
  lastCommitAt: string | null
  commitsTotal: number | null
  commits12m: number | null
  latestRelease: Release | null
  archived: boolean
  disabled: boolean
  isTemplate: boolean
  stars: number
  forks: number
  watchers: number | null
  contributors: number | null
  /** What `contributors` counts: GitHub contributors API, or distinct commit authors on the default branch. */
  contributorsBasis: 'github-contributors' | 'commit-authors' | null
  /** Open issues + open PRs as reported by GitHub (always observed). */
  openIssuesAndPrs: number
  openIssues: number | null
  openPrs: number | null
  sizeKb: number | null
  defaultBranch: string | null
  license: LicenseInfo
  quality: QualitySignals
  forkIntel: ForkIntel
  meta: {
    sources: string[]
    strategies: string[]
    firstSeenAt: string
    collectedAt: string
    verifiedAt: string
    depth: AnalysisDepth
    /** Oldest sync date among secondary sources (e.g. ecosyste.ms), when one was used. */
    oldestSourceSync: string | null
    unavailable: string[]
  }
}

export interface ScoreComponent {
  key: string
  label: string
  weight: number
  /** 0..1, or null when no input was available (weight is then redistributed). */
  value: number | null
  notes: string[]
}

export interface RescueScore {
  score: number // 0..100
  components: ScoreComponent[]
  coverage: number // 0..1 share of weight actually computed
}

export interface Confidence {
  score: number // 0..100
  level: ConfidenceLevel
  availability: number
  freshnessDays: number
  notes: string[]
}

export interface Assessment {
  maintenance: MaintenanceStatus
  maintenanceReason: string
  monthsSinceActivity: number | null
  licenseStatus: LicenseStatus
  licenseNote: string
  difficulty: RevivalDifficulty
  difficultyReasons: string[]
  rescue: RescueScore
  confidence: Confidence
  families: FamilyId[]
  collections: string[]
  reasons: string[]
  strengths: string[]
  cautions: string[]
  legacyTech: string[]
}

export interface Project extends ProjectFacts {
  a: Assessment
}

export interface CatalogMeta {
  name: string
  version: string
  generatedAt: string
  referenceDate: string
  /** Date of the first catalog build (used by "Recently Discovered"). */
  baseline: string
  counts: { total: number; analyzed: number; indexed: number }
  sources: { id: string; label: string; url: string; terms: string }[]
  strategies: { id: string; query: string; found: number }[]
  excluded: Record<string, number>
}

export interface Catalog {
  meta: CatalogMeta
  projects: Project[]
}
