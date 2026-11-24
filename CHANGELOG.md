# Changelog

All notable changes. Format inspired by Keep a Changelog; versions follow SemVer.

## [0.2.0] - 2026-11-24 (first public release)

### Changed
- Catalog expanded to 3,370 real projects (2,370 analyzed in depth, 1,000 indexed), from the same reproducible strategies with larger selection limits.
- Timeline year labels lightened to meet WCAG AA contrast. axe-core: 0 WCAG 2 A/AA violations on all pages, desktop and mobile.

## [0.1.1] - 2026-11-24

### Added
- Live fork check on project pages: anonymous request from the visitor's browser to the GitHub API, same rules as the collector, 24 h local cache, graceful handling of rate limits and network errors. No token involved.
- 4 unit tests for fork intelligence (39 total).

### Changed
- Fork analysis extracted to `src/core/forks.ts`, shared by the collector and the browser.

## [0.1.0] - 2026-11-24 (not deployed, awaiting validation)

### Added
- Collection pipeline: ~220 GitHub search strategies, exclusion rules, diversity-aware selection, ETag cache, rate-limit handling.
- Two enrichment providers: GitHub REST (full depth incl. fork analysis) and ecosyste.ms (fallback), plus README analysis (install section, screenshots, deprecation and "moved to" successor notices).
- First real catalog (see `meta.counts` in `public/data/catalog.json`).
- Scoring: Rescue Score (8 weighted criteria, renormalized on missing data), Maintenance Status, License Status, Revival Difficulty, Data Confidence.
- 10 discovery families and 18 rule-based collections.
- Web app: home, Explore (search + filters + sorts + shareable URLs), collections, project pages, Random Rescue, Project Finder, saved projects, personal collections, history, comparison, method page.
- Exports: CSV, JSON, Markdown selections, Rescue Plan (Markdown), Free Stack handoff (JSON), PNG share card, X post intent.
- Catalog validation (`npm run validate`), 35 unit tests, CI, scheduled refresh workflow (opens a PR), manual GitHub Pages deployment workflow.
- Documentation: research, architecture, data model, sources, scoring, classification, deployment, roadmap, limitations.

### Known gaps
- Fork lists not collected at build time in this catalog (see docs/LIMITATIONS.md); covered by the live check since 0.1.1.
