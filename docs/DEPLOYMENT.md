# Running and deploying

## Local

```bash
npm install
npm run dev          # http://localhost:5173 , uses public/data/catalog.json
npm test             # unit tests (scoring, classification, license, search, exports)
npm run typecheck
npm run validate     # checks the catalog file
npm run build        # static site in dist/
npm run preview      # serves dist/
```

## Rebuilding the catalog

```bash
export GITHUB_TOKEN=ghp_xxx        # fine-grained token, public repositories, read-only
npm run collect                    # ~25 to 60 minutes for the default sizes
npm run validate
```

Options (environment variables):

| Variable | Default | Effect |
|---|---|---|
| `ANALYZE_LIMIT` | 1100 | Projects analyzed in depth |
| `INDEX_LIMIT` | 600 | Extra projects kept from search metadata only |
| `PER_STRATEGY` | 12 | Top projects kept per discovery query before global ranking |
| `ENRICH_PROVIDER` | `auto` | `github`, `ecosystems`, or `auto` (probe GitHub per-repo access) |
| `CACHE_HOURS` | 0 | Reuse cached responses younger than N hours without any request |
| `CONCURRENCY` | 8 | Parallel enrichment requests |
| `STRATEGY_LIMIT` | all | Run only the first N queries (testing) |

Behind a corporate or sandbox proxy, Node's `fetch` may need `NODE_USE_ENV_PROXY=1`.

Previous `firstSeenAt` dates and the `baseline` are preserved from the existing catalog, so "Recently Discovered" works across refreshes.

## Scheduled refresh

`.github/workflows/refresh-catalog.yml` runs every Monday and on demand. It rebuilds the catalog, validates it and **opens a pull request**. Nothing is deployed automatically. Add a `CATALOG_TOKEN` secret (fine-grained PAT, public repos read-only) for the full GitHub provider; without it the workflow uses ecosyste.ms.

## Deploying

The build is a static folder with relative paths (`base: './'`) and hash routing, so it works on any static host without rewrite rules.

- **GitHub Pages**: Settings → Pages → Source: GitHub Actions, then run *Deploy to GitHub Pages* manually (`.github/workflows/deploy-pages.yml`). It is `workflow_dispatch` only by design.
- **Netlify / Cloudflare Pages / any host**: build command `npm run build`, publish directory `dist`.

Recommended release flow: refresh PR → review validate output → merge → manual deploy after a visual check.

## Configuration

- `APP_REPO` in `src/pages/Project.tsx` is used for "Report a problem" links (GitHub issues). Change it if the repository lives elsewhere.
