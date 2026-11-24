# Scores and indicators

All functions live in `src/core/` and are covered by `tests/core.test.ts`. Scores are computed at build time with the catalog's reference date; **Data Confidence** is recomputed in the browser against today.

Design rules:

- No single magic number: five indicators, each explained on the project page.
- Missing data is never a bad result: unavailable inputs are dropped and weights renormalized; coverage is shown.
- Deterministic and reproducible: same input → same output, no randomness, no AI.

## Rescue Score (0–100)

Weighted mean of eight criteria in [0, 1]. Each criterion averages its available sub-signals.

| Key | Weight | Sub-signals |
|---|---|---|
| `interest` | 15% | description length (≥80 chars = 1, ≥40 = 0.75, ≥15 = 0.45, shorter 0.2, none 0), topics/6, homepage (1 or 0) |
| `adoption` | 20% | log-scale stars (50 → 30,000), forks (5 → 3,000), contributors (1 → 200) |
| `access` | 10% | mainstream language (1, else 0.5), size (<20 MB = 1, <100 MB = 0.6, else 0.3), root manifest present (1 or 0.3) |
| `documentation` | 15% | README = 0.4; the other 0.6 averages docs folder, examples, CONTRIBUTING, CHANGELOG, install section, screenshots |
| `license` | 15% | Permissive 1, Copyleft 0.8, Unknown 0.4, Other Restrictions 0.3, No Explicit License 0 |
| `modernization` | 10% | time asleep (<1y 0.2, <2y 0.6, <10y 1, ≥10y 0.7), legacy marker (1, else 0.5), viable language (1, else 0.6) |
| `base` | 10% | release (1 or 0.2), log-scale commits (10 → 2,000), active life span / 24 months |
| `maintenance` | 5% | tests, CI, contributors ≥3 (1) / 2 (0.5) / 1 (0) |

`coverage` = sum of weights that could be computed. `score = round(100 × Σ(wᵢ·vᵢ) / coverage)`.

The Rescue Score measures *apparent revival/reuse potential*, not code quality or the authors' merit.

## Maintenance Status

Evaluated in order:

1. `Archived` if the owner archived the repository.
2. `Unknown` if no last-commit or last-push date exists.
3. `Active`: last activity ≤ 6 months **and** (commits in 12 months unknown or ≥ 12).
4. `Low Activity`: last activity ≤ 6 months with fewer commits, or ≤ 18 months.
5. `Stable`: > 18 months quiet **and** has a release **and** ≥ 50 commits **and** ≤ 25 open issues (open issues + PRs used as an upper bound when issues alone are unknown) **and** ≥ 3 years old.
6. `Dormant` otherwise.

Last activity = last default-branch commit when known, else last push.

## License Status

SPDX id → `Permissive` / `Copyleft` / `Other Restrictions` (patterns: `-NC`, `-ND`, SSPL, BUSL, Elastic, Commons Clause, PolyForm, or uncommon ids) / `Unknown` (`NOASSERTION`, `OTHER`, or not collected) / `No Explicit License` (no license file detected). Lists in `src/core/license.ts`.

## Revival Difficulty

Points: size (<0.5 MB 0, <5 MB 1, <50 MB 2, else 3) + commits (<100 0, <1k 1, <5k 2, else 3) + ≥3 languages over 10% (+1) + no README (+2) or >5 MB without docs (+1) + no root tests on >0.5 MB (+1) + >5 years asleep (+1) + legacy tech (+1).
0–2 Beginner · 3–4 Intermediate · 5–6 Advanced · 7+ Expert · Unknown when ≥3 of the 6 inputs are missing.

## Data Confidence (0–100)

`0.6 × availability + 0.25 × freshness + 0.15 × identity`.

- availability = share of expected fields collected (`lastCommitAt, commitsTotal, commits12m, latestRelease, contributors, openPrs, languages, quality, forkIntel, license`).
- freshness = f(days since verification) (≤14 d: 1, ≤45: 0.8, ≤120: 0.5, else 0.2); averaged with the same function on the oldest secondary-source sync date when one was used.
- identity = description present (0.5) + identified license (0.5; 0.35 when the license is known to be absent).

High ≥ 75, Medium ≥ 50, Low otherwise.

## Edge cases

- Archived repos with very recent pushes: status is still `Archived`.
- Monorepos and huge repos: size inflates difficulty; the reasons list says so.
- Mirrors, forks, templates and disabled repos are excluded upstream.
- A README that announces a successor adds a caution and removes the project from *Fork Opportunities*.

## Fork Intelligence (light)

Source: `src/core/forks.ts`, applied at build time (GitHub provider) or live from the project page.

- Inspected: the top 30 forks by stars.
- **Notable fork**: not archived and pushed more than 30 days after the original's last commit/push. Top 5 kept, by stars.
- **Possible successor**: a notable fork with at least max(10, 2% of the original's stars) stars, pushed more than 180 days after the original, and pushed within the last 365 days.
- It is a heuristic, not a verdict: the label invites the user to look at the fork (and contribute there) before starting a new one.
