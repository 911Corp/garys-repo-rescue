# Preliminary study

Date: November 2026. Goal: understand what already exists for discovering open source projects, what each tool does not do, and where Repo Rescue can be different.

## Existing tools

| Tool | What it does well | What it does not do (for our use case) |
|---|---|---|
| **GitHub Explore / Trending** | Surfaces what is popular *right now*. | Biased to activity and novelty: by design it never shows dormant or archived projects. |
| **GitHub Advanced Search** | Powerful qualifiers (`archived:`, `pushed:<`, `stars:`, `topic:`, `license:`). | Returns at most 1,000 results per query, no notion of "revival potential", no explanation, no license interpretation, no plan. It is the raw material, not the product. |
| **GitHub Topics** | Community taxonomy. | Uneven tagging; many old projects have no topics at all. |
| **Awesome Lists** | Human curation, high signal. | Static, rarely pruned, no maintenance status, no license status, link rot. Mostly lists of *active* tools. |
| **Libraries.io** (Tidelift) | Package metadata across ~30 package managers, SourceRank, dependents. Data CC BY-SA 4.0. | Package-centric: apps that are not published packages are invisible. API key required, ~60 req/min. |
| **ecosyste.ms** | Open data on hundreds of millions of repositories and millions of packages: metadata files, commit stats, releases, dependency manifests. CC BY-SA 4.0, generous anonymous rate limit (5,000/h observed). | Infrastructure, not a discovery UX. No "is this worth reviving" judgement. No fork listing. |
| **Open Hub** (Black Duck, ex-Ohloh) | Historical code metrics (lines of code, contributors per month), still online. | Proprietary content license, aging crawler, small active community, not oriented to reuse. |
| **Software Heritage** | Archive of essentially all public source code, permanent. | Preservation, not discovery: search is by URL/origin, no quality or reuse signals. |
| **SourceForge / Codeberg / GitLab** | Other forges with their own search. | Same limits as GitHub search, different APIs; useful later as additional sources. |
| **Repo health tools** (OpenSSF Scorecard, CHAOSS/Augur, "is it maintained" badges) | Measure maintenance and security practices. | Built to judge *dependencies you already use*, and they equate inactivity with risk. |

## Gaps Repo Rescue fills

1. **Dormant ≠ dead.** Every tool above treats inactivity as a negative. Repo Rescue separates *Dormant* from *Stable* (finished software) and treats both as opportunities.
2. **Reuse, legally.** No discovery tool explains in plain words what a license allows, nor warns that a public repo without license is not reusable.
3. **Successors first.** Before recommending a revival, check whether someone already continued it (active forks, "moved to" notices in the README) and recommend contributing there.
4. **From discovery to action.** A Rescue Plan in Markdown that a human or a coding agent can execute, with facts and hypotheses clearly separated.
5. **Explainable scores.** Every label is a written rule; the method page shows weights and thresholds.

## APIs, quotas and reuse (observed in this build)

- **GitHub REST search**: 30 requests/min authenticated, max 1,000 results per query (10 pages of 100). We run ~220 narrow queries instead of a few broad ones.
- **GitHub REST repository endpoints**: 5,000 requests/hour for a personal token (15,000 for some app tokens), ~1,000/hour for `GITHUB_TOKEN` in Actions. Conditional requests (`If-None-Match`) returning 304 do not count against the primary limit: the collector caches ETags on disk.
- **GitHub GraphQL**: point-based (5,000 points/hour typical). Would reduce request counts; not used in v0.1 because the build environment blocked it. Planned as an optimization.
- **ecosyste.ms**: anonymous 5,000 requests/hour observed via `x-ratelimit-*` headers; data CC BY-SA 4.0, so the published catalog is distributed under CC BY-SA 4.0 with attribution.
- **raw.githubusercontent.com**: used only to read README text (documentation, not code).

## Decisions

- Static site + pre-built JSON catalog: no backend, no API calls from the browser, no token in the frontend, traffic spikes cost nothing.
- Collection runs offline (locally or in a scheduled GitHub Action) and produces a validated JSON file reviewed through a pull request.
- Two interchangeable enrichment providers (GitHub REST full depth, ecosyste.ms fallback) behind the same data model, so new sources (GitLab, Codeberg, Software Heritage) can be added the same way.
