/**
 * Pure README analysis. Reads documentation text only (never code), and extracts facts:
 * install/usage sections, size, and explicit successor/migration hints written by the authors.
 */
export interface ReadmeFacts {
  bytes: number
  hasInstall: boolean
  hasUsage: boolean
  hasScreenshots: boolean
  successorHints: { repo: string; snippet: string }[]
  deprecatedNotice: boolean
}

const INSTALL_RE = /^#{1,4}\s*(installation|install|installing|getting started|quick ?start|setup|set up|build(ing)?( from source)?|running locally|development|deploy(ment)?)\b/im
const USAGE_RE = /^#{1,4}\s*(usage|how to use|examples?|features|demo|documentation|docs)\b/im
const SCREEN_RE = /!\[[^\]]*\]\([^)]+\.(png|gif|jpe?g|webp|svg)[^)]*\)|<img\s/i
const MOVE_RE = /(has moved|moved to|new home|now lives|migrated to|continued (at|in|by)|successor|superseded by|replaced by|deprecated in fav(ou)?r of|use .{0,40} instead|maintained fork|active fork|is now maintained|no longer maintained|unmaintained|not maintained|archived)/i
const DEPRECATED_RE = /(no longer (being )?maintained|unmaintained|not (actively )?maintained( anymore)?|deprecated|this (project|repo(sitory)?) is (archived|dead|abandoned)|end of life)/i
const GH_LINK_RE = /github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/g

export function analyzeReadme(text: string, selfFullName: string): ReadmeFacts {
  const head = text.slice(0, 60_000)
  const self = selfFullName.toLowerCase()
  const hints: { repo: string; snippet: string }[] = []
  // Only look at the first ~6000 chars: move notices are at the top.
  const top = head.slice(0, 6000)
  for (const m of top.matchAll(GH_LINK_RE)) {
    const repo = `${m[1]}/${m[2].replace(/\.git$/, '').replace(/[).,#]+$/, '')}`
    const low = repo.toLowerCase()
    if (low === self || ['sponsors', 'orgs', 'features', 'marketplace', 'apps', 'topics', 'settings'].includes(m[1].toLowerCase())) continue
    if (/\/(issues|pulls|releases|wiki|actions|blob|tree|discussions)$/i.test(repo)) continue
    const i = m.index ?? 0
    const ctx = top.slice(Math.max(0, i - 220), i + 80).replace(/\s+/g, ' ')
    if (MOVE_RE.test(ctx) && !hints.some((h) => h.repo.toLowerCase() === low)) {
      // A link to another repo of the same owner, or to any repo, next to a move phrase.
      hints.push({ repo, snippet: ctx.slice(-160).trim() })
    }
    if (hints.length >= 3) break
  }
  return {
    bytes: text.length,
    hasInstall: INSTALL_RE.test(head),
    hasUsage: USAGE_RE.test(head),
    hasScreenshots: SCREEN_RE.test(head),
    successorHints: hints,
    deprecatedNotice: DEPRECATED_RE.test(top.slice(0, 3000)),
  }
}
