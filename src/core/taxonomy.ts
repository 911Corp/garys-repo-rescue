import { daysBetween, monthsBetween, lastActivity } from './dates'
import { MAINSTREAM_LANGS } from './detect'
import { isReusable } from './license'
import type { FamilyId, LicenseStatus, MaintenanceStatus, ProjectFacts, RevivalDifficulty } from './types'

export interface ClassifyCtx {
  ref: Date
  maintenance: MaintenanceStatus
  licenseStatus: LicenseStatus
  rescueScore: number
  legacyTech: string[]
  difficulty: RevivalDifficulty
  /** Date of the first catalog build. Projects first seen on that run are not "recently discovered". */
  baseline: string
}

export function textOf(p: ProjectFacts): string {
  return `${p.name} ${p.description ?? ''} ${p.topics.join(' ')}`.toLowerCase().replace(/[-_]/g, ' ')
}

/** Word-boundary keyword match over name, description and topics. */
export function hasAny(p: ProjectFacts, words: string[]): boolean {
  const t = ` ${textOf(p)} `
  return words.some((w) => {
    const k = w.toLowerCase().replace(/[-_]/g, ' ')
    return new RegExp(`[^a-z0-9]${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z0-9]`).test(t)
  })
}

const KW = {
  unfinished: ['prototype', 'proof of concept', 'poc', 'experiment', 'experimental', 'wip', 'work in progress', 'alpha', 'concept', 'unfinished', 'sketch', 'playground', 'toy'],
  weird: ['esoteric', 'esolang', 'esoteric language', 'demoscene', 'ascii art', 'ascii', 'fun', 'joke', 'toy', 'weird', 'absurd', 'useless', 'art', 'glitch', 'generative', 'zine', 'fantasy console', 'brainfuck', 'quine', 'bbs', 'gopher', 'tamagotchi', 'screensaver', 'pixel art', 'chiptune', 'oulipo'],
  retro: ['retro', 'emulator', 'emulation', 'gameboy', 'game boy', 'nes', 'snes', 'c64', 'commodore', 'amiga', 'atari', 'z80', '6502', 'zx spectrum', 'msdos', 'ms dos', 'dos', 'chip8', 'chip 8', 'pico8', 'pico 8', 'fantasy console', 'bbs', 'gopher', 'crt', '8bit', '8 bit', 'vintage', 'apple ii', 'msx', 'cp m', 'demoscene'],
  games: ['game', 'games', 'game engine', 'gamedev', 'roguelike', 'puzzle', 'platformer', 'rpg', 'mmo', 'chess', 'tetris', 'sokoban', 'interactive fiction', 'text adventure', 'board game', 'card game', 'voxel', 'minecraft'],
  creative: ['creative coding', 'generative art', 'generative', 'processing', 'p5js', 'p5 js', 'shader', 'shaders', 'glsl', 'webgl', 'three js', 'threejs', 'visualizer', 'music visualization', 'audio visualizer', 'synthesizer', 'synth', 'livecoding', 'live coding', 'demoscene', 'pixel art', 'procedural', 'fractal', 'canvas', 'creative'],
  design: ['design', 'design tool', 'design tools', 'figma', 'sketch plugin', 'svg', 'vector', 'icon', 'icons', 'font', 'typography', 'color palette', 'color picker', 'colors', 'drawing', 'paint', 'image editor', 'photo editor', 'mockup', 'wireframe', 'prototyping', 'ui kit', 'diagram', 'whiteboard'],
  crypto: ['crypto', 'cryptocurrency', 'blockchain', 'web3', 'ethereum', 'bitcoin', 'solana', 'defi', 'nft', 'wallet', 'smart contract', 'smart contracts', 'dapp', 'lightning network', 'ipfs', 'dao', 'token', 'erc20', 'solidity', 'monero', 'cosmos', 'polkadot'],
  selfhosted: ['self hosted', 'selfhosted', 'self host', 'homelab', 'home server', 'nas', 'docker compose', 'host your own'],
  localfirst: ['local first', 'localfirst', 'offline first', 'offline', 'crdt', 'crdts', 'sync', 'p2p', 'peer to peer', 'local only', 'no cloud'],
  devtools: ['developer tools', 'developer tool', 'devtools', 'dev tools', 'cli', 'command line', 'terminal', 'tui', 'linter', 'formatter', 'debugger', 'profiler', 'git', 'ide', 'editor', 'code editor', 'vscode', 'vim', 'neovim', 'emacs', 'build tool', 'testing', 'api client', 'http client', 'documentation', 'static analysis', 'code generator', 'scaffolding', 'snippet', 'dotfiles manager', 'regex', 'json', 'logging'],
  ai: ['ai', 'artificial intelligence', 'machine learning', 'deep learning', 'neural network', 'llm', 'gpt', 'chatbot', 'bot', 'automation', 'automate', 'workflow', 'scraper', 'scraping', 'crawler', 'nlp', 'speech recognition', 'computer vision', 'ocr', 'agent', 'rpa', 'home automation'],
  webapp: ['web app', 'webapp', 'web application', 'single page app', 'spa', 'pwa', 'progressive web app', 'dashboard', 'cms', 'blog', 'wiki', 'forum', 'todo', 'kanban', 'bookmark', 'bookmarks', 'notes', 'note taking', 'rss', 'feed reader', 'calendar', 'chat', 'pastebin', 'url shortener', 'photo gallery', 'gallery', 'invoice', 'inventory'],
  api: ['api', 'apis', 'rest api', 'graphql', 'webhook', 'wrapper', 'sdk', 'open data', 'public api', 'json api'],
  weirdApi: ['weird', 'fun', 'joke', 'random', 'generator', 'excuse', 'meme', 'quote', 'quotes', 'cat', 'dog', 'pokemon', 'insult', 'fortune', 'lorem ipsum', 'placeholder', 'fake', 'easter egg', 'oracle', 'magic 8', 'useless', 'emoji'],
}
export const KEYWORDS = KW

