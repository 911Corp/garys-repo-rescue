/**
 * Recomputes every assessment (scores, statuses, families, collections) from the facts already in
 * public/data/catalog.json, without any network request. Use after changing a rule in src/core.
 * The reference date stays the catalog's referenceDate so results remain reproducible.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { toProject } from '../src/core/assess'
import type { Catalog } from '../src/core/types'

const file = join(process.cwd(), 'public', 'data', 'catalog.json')
const cat = JSON.parse(readFileSync(file, 'utf8')) as Catalog
const ref = new Date(cat.meta.referenceDate)
const projects = cat.projects.map(({ a: _a, ...facts }) => toProject(facts, ref, cat.meta.baseline)).sort((a, b) => b.a.rescue.score - a.a.rescue.score)
writeFileSync(file, JSON.stringify({ meta: cat.meta, projects } satisfies Catalog))
console.log(`Reassessed ${projects.length} projects against ${cat.meta.referenceDate}.`)
