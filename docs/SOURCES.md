# Data sources

| Source | Used for | Access | Terms |
|---|---|---|---|
| GitHub REST: `/search/repositories` | Discovery (≈220 queries), core metadata: stars, forks, dates, topics, license, size, archived flag, open issues + PRs | Token in `GITHUB_TOKEN`/`GH_TOKEN`; 30 req/min | GitHub Terms of Service & API terms. Public metadata only. |
| GitHub REST: `/repos/{o}/{r}/…` (provider `github`) | Root listing (README, docs, tests, CI, manifests), languages, contributors, commits, commits in 12 months, open PRs, latest release, top forks | Same token; ~9 requests per repo; ETag cache | Same |
| ecosyste.ms Repos & Commits APIs (provider `ecosystems`) | Metadata files (README, LICENSE, CHANGELOG, CONTRIBUTING), total commits and commit authors, past-year commits, releases, dependency manifests (incl. GitHub Actions workflows, Dockerfiles) | Anonymous, 5,000 req/h observed; no token sent | **CC BY-SA 4.0**: attribution + share-alike. The published catalog is therefore under CC BY-SA 4.0. |
| raw.githubusercontent.com | README text only: install section, screenshots, deprecation notice, "moved to" successor links | Anonymous; no token sent | GitHub ToS. Only derived booleans and short link context are stored. |

The v0.1 catalog was built with the `ecosystems` provider because the build environment could not reach per-repository GitHub endpoints. Consequences: no fork listing, no root-folder signals (docs/, examples/), no last-commit date (last push is used), no open-PR count. These fields are marked unavailable and lower Data Confidence. A refresh with a regular personal token uses the `github` provider automatically.

## Discovery strategies (`scripts/strategies.ts`)

Dates are relative to the run date.

- For ~100 topics in 10 areas (apps, dev tools, creative, games, retro, weird, local-first, crypto, automation, APIs): `topic:X archived:true stars:>=40` and `topic:X archived:false pushed:<(today-2y) stars:>=60`.
- Hidden gems: `topic:X stars:30..250 pushed:>(today-1y)` for 10 topics.
- Forgotten software: `created:<2013 pushed:<(today-5y) stars:300..8000` and the 2013–2016 equivalent (2 pages each).
- Legacy languages (CoffeeScript, ActionScript, Objective-C, Perl, VB.NET, Pascal, Tcl) and legacy topics (angularjs, backbone, jquery-plugin, meteor, python2, polymer).
- Recently archived: `archived:true pushed:>(today-18 months) stars:>=80` (2 pages).

Selection for deep analysis: the top `PER_STRATEGY` (default 10) of each query by a cheap pre-rank (stars, forks, description, topics, license, homepage), then the global pre-rank until `ANALYZE_LIMIT`. Up to `INDEX_LIMIT` more are kept as "indexed only".

## Adding a source

1. Write a provider in `scripts/providers/` that fills `ProjectFacts` fields and lists what it cannot provide in `meta.unavailable`.
2. Add its id, label, URL and terms to `meta.sources` in `scripts/collect.ts`.
3. For a new forge (GitLab, Codeberg/Forgejo, Gitea, SourceForge): add `source` values to the type, a normalizer like `fromSearch`, and namespaced ids (`gitlab:group/project`).
4. Never send a token to a host other than the one it belongs to.
