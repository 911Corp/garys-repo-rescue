# Architecture

Repo Rescue is a static web app plus an offline collection pipeline. The browser never calls GitHub: it loads one pre-built, validated JSON catalog.

```
            ┌──────────────── offline (local or GitHub Actions) ────────────────┐
 GitHub     │ collect        normalize      filter       select       enrich    │
 search ───►│ 220 queries ─► ProjectFacts ─► exclusion ─► diversity ─► provider ─┼─┐
            │ (30/min)       (indexed)       rules        + pre-rank   github |  │ │
            │                                                         ecosystems│ │
 ecosyste.ms├──────────────────────────────────────────────────────────►  + README│ │
 raw README │                                                                    │ │
            │ assess (src/core): maintenance · license · difficulty · score ·   │ │
            │ confidence · families · collections · reasons                     │◄┘
            │ ─► public/data/catalog.json ─► npm run validate ─► pull request    │
            └────────────────────────────────────────────────────────────────────┘
                                        │ static file
            ┌──────────────── browser (React + Vite, static hosting) ───────────┐
            │ load catalog ─► recompute confidence vs today ─► MiniSearch index  │
            │ Explore · Collections · Random · Finder · Project · Compare · Saved│
            │ exports: CSV · JSON · Markdown · Rescue Plan · share card · handoff│
            │ localStorage: favorites, history, personal collections, compare    │
            └────────────────────────────────────────────────────────────────────┘
```

## Separation of concerns

| Concern | Where |
|---|---|
| Collection (HTTP, quotas, ETag cache) | `scripts/lib/github.ts` |
| Discovery strategies | `scripts/strategies.ts` |
| Normalization + exclusion rules | `src/core/normalize.ts` |
| Enrichment providers | `scripts/providers/github.ts`, `scripts/providers/ecosystems.ts`, `scripts/providers/readme.ts` |
| Detection of quality signals | `src/core/detect.ts`, `src/core/readme.ts` |
| Classification (families, collections) | `src/core/taxonomy.ts` |
| Scoring | `src/core/scoring.ts`, `maintenance.ts`, `license.ts`, `difficulty.ts`, `confidence.ts` |
| Fork analysis | `src/core/forks.ts` (pure rules), used by the GitHub provider at build time and by `src/ui/ForkCheck.tsx` live in the browser; README successor hints |
| Catalog assembly | `scripts/collect.ts` |
| Validation | `src/core/schema.ts`, `scripts/validate.ts` |
| Search | `src/app/search.ts` (MiniSearch + synonyms + filters) |
| Report generation | `src/core/rescuePlan.ts`, `src/core/exporters.ts`, `src/ui/shareCard.ts` |
| UI | `src/pages/*`, `src/ui/*`, `src/styles.css` |

Everything in `src/core` is pure TypeScript shared by the pipeline and the browser, and covered by `tests/`.

## Why a pre-built catalog

- **No quota exposure**: 10 visitors or 100,000 visitors cost the same: zero API calls.
- **No secrets in the frontend**: tokens exist only in the collector's environment and are only sent to `api.github.com`.
- **Reproducible**: the same catalog file always renders the same scores; the build date is the reference date.
- **Cheap hosting**: GitHub Pages or any static host.

Trade-off: data is as fresh as the last refresh (weekly by default). Confidence is recomputed in the browser so stale data visibly loses confidence.

## Scaling the catalog

| Size | Approach |
|---|---|
| ~1,500 (v0.1) | Single JSON file (~5 MB raw, ~1 MB gzipped). |
| 5,000–10,000 | Split into a light index (id, name, description, topics, scores) loaded first + per-project detail files loaded on demand. Use GraphQL to cut request counts by ~10x. |
| 50,000+ | Prebuilt search index shards, or a tiny read-only API (e.g. SQLite on a free edge runtime). Incremental collection: only revalidate repos whose `pushed_at` changed (ETags). |

## Free Stack bridge

The project page exports `*-free-stack.json` with schema `garys-adventures/handoff@1`:

```json
{ "schema": "garys-adventures/handoff@1", "from": "repo-rescue",
  "project": { "repo": "owner/name", "url": "…", "license": "MIT", "licenseStatus": "Permissive" },
  "stack": { "primaryLanguage": "…", "languages": [], "manifests": [], "legacy": [], "topics": [] },
  "needs": ["ci", "testing", "hosting"] }
```

Free Stack can read it to suggest free tools for each need. Neither app depends on the other being online: the handoff is a file.

## Safety rules enforced in code

- Never download or execute repository code. Only metadata endpoints, directory listings and README text are read.
- Tokens only go to `api.github.com` (`scripts/lib/github.ts`).
- External links open with `rel="noreferrer"`; homepages additionally with `nofollow`.
- Unavailable data is explicit (`meta.unavailable`) and validated: a field marked unavailable must be `null`.
