# Data model

Source of truth: `src/core/types.ts` (TypeScript) and `src/core/schema.ts` (runtime validation with zod).

## Missing data vs zero vs none

This is the most important rule of the catalog.

| Value | Meaning |
|---|---|
| `0` | Observed zero (e.g. 0 commits in the last 12 months). |
| `null` and the field **is not** in `meta.unavailable` | Observed absence (e.g. `latestRelease: null` = no release published). |
| `null` and the field **is** in `meta.unavailable` | Not collected (source did not provide it, error, quota). Displayed as "not collected". |
| quality signal `false` | Looked for and **not detected** where we look. Not proof of absence. |
| quality signal `null` | Not checked. |

`npm run validate` fails if a field marked unavailable carries a value.

## Project

| Group | Fields |
|---|---|
| Identification | `id` (`github:owner/name`, lowercase), `owner`, `name`, `fullName`, `description`, `url`, `homepage`, `pagesEnabled`, `topics`, `language`, `languages[]` |
| Activity | `createdAt`, `updatedAt`, `pushedAt`, `lastCommitAt`, `commitsTotal`, `commits12m`, `latestRelease`, `archived`, `disabled` |
| Adoption | `stars`, `forks`, `contributors` + `contributorsBasis`, `openIssuesAndPrs`, `openIssues`, `openPrs` |
| Technical quality | `sizeKb`, `quality.{readme, licenseFile, docs, examples, tests, ci, ciProviders, contributing, changelog, dockerfile, manifests, rootEntries, readmeBytes, installInstructions, usageSection, screenshots, deprecatedNotice}` |
| License | `license.{spdx, name, url}` (url only when the actual license file was seen) |
| Forks | `forkIntel.{checked, inspected, notable[], possibleSuccessor, successorHints[]}` |
| Internal metadata | `meta.{sources, strategies, firstSeenAt, collectedAt, verifiedAt, depth, oldestSourceSync, unavailable}` |
| Assessment (computed) | `a.{maintenance, maintenanceReason, monthsSinceActivity, licenseStatus, licenseNote, difficulty, difficultyReasons, rescue, confidence, families, collections, reasons, strengths, cautions, legacyTech}` |

`meta.depth`: `analyzed` (enriched by a provider) or `indexed` (search metadata only). The UI shows the difference and the data confidence reflects it.

`contributorsBasis`: `github-contributors` (GitHub contributors API) or `commit-authors` (distinct commit authors on the default branch, from ecosyste.ms). They are not the same number, and the UI labels them differently.

## Catalog meta

`generatedAt`, `referenceDate` (date used for "months since activity"), `baseline` (first build, used by "Recently Discovered"), `counts`, `sources` (with terms), `strategies` (query + results), `excluded` (counts per exclusion reason).
