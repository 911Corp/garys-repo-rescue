# Known limitations (v0.1)

## Data

- **Fork Intelligence is not populated in the v0.1 catalog.** The build environment could not reach per-repository GitHub endpoints, so the ecosyste.ms provider was used, and it does not list forks. Possible successors come only from README "moved to / successor" notices. To compensate, every project page offers a **live fork check**: the visitor's browser asks the public GitHub API for the top 30 forks by stars (anonymous, 60 requests/hour per IP, cached 24 h in localStorage) and applies the same rules as the collector (`src/core/forks.ts`). A catalog refresh with a normal token (the scheduled GitHub Action) fills `forkIntel` at build time instead.
- In the same build: no `docs/` or `examples/` detection, no last-commit date (last push used), no open-PR count, no language breakdown. These are marked "not collected".
- ecosyste.ms data can lag GitHub by weeks; its sync date is stored and lowers Data Confidence when old.
- Tests and CI are detected from file names (GitHub provider) or declared test frameworks and workflow manifests (ecosyste.ms provider). Tests in unusual places are missed: "not detected" is not "absent".
- `contributors` means commit authors on the default branch with ecosyste.ms, GitHub contributors with the GitHub provider. Labelled accordingly.
- GitHub does not expose archive dates; "Recently Archived" uses last push.
- Stars, forks and dates are frozen at collection time.
- GitHub search caps each query at 1,000 results; discovery is broad but not exhaustive.

## Judgement

- Scores are heuristics. They do not measure code quality, security or whether the software works. Nothing is executed or tested.
- Keyword-based collections can misfile projects (e.g. a "game" library vs a game).
- Exclusion rules can drop legitimate projects (e.g. a security research tool) or miss unwanted ones.
- License interpretation is simplified and is not legal advice. Dual-licensed projects and per-file licenses are not detected.

## Product

- Project Finder uses text matching and synonyms, not semantic understanding.
- Favorites, history and personal collections live in the browser (localStorage) and are lost if storage is cleared. No sync, by design (no account).
- One JSON file (~1 MB gzipped) is loaded on first visit; fine for v0.1, to be split beyond ~5,000 projects.
- Only GitHub is covered.
- "Report a problem" opens a GitHub issue on the configured repository, which must exist.
