import type { QualitySignals } from './types'

/** A root directory entry as returned by GET /repos/{o}/{r}/contents/ */
export interface RootEntry {
  name: string
  type: 'file' | 'dir' | 'symlink' | 'submodule' | string
}

export const MANIFESTS = [
  'package.json', 'bower.json', 'Gruntfile.js', 'gulpfile.js', 'deno.json', 'requirements.txt', 'setup.py',
  'pyproject.toml', 'Pipfile', 'environment.yml', 'Cargo.toml', 'go.mod', 'Gemfile', 'composer.json', 'pom.xml',
  'build.gradle', 'build.gradle.kts', 'build.sbt', 'project.clj', 'deps.edn', 'CMakeLists.txt', 'Makefile',
  'configure.ac', 'meson.build', 'SConstruct', 'Package.swift', 'Podfile', 'Cartfile', 'pubspec.yaml', 'mix.exs',
  'rebar.config', 'stack.yaml', 'dune-project', 'shard.yml', 'nimble', 'build.zig', 'cpanfile', 'Makefile.PL',
  'DESCRIPTION', 'Project.toml', 'docker-compose.yml', 'docker-compose.yaml', 'Vagrantfile', 'flake.nix',
]
const MANIFEST_EXT = [/\.csproj$/i, /\.sln$/i, /\.fsproj$/i, /\.cabal$/i, /\.nimble$/i, /\.xcodeproj$/i, /\.gemspec$/i, /\.rockspec$/i]

const CI_FILES: Record<string, string> = {
  '.travis.yml': 'Travis CI',
  '.circleci': 'CircleCI',
  '.gitlab-ci.yml': 'GitLab CI',
  'appveyor.yml': 'AppVeyor',
  '.appveyor.yml': 'AppVeyor',
  'azure-pipelines.yml': 'Azure Pipelines',
  'Jenkinsfile': 'Jenkins',
  '.drone.yml': 'Drone',
  '.woodpecker.yml': 'Woodpecker',
  'bitbucket-pipelines.yml': 'Bitbucket Pipelines',
}

const TEST_DIRS = new Set(['test', 'tests', 'spec', 'specs', '__tests__', 't', 'testing', 'e2e', 'cypress', 'test_suite', 'testdata', 'unittests', 'unit_tests'])
const TEST_FILES = [/^jest\.config\./i, /^pytest\.ini$/i, /^tox\.ini$/i, /^karma\.conf\./i, /^\.mocharc/i, /^vitest\.config\./i, /^phpunit\.xml/i, /^playwright\.config\./i, /^conftest\.py$/i, /^noxfile\.py$/i]
const DOC_DIRS = new Set(['docs', 'doc', 'documentation', 'website', 'book', 'manual', 'wiki', 'guide'])
const DOC_FILES = [/^mkdocs\.ya?ml$/i, /^docusaurus\.config\./i, /^book\.toml$/i, /^\.readthedocs\.ya?ml$/i]
const EXAMPLE_DIRS = new Set(['examples', 'example', 'demo', 'demos', 'samples', 'sample', 'showcase', 'playground'])

export function detectFromRoot(entries: RootEntry[], hasGithubWorkflows: boolean | null): QualitySignals {
  const names = entries.map((e) => e.name)
  const lower = new Set(names.map((n) => n.toLowerCase()))
  const dirs = new Set(entries.filter((e) => e.type === 'dir').map((e) => e.name.toLowerCase()))
  const has = (re: RegExp) => names.some((n) => re.test(n))

  const ciProviders: string[] = []
  if (hasGithubWorkflows) ciProviders.push('GitHub Actions')
  for (const [file, label] of Object.entries(CI_FILES)) if (lower.has(file.toLowerCase())) ciProviders.push(label)

  const manifests = names.filter((n) => MANIFESTS.includes(n) || MANIFEST_EXT.some((r) => r.test(n)))

  return {
    readme: has(/^readme(\.|$)/i),
    licenseFile: has(/^(licen[cs]e|copying|unlicense)(\.|$|-)/i),
    docs: [...dirs].some((d) => DOC_DIRS.has(d)) || DOC_FILES.some((r) => has(r)),
    examples: [...dirs].some((d) => EXAMPLE_DIRS.has(d)),
    tests: [...dirs].some((d) => TEST_DIRS.has(d)) || TEST_FILES.some((r) => has(r)),
    ci: ciProviders.length > 0,
    ciProviders,
    contributing: has(/^contributing(\.|$)/i),
    changelog: has(/^(changelog|changes|history|news|releases)(\.|$)/i),
    dockerfile: has(/^dockerfile/i) || has(/^docker-compose\.ya?ml$/i),
    manifests,
    rootEntries: entries.length,
    readmeBytes: null,
    installInstructions: null,
    usageSection: null,
    screenshots: null,
    deprecatedNotice: null,
  }
}

