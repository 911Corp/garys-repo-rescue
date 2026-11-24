# Roadmap

Status legend: done in v0.1 / next / later.

## Phase 1: Foundation (done)

- Study of existing tools, APIs and quotas (`docs/RESEARCH.md`).
- Architecture, data model, validation schema.
- Visual identity ("digital archaeology": strata timeline, specimen cards, terminal prompt, Gary & Jarvis).
- Reproducible collection scripts with two enrichment providers and an ETag cache.
- First real catalog (~1,400 projects).

## Phase 2: Functional MVP (done)

Search, combinable filters, 18 rule-based collections, 10 families, project pages, Rescue Score, Maintenance Status, License Status, Revival Difficulty, Data Confidence, favorites, Random Rescue (keeps filters), links to original repos.

## Phase 3: Launch preparation (mostly done)

- Done: Project Finder (deterministic), README successor detection, comparison, CSV/JSON/Markdown export, Rescue Plan export, share cards for X, shareable URLs, mobile layout, tests, docs, catalog validation.
- Done in 0.2: catalog enrichment to 3,370 projects, live fork check.
- Next: full fork analysis at build time (needs a refresh with the GitHub provider), catalog split beyond 5,000, ranking tuning from real usage, accessibility audit with a screen reader, Lighthouse pass, custom domain.

## Phase 4: Revival intelligence (next)

- Dependency analysis from manifests (outdated majors, deprecated packages, known advisories through ecosyste.ms advisories).
- Active successor detection beyond forks (renamed repos, "moved to" in descriptions, package registry ownership).
- Richer modernization suggestions per stack.
- Done in 0.3: "Rescue directive" export tailored for coding agents (AGENTS.md).
- Free Stack integration using the `garys-adventures/handoff@1` format.

## Phase 5: Extension (later)

- New sources: GitLab, Codeberg/Forgejo, Gitea, SourceForge, Software Heritage, package registries.
- Split catalog + GraphQL collection for 10,000+ projects; incremental refresh.
- Alerts (newly archived, newly dormant, favorites changing), personal watch lists.
- Community collections and suggestions (moderated, via GitHub issues first).
- Public read-only API, browser extension ("rescue this repo" on GitHub pages), MCP server exposing search and Rescue Plans to agents.
- Optional monetization that never affects ranking: donations, GitHub Sponsors, transparent sponsorship.
