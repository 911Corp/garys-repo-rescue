import { z } from 'zod'

/** Runtime schema of a catalog entry. Used by `npm run validate` and in CI before publishing data. */
const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date')
const nb = z.boolean().nullable()

export const ProjectSchema = z.object({
  id: z.string().regex(/^github:[^/]+\/[^/]+$/),
  source: z.literal('github'),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().regex(/^[^/]+\/[^/]+$/),
  description: z.string().nullable(),
  url: z.string().regex(/^https:\/\/github\.com\/[^/]+\/[^/]+$/),
  homepage: z.string().url().nullable(),
  pagesEnabled: nb,
  topics: z.array(z.string()),
  language: z.string().nullable(),
  languages: z.array(z.object({ name: z.string(), share: z.number().min(0).max(1) })).nullable(),
  createdAt: iso,
  updatedAt: iso,
  pushedAt: iso.nullable(),
  lastCommitAt: iso.nullable(),
  commitsTotal: z.number().int().nonnegative().nullable(),
  commits12m: z.number().int().nonnegative().nullable(),
  latestRelease: z.object({ tag: z.string(), publishedAt: iso.nullable(), url: z.string().url() }).nullable(),
  archived: z.boolean(),
  disabled: z.literal(false),
  isTemplate: z.boolean(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  watchers: z.number().nullable(),
  contributors: z.number().int().nonnegative().nullable(),
  contributorsBasis: z.enum(['github-contributors', 'commit-authors']).nullable(),
  openIssuesAndPrs: z.number().int().nonnegative(),
  openIssues: z.number().int().nonnegative().nullable(),
  openPrs: z.number().int().nonnegative().nullable(),
  sizeKb: z.number().nonnegative().nullable(),
  defaultBranch: z.string().nullable(),
  license: z.object({ spdx: z.string().nullable(), name: z.string().nullable(), url: z.string().url().nullable() }),
  quality: z.object({
    readme: nb, licenseFile: nb, docs: nb, examples: nb, tests: nb, ci: nb, ciProviders: z.array(z.string()), contributing: nb, changelog: nb, dockerfile: nb,
    manifests: z.array(z.string()), rootEntries: z.number().nullable(), readmeBytes: z.number().nullable(), installInstructions: nb, usageSection: nb, screenshots: nb, deprecatedNotice: nb,
  }),
  forkIntel: z.object({
    checked: z.boolean(), inspected: z.number(), possibleSuccessor: z.string().nullable(),
    notable: z.array(z.object({ fullName: z.string(), url: z.string().url(), stars: z.number(), pushedAt: iso.nullable(), archived: z.boolean(), pushedAfterOriginalDays: z.number().nullable() })),
    successorHints: z.array(z.object({ repo: z.string(), snippet: z.string() })),
  }),
  meta: z.object({
    sources: z.array(z.string()).min(1), strategies: z.array(z.string()).min(1), firstSeenAt: iso, collectedAt: iso, verifiedAt: iso,
    depth: z.enum(['analyzed', 'indexed']), oldestSourceSync: iso.nullable(), unavailable: z.array(z.string()),
  }),
  a: z.object({
    maintenance: z.enum(['Active', 'Low Activity', 'Dormant', 'Archived', 'Stable', 'Unknown']),
    licenseStatus: z.enum(['Permissive', 'Copyleft', 'Other Restrictions', 'No Explicit License', 'Unknown']),
    difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Unknown']),
    rescue: z.object({ score: z.number().int().min(0).max(100), coverage: z.number().min(0).max(1), components: z.array(z.object({ key: z.string(), value: z.number().min(0).max(1).nullable() }).passthrough()) }),
    confidence: z.object({ score: z.number().min(0).max(100), level: z.enum(['High', 'Medium', 'Low']) }).passthrough(),
    families: z.array(z.string()),
    collections: z.array(z.string()),
  }).passthrough(),
})

export const CatalogSchema = z.object({
  meta: z.object({ generatedAt: iso, referenceDate: iso, baseline: iso, counts: z.object({ total: z.number(), analyzed: z.number(), indexed: z.number() }) }).passthrough(),
  projects: z.array(ProjectSchema),
})