export interface FamilyDef {
  id: FamilyId
  label: string
  blurb: string
  criteria: string
  test: (p: ProjectFacts, c: ClassifyCtx) => boolean
}

const months = (p: ProjectFacts, ref: Date) => monthsBetween(lastActivity(p), ref) ?? 0

export const FAMILIES: FamilyDef[] = [
  {
    id: 'abandoned', label: 'Abandoned Projects', blurb: 'Several signals suggest development stopped.',
    criteria: 'Maintenance = Dormant (no default-branch commit for 18+ months and not matching the Stable rule) and not archived.',
    test: (_p, c) => c.maintenance === 'Dormant',
  },
  {
    id: 'archived-treasure', label: 'Archived Treasures', blurb: 'Officially archived, still technically or functionally interesting.',
    criteria: 'Archived by the owner AND Rescue Score ≥ 45.',
    test: (p, c) => p.archived && c.rescueScore >= 45,
  },
  {
    id: 'hidden-gem', label: 'Hidden Gems', blurb: 'Useful, original, little-known. Any activity level.',
    criteria: '30–600 stars, has a description of 30+ chars, README, a reusable or identified license, and Rescue Score ≥ 50.',
    test: (p, c) => p.stars >= 30 && p.stars <= 600 && (p.description?.length ?? 0) >= 30 && p.quality.readme !== false && c.licenseStatus !== 'No Explicit License' && c.rescueScore >= 50,
  },
  {
    id: 'unfinished-idea', label: 'Unfinished Ideas', blurb: 'Prototypes and experiments that never reached their potential.',
    criteria: 'No release, AND (description/topics mention prototype/experiment/WIP/PoC/alpha… OR active life span under 12 months), AND not Active.',
    test: (p, c) => {
      if (p.latestRelease || c.maintenance === 'Active') return false
      const span = p.pushedAt ? (Date.parse(p.pushedAt) - Date.parse(p.createdAt)) / (30.4375 * 86400000) : null
      return hasAny(p, KW.unfinished) || (span != null && span < 12 && (p.commitsTotal ?? 0) >= 15)
    },
  },
  {
    id: 'forgotten-software', label: 'Forgotten Software', blurb: 'Older software that could use a technical or visual refresh.',
    criteria: 'Created before 2016 AND last commit 4+ years ago.',
    test: (p, c) => new Date(p.createdAt).getUTCFullYear() < 2016 && months(p, c.ref) >= 48,
  },
  {
    id: 'modernization-candidate', label: 'Modernization Candidates', blurb: 'Apps that could be adapted to current tech, usage and UI.',
    criteria: 'Not Active AND (a legacy-tech marker is detected OR it is a web/desktop app untouched for 3+ years).',
    test: (p, c) => c.maintenance !== 'Active' && (c.legacyTech.length > 0 || (hasAny(p, KW.webapp) && months(p, c.ref) >= 36)),
  },
  {
    id: 'fork-opportunity', label: 'Fork Opportunities', blurb: 'Reuse or evolution potential, license permitting.',
    criteria: 'Permissive or copyleft license, Dormant or Archived, README present, Rescue Score ≥ 70, no possible active successor fork detected, and no successor named in the README.',
    test: (p, c) => isReusable(c.licenseStatus) && (c.maintenance === 'Dormant' || c.maintenance === 'Archived') && p.quality.readme === true && c.rescueScore >= 70 && !p.forkIntel.possibleSuccessor && p.forkIntel.successorHints.length === 0,
  },
  {
    id: 'stable-timeless', label: 'Stable & Timeless', blurb: 'Mature, working, quiet because it may simply be done.',
    criteria: 'Maintenance = Stable (quiet 18+ months, but has releases, 50+ commits, ≤ 25 open issues, 3+ years old).',
    test: (_p, c) => c.maintenance === 'Stable',
  },
  {
    id: 'weird-wonderful', label: 'Weird & Wonderful', blurb: 'Atypical, experimental, geeky, retro or just delightfully odd.',
    criteria: 'Name/description/topics match the weird/retro keyword lists (esolang, demoscene, ASCII, fantasy console, BBS, gopher…).',
    test: (p) => hasAny(p, KW.weird) || hasAny(p, ['esolang', 'demoscene', 'fantasy console', 'bbs', 'gopher', 'chip8']),
  },
  {
    id: 'ai-revival', label: 'AI Revival', blurb: 'Revival, docs, migration or tests that modern coding agents could speed up.',
    criteria: 'Not Active, reusable license, mainstream language, README present, AND missing tests or CI (work agents are good at).',
    test: (p, c) =>
      c.maintenance !== 'Active' && isReusable(c.licenseStatus) && p.language != null && MAINSTREAM_LANGS.has(p.language) && p.quality.readme === true && (p.quality.tests === false || p.quality.ci === false),
  },
]

