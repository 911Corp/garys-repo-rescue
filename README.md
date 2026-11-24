# Gary's Repo Rescue

> good code deserves a second life.

A free discovery engine for forgotten, archived, overlooked and quietly finished open source projects that are worth reviving, modernizing, reusing or contributing to. Part of **Gary's Adventures** ([@Gary_NGMI](https://x.com/Gary_NGMI)).

It answers questions GitHub search does not:

- Which interesting projects were left behind, and which are simply *done*?
- Can I legally reuse this code, and on what terms?
- Has someone already continued it somewhere else?
- How hard would it be to bring back, and where do I start?

## What's inside

- **Real catalog**: ~3,400 GitHub repositories discovered by ~220 reproducible queries, ~2,400 analyzed in depth. No mock data.
- **Explore**: full-text search with synonyms + 15 combinable filters (language, license, maintenance, family, collection, popularity, age, inactivity, archived, docs, demo, release, difficulty, Rescue Score, data confidence), 10 sort modes, shareable URLs.
- **10 families and 18 collections**, each defined by a written rule shown in the app.
- **Five indicators per project**: Rescue Score (with breakdown), Maintenance Status (Dormant ≠ Stable), Revival Difficulty, License Status, Data Confidence.
- **Project pages** separating verified facts from Gary's hypotheses, strengths, cautions, README-detected successors, similar projects.
- **Rescue Plan**: a Markdown report ready to hand to a coding agent. No invented commands.
- **Random Rescue**, **Project Finder** ("a self-hosted bookmark manager"), favorites, personal collections, history, comparison, CSV/JSON/Markdown exports, X share cards, Free Stack handoff file.
- No account, no backend, no paid API, no tracking.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. The catalog is in `public/data/catalog.json`.

```bash
npm test            # 35 unit tests
npm run validate    # catalog schema + invariants
npm run build       # static site in dist/
GITHUB_TOKEN=… npm run collect   # rebuild the catalog
```

## Documentation

| Doc | Content |
|---|---|
| [docs/RESEARCH.md](docs/RESEARCH.md) | Study of existing tools, APIs, quotas, differentiation |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Pipeline, separation of concerns, scaling, Free Stack bridge |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Fields, and how missing data is distinguished from zero |
| [docs/SOURCES.md](docs/SOURCES.md) | Data sources, terms, discovery strategies |
| [docs/SCORING.md](docs/SCORING.md) | Every score: criteria, weights, thresholds, edge cases |
| [docs/CLASSIFICATION.md](docs/CLASSIFICATION.md) | Families, collections, legacy markers, exclusion rules |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Local run, catalog refresh, scheduled updates, deployment |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases 1 to 5 |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md) | Known limitations |
| [CHANGELOG.md](CHANGELOG.md) | Versions |

## Stack

React 19, TypeScript, Vite, MiniSearch, zod, Vitest. IBM Plex Sans & Mono (bundled, no external font requests). Static hosting; GitHub Actions for CI, weekly catalog refresh (as a pull request) and manual deployment.

## Principles

- Never invent statistics, commands or problems. Unavailable data is labelled "not collected".
- Inactivity is not abandonment.
- A public repository without a license is not free to reuse.
- Prefer contributing upstream when a project or a successor is alive.
- Never download or execute repository code. Never expose tokens to the browser.
- Never rank a project for commercial reasons.

## License

- Code: MIT, see [LICENSE](LICENSE).
- Catalog data (`public/data/catalog.json`): contains data derived from [ecosyste.ms](https://ecosyste.ms) and is distributed under **CC BY-SA 4.0**. Repository metadata comes from GitHub. Every listed project belongs to its authors and keeps its own license.

---

Built by Gary. Rescued with Jarvis.
