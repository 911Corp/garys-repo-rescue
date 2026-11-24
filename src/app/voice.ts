/**
 * Gary (sees potential) and Jarvis (checks the facts). Lowercase, dry, never mocking the authors.
 * Lines are picked deterministically from a seed so a page does not reshuffle on every render.
 */
export const LOADING = [
  'gary is blowing dust off the repos…',
  'jarvis is counting commits. all of them.',
  'digging through the strata…',
  'reading licenses so you do not have to. you still have to.',
]

export const RANDOM_INTROS = [
  'gary found another weekend project.',
  'someone cooked here.',
  "abandoned doesn't mean useless.",
  "the repo is archived. the idea isn't.",
  'last commit: a different era.',
  'gary sees potential. jarvis sees dependencies.',
]

export const EMPTY = [
  'nothing matches. gary blames the filters.',
  'zero results. jarvis suggests loosening one constraint.',
]

export function pick<T>(arr: T[], seed: string | number = Date.now()): T {
  const s = String(seed)
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return arr[Math.abs(h) % arr.length]
}

/** Jarvis's one-line verdict on a project, built from facts only. */
export function jarvisLine(p: import('../core/types').Project): string {
  const a = p.a
  if (a.licenseStatus === 'No Explicit License') return 'no license. look, admire, do not copy.'
  if (p.forkIntel.successorHints.length) return `the readme points elsewhere: ${p.forkIntel.successorHints[0].repo}. check there first.`
  if (p.forkIntel.possibleSuccessor) return `a fork is still moving: ${p.forkIntel.possibleSuccessor}. contributing beats forking.`
  if (a.maintenance === 'Active') return 'still alive. send a pull request, not a fork.'
  if (a.licenseStatus === 'Unknown') return 'jarvis recommends reading the license first. jarvis always does.'
  if (a.legacyTech.length) return `legacy stack detected: ${a.legacyTech.join(', ').toLowerCase()}. bring snacks.`
  if (p.quality.tests === false) return 'no tests detected. please read the readme before doing anything stupid.'
  if (a.maintenance === 'Stable') return 'quiet, not dead. it may just be finished.'
  return 'facts check out. the rest is your weekend.'
}

export function garyLine(p: import('../core/types').Project): string {
  const a = p.a
  if (a.families.includes('weird-wonderful')) return 'this is gloriously weird. gary approves.'
  if (a.difficulty === 'Beginner') return 'small enough to revive before monday. probably.'
  if (a.families.includes('archived-treasure')) return "the repo is archived. the idea isn't."
  if (a.families.includes('forgotten-software')) return 'last commit: a different era. imagine it with a 2026 ui.'
  if (a.families.includes('hidden-gem')) return 'someone cooked here and nobody noticed.'
  if (a.families.includes('ai-revival')) return 'an agent could write the missing tests by lunch.'
  return 'gary sees potential. jarvis sees dependencies.'
}
