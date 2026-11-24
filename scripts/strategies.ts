/**
 * Reproducible discovery strategies. Each strategy is a GitHub search query.
 * Dates are computed relative to the run date so the catalog can be rebuilt any time.
 * Documented in docs/SOURCES.md.
 */
export interface Strategy {
  id: string
  family: string
  query: string
  pages: number
  /** Items taken per round-robin pass during selection (default 1). Higher = more room for a niche. */
  weight?: number
}

const iso = (d: Date) => d.toISOString().slice(0, 10)
const yearsAgo = (ref: Date, y: number) => iso(new Date(ref.getTime() - y * 365.25 * 86400000))

/** Topics grouped by product area. Chosen to cover the collections in the brief. */
export const TOPICS: Record<string, string[]> = {
  apps: ['self-hosted', 'bookmarks', 'bookmark-manager', 'note-taking', 'inventory', 'dashboard', 'rss-reader', 'kanban', 'todo', 'calendar', 'wiki', 'cms', 'blog-engine', 'file-sharing', 'personal-finance', 'pastebin', 'photo-gallery', 'url-shortener', 'invoice', 'recipes'],
  dev: ['cli', 'terminal', 'tui', 'text-editor', 'developer-tools', 'git', 'static-site-generator', 'markdown-editor', 'api-client', 'documentation-generator', 'code-editor', 'devtools'],
  creative: ['generative-art', 'creative-coding', 'pixel-art', 'synthesizer', 'audio', 'image-editor', 'drawing', 'svg', 'design-tools', 'icons', 'font', 'webgl', 'shader', 'music', 'visualization'],
  games: ['game', 'roguelike', 'game-engine', 'interactive-fiction', 'chess', 'puzzle-game'],
  retro: ['emulator', 'retro', 'retrocomputing', 'gameboy', '6502', 'z80', 'chip8', 'demoscene', 'fantasy-console', 'bbs', 'gopher', 'ascii-art'],
  weird: ['esoteric-language', 'esolang', 'fun', 'toy', 'art'],
  local: ['local-first', 'offline-first', 'crdt', 'p2p', 'pwa', 'electron', 'browser-extension', 'chrome-extension'],
  crypto: ['blockchain', 'web3', 'ethereum', 'bitcoin', 'cryptocurrency', 'crypto-wallet', 'defi'],
  automation: ['automation', 'chatbot', 'scraper', 'home-automation', 'raspberry-pi', 'arduino', 'bot'],
  apis: ['api', 'public-api', 'open-data', 'weather'],
}

export function buildStrategies(ref: Date): Strategy[] {
  const dormant = yearsAgo(ref, 2)
  const old = yearsAgo(ref, 5)
  const recent = yearsAgo(ref, 1)
  const out: Strategy[] = []
  for (const [family, topics] of Object.entries(TOPICS)) {
    for (const t of topics) {
      out.push({ id: `topic-archived:${t}`, family, query: `topic:${t} archived:true stars:>=40`, pages: 1 })
      out.push({ id: `topic-dormant:${t}`, family, query: `topic:${t} archived:false pushed:<${dormant} stars:>=60`, pages: 1 })
    }
  }
  // Hidden gems: little-known, any activity.
  for (const t of ['self-hosted', 'cli', 'local-first', 'generative-art', 'game', 'developer-tools', 'tui', 'pixel-art', 'emulator', 'static-site-generator']) {
    out.push({ id: `hidden-gem:${t}`, family: 'hidden', query: `topic:${t} stars:30..250 pushed:>${recent}`, pages: 1, weight: 4 })
  }
  // Forgotten software: old and quiet.
  out.push({ id: 'forgotten:pre2013', family: 'forgotten', query: `created:<2013-01-01 pushed:<${old} stars:300..8000`, pages: 2 })
  out.push({ id: 'forgotten:2013-2016', family: 'forgotten', query: `created:2013-01-01..2016-01-01 pushed:<${old} stars:300..8000`, pages: 2 })
  // Legacy stacks = modernization candidates.
  for (const lang of ['CoffeeScript', 'ActionScript', 'Objective-C', 'Perl', 'Visual Basic .NET', 'Pascal', 'Tcl']) {
    out.push({ id: `legacy-lang:${lang}`, family: 'legacy', query: `language:"${lang}" pushed:<${dormant} stars:>=150`, pages: 1 })
  }
  for (const t of ['angularjs', 'backbone', 'jquery-plugin', 'meteor', 'python2', 'polymer']) {
    out.push({ id: `legacy-topic:${t}`, family: 'legacy', query: `topic:${t} pushed:<${dormant} stars:>=80`, pages: 1 })
  }
  // Recently archived.
  out.push({ id: 'recently-archived', family: 'archived', query: `archived:true pushed:>${yearsAgo(ref, 1.5)} stars:>=80`, pages: 2 })
  return out
}
