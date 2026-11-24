/**
 * README fetcher (documentation text only, from raw.githubusercontent.com, no token sent).
 * Adds install/usage/screenshot facts and explicit successor hints written by the authors.
 */
import { analyzeReadme } from '../../src/core/readme'
import type { ProjectFacts } from '../../src/core/types'

const MAX_BYTES = 200_000

export async function enrichReadme(p: ProjectFacts, readmePath: string | null | undefined, unavailable: Set<string>): Promise<void> {
  if (!readmePath || p.quality.readme === false) {
    if (p.quality.readme == null) unavailable.add('readme')
    return
  }
  const url = `https://raw.githubusercontent.com/${p.fullName}/${encodeURIComponent(p.defaultBranch ?? 'HEAD')}/${readmePath.split('/').map(encodeURIComponent).join('/')}`
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'garys-repo-rescue-collector' } })
    if (!res.ok) {
      await res.body?.cancel()
      unavailable.add('readme')
      return
    }
    const text = (await res.text()).slice(0, MAX_BYTES)
    const f = analyzeReadme(text, p.fullName)
    p.quality.readmeBytes = f.bytes
    p.quality.installInstructions = f.hasInstall
    p.quality.usageSection = f.hasUsage
    p.quality.screenshots = f.hasScreenshots
    p.quality.deprecatedNotice = f.deprecatedNotice
    p.forkIntel.successorHints = f.successorHints
  } catch {
    unavailable.add('readme')
  }
}