export const UNKNOWN_QUALITY: QualitySignals = {
  readme: null, licenseFile: null, docs: null, examples: null, tests: null, ci: null, ciProviders: [],
  contributing: null, changelog: null, dockerfile: null, manifests: [], rootEntries: null,
  readmeBytes: null, installInstructions: null, usageSection: null, screenshots: null, deprecatedNotice: null,
}

/** Technologies that usually signal a modernization opportunity. Matched on facts only. */
export const LEGACY_TECH: { id: string; label: string; test: (p: LegacyInput) => boolean }[] = [
  { id: 'coffeescript', label: 'CoffeeScript', test: (p) => p.langs.includes('CoffeeScript') },
  { id: 'actionscript', label: 'ActionScript / Flash', test: (p) => p.langs.includes('ActionScript') || p.topics.includes('flash') },
  { id: 'angularjs', label: 'AngularJS 1.x', test: (p) => p.topics.includes('angularjs') || p.topics.includes('angular1') },
  { id: 'backbone', label: 'Backbone.js', test: (p) => p.topics.includes('backbone') || p.topics.includes('backbonejs') },
  { id: 'jquery', label: 'jQuery-era frontend', test: (p) => p.topics.includes('jquery') || p.topics.includes('jquery-plugin') },
  { id: 'bower', label: 'Bower', test: (p) => p.manifests.includes('bower.json') },
  { id: 'grunt', label: 'Grunt', test: (p) => p.manifests.includes('Gruntfile.js') },
  { id: 'gulp', label: 'Gulp', test: (p) => p.manifests.includes('gulpfile.js') },
  { id: 'python2', label: 'Python 2', test: (p) => p.topics.includes('python2') || /\bpython ?2(\.\d)?\b/i.test(p.description) },
  { id: 'objc', label: 'Objective-C', test: (p) => p.primary === 'Objective-C' },
  { id: 'travis', label: 'Travis CI config', test: (p) => p.ci.includes('Travis CI') },
  { id: 'meteor', label: 'Meteor', test: (p) => p.topics.includes('meteor') || p.topics.includes('meteorjs') },
  { id: 'polymer', label: 'Polymer', test: (p) => p.topics.includes('polymer') },
  { id: 'cordova', label: 'Cordova / PhoneGap', test: (p) => p.topics.includes('cordova') || p.topics.includes('phonegap') },
  { id: 'gwt', label: 'GWT', test: (p) => p.topics.includes('gwt') },
  { id: 'vb', label: 'Visual Basic', test: (p) => p.primary === 'Visual Basic' || p.primary === 'Visual Basic .NET' || p.primary === 'VBA' },
  { id: 'delphi', label: 'Delphi / Pascal', test: (p) => p.primary === 'Pascal' || p.primary === 'Delphi' },
]

export interface LegacyInput {
  langs: string[]
  primary: string | null
  topics: string[]
  manifests: string[]
  ci: string[]
  description: string
}

export function detectLegacy(p: LegacyInput): string[] {
  return LEGACY_TECH.filter((t) => t.test(p)).map((t) => t.label)
}

export const MAINSTREAM_LANGS = new Set([
  'JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Kotlin', 'C#', 'C', 'C++', 'PHP', 'Ruby', 'Swift',
  'Dart', 'Shell', 'Lua', 'Elixir', 'Scala', 'Vue', 'Svelte', 'HTML', 'CSS', 'Zig',
])