export interface CollectionDef {
  id: string
  label: string
  tagline: string
  criteria: string
  kind: 'dynamic'
  test: (p: ProjectFacts, c: ClassifyCtx) => boolean
}

export const COLLECTIONS: CollectionDef[] = [
  { id: 'hidden-gems', label: 'Hidden Gems', tagline: 'someone cooked here. nobody noticed.', criteria: 'Projects in the Hidden Gems family.', kind: 'dynamic', test: (p, c) => FAMILIES[2].test(p, c) },
  { id: 'abandoned-but-promising', label: 'Abandoned but Promising', tagline: "abandoned doesn't mean useless.", criteria: 'Dormant or Archived, Rescue Score ≥ 75, identified license.', kind: 'dynamic', test: (_p, c) => (c.maintenance === 'Dormant' || c.maintenance === 'Archived') && c.rescueScore >= 75 && c.licenseStatus !== 'No Explicit License' && c.licenseStatus !== 'Unknown' },
  { id: 'archived-treasures', label: 'Archived Treasures', tagline: "the repo is archived. the idea isn't.", criteria: 'Projects in the Archived Treasures family.', kind: 'dynamic', test: (p, c) => FAMILIES[1].test(p, c) },
  { id: 'forgotten-web-apps', label: 'Forgotten Web Apps', tagline: 'last commit: a different era.', criteria: 'Web-app keywords AND last commit 3+ years ago (or archived).', kind: 'dynamic', test: (p, c) => hasAny(p, KW.webapp) && (p.archived || months(p, c.ref) >= 36) },
  { id: 'developer-tools', label: 'Developer Tools', tagline: 'tools for people who make tools.', criteria: 'Developer-tool keywords (CLI, editor, git, linter, terminal…).', kind: 'dynamic', test: (p) => hasAny(p, KW.devtools) },
  { id: 'ai-automation', label: 'AI & Automation', tagline: 'robots that stopped. robots that could restart.', criteria: 'AI, ML, bots, scraping or automation keywords.', kind: 'dynamic', test: (p) => hasAny(p, KW.ai) },
  { id: 'retro-computing', label: 'Retro Computing', tagline: 'insert disk 2 to continue.', criteria: 'Retro keywords (emulator, 6502, Game Boy, BBS, chip8…).', kind: 'dynamic', test: (p) => hasAny(p, KW.retro) },
  { id: 'games', label: 'Games', tagline: 'gary found another weekend project.', criteria: 'Game keywords (game, roguelike, engine, chess…).', kind: 'dynamic', test: (p) => hasAny(p, KW.games) },
  { id: 'creative-coding', label: 'Creative Coding', tagline: 'code that makes pretty things.', criteria: 'Creative coding keywords (generative, shader, p5.js, synth…).', kind: 'dynamic', test: (p) => hasAny(p, KW.creative) },
  { id: 'design-tools', label: 'Design Tools', tagline: 'pixels, vectors and good intentions.', criteria: 'Design keywords (SVG, icons, fonts, image editor, diagram…).', kind: 'dynamic', test: (p) => hasAny(p, KW.design) },
  { id: 'crypto-web3', label: 'Crypto & Web3', tagline: 'not financial advice. neither is this repo.', criteria: 'Crypto keywords (blockchain, wallet, ethereum, bitcoin, DeFi…).', kind: 'dynamic', test: (p) => hasAny(p, KW.crypto) },
  { id: 'self-hosted', label: 'Self-hosted', tagline: 'your server, your rules.', criteria: 'Self-hosting keywords or a Dockerfile/compose file on a web-app project.', kind: 'dynamic', test: (p) => hasAny(p, KW.selfhosted) || (p.quality.dockerfile === true && hasAny(p, KW.webapp)) },
  { id: 'local-first', label: 'Local-first', tagline: 'works on a plane. works in a bunker.', criteria: 'Local-first keywords (offline-first, CRDT, p2p, sync…).', kind: 'dynamic', test: (p) => hasAny(p, KW.localfirst) },
  { id: 'weird-apis', label: 'Weird APIs', tagline: 'endpoints nobody asked for. everybody needs.', criteria: 'API keywords AND fun/odd keywords.', kind: 'dynamic', test: (p) => hasAny(p, KW.api) && hasAny(p, KW.weirdApi) },
  { id: 'weekend-projects', label: 'Weekend Projects', tagline: 'small enough to finish before monday. maybe.', criteria: 'Revival Difficulty = Beginner, reusable license, README present.', kind: 'dynamic', test: (p, c) => isReusable(c.licenseStatus) && p.quality.readme === true && c.difficulty === 'Beginner' },
  { id: 'recently-archived', label: 'Recently Archived', tagline: 'fresh off the shelf.', criteria: 'Archived AND last push within 24 months (GitHub does not expose the archive date; last push is the closest observable proxy).', kind: 'dynamic', test: (p, c) => p.archived && (monthsBetween(p.pushedAt, c.ref) ?? 999) <= 24 },
  { id: 'recently-discovered', label: 'Recently Discovered', tagline: 'new in the catalog.', criteria: 'First seen by the collector in the last 30 days, excluding the initial catalog build.', kind: 'dynamic', test: (p, c) => (daysBetween(p.meta.firstSeenAt, c.ref) ?? 999) <= 30 && Date.parse(p.meta.firstSeenAt) > Date.parse(c.baseline) + 86400000 },
  { id: 'small-but-useful', label: 'Small but Useful', tagline: 'tiny repo. real job.', criteria: 'Under 2 MB, 100+ stars, README present, identified license.', kind: 'dynamic', test: (p, c) => p.sizeKb != null && p.sizeKb < 2048 && p.stars >= 100 && p.quality.readme === true && (c.licenseStatus === 'Permissive' || c.licenseStatus === 'Copyleft') },
]
