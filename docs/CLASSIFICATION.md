# Classification

Rules are code in `src/core/taxonomy.ts` and are displayed verbatim on the Method page and on each collection page. A project can belong to several families and collections.

## Families (discovery perimeter)

| Family | Rule |
|---|---|
| Abandoned Projects | Maintenance = Dormant. |
| Archived Treasures | Archived and Rescue Score ≥ 45. |
| Hidden Gems | 30–600 stars, description ≥ 30 chars, README not missing, license not absent, Rescue Score ≥ 50. |
| Unfinished Ideas | No release, not Active, and (prototype/experiment/WIP/PoC/alpha keywords, or active life span < 12 months with ≥ 15 commits). |
| Forgotten Software | Created before 2016 and no commit for 4+ years. |
| Modernization Candidates | Not Active and (legacy-tech marker, or web/desktop-app keywords and 3+ years asleep). |
| Fork Opportunities | Permissive/Copyleft, Dormant/Archived, README present, Rescue Score ≥ 70, no active successor fork, no successor named in README. |
| Stable & Timeless | Maintenance = Stable. |
| Weird & Wonderful | Weird/retro keyword lists (esolang, demoscene, ASCII, fantasy console, BBS, gopher…). |
| AI Revival | Not Active, reusable license, mainstream language, README present, and tests or CI not detected. |

## Collections

Hidden Gems, Abandoned but Promising, Archived Treasures, Forgotten Web Apps, Developer Tools, AI & Automation, Retro Computing, Games, Creative Coding, Design Tools, Crypto & Web3, Self-hosted, Local-first, Weird APIs, Weekend Projects, Recently Archived, Recently Discovered, Small but Useful. Each one's rule is in `COLLECTIONS` and on its page.

Keyword matching is done on name + description + topics, lowercased, with `-`/`_` treated as spaces and word boundaries enforced (so "ai" does not match "retail").

## Legacy technology markers

CoffeeScript, ActionScript/Flash, AngularJS 1.x, Backbone.js, jQuery-era frontend, Bower, Grunt, Gulp, Python 2, Objective-C, Travis CI config, Meteor, Polymer, Cordova/PhoneGap, GWT, Visual Basic, Delphi/Pascal. Detected from languages, topics, root manifests, CI files and description, never from code.

## Exclusion rules (before analysis)

Forks, mirrors, templates, disabled repos, empty repos, no description (< 12 chars), fewer than 30 stars, and patterns for: lists ("awesome", "curated list"), dotfiles, learning material (homework, courses, leetcode, cheat sheets), harmful or abusive tooling (keygens, cracks, cheats, DDoS, malware, phishing, red-team/C2, exploits), adult content, personal sites/resumes, mirrors. Counts per reason are stored in the catalog meta and shown on the Method page.

After analysis, repos with an unreadable or near-empty root (≤ 2 entries, no manifest, < 50 KB) are dropped.
