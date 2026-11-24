import { useEffect, useRef } from 'react'
import { CatalogProvider } from './app/data'
import { href, useRoute } from './app/router'
import { compareStore, favoritesStore, useStore } from './app/store'
import { LOADING, pick } from './app/voice'
import { CollectionPage, CollectionsIndex, Finder, NotFound, RandomRescue } from './pages/Discover'
import { Explore } from './pages/Explore'
import { Home } from './pages/Home'
import { Method } from './pages/Method'
import { ProjectPage } from './pages/Project'
import { Compare, Saved } from './pages/Saved'
import { Gary } from './ui/bits'

const NAV = [
  { path: 'explore', label: 'Explore' },
  { path: 'collections', label: 'Collections' },
  { path: 'random', label: 'Random' },
  { path: 'finder', label: 'Finder' },
  { path: 'method', label: 'Method' },
]

export default function App() {
  const route = useRoute()
  const main = useRef<HTMLElement>(null)
  const section = route.path[0] ?? ''
  useEffect(() => {
    window.scrollTo(0, 0)
    if (section !== 'p') document.title = "Gary's Repo Rescue"
    main.current?.focus({ preventScroll: true })
  }, [route.path.join('/'), section])

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <a className="brand" href={href('')} aria-label="Gary's Repo Rescue, home">
          <Gary size={30} />
          <span className="brand-name">gary's repo rescue</span>
        </a>
        <nav aria-label="Main">
          <ul>
            {NAV.map((n) => <li key={n.path}><a href={href(n.path)} aria-current={section === n.path ? 'page' : undefined}>{n.label}</a></li>)}
            <li><SavedLink current={section === 'saved'} /></li>
            <CompareLink current={section === 'compare'} />
          </ul>
        </nav>
      </header>
      <main id="main" ref={main} tabIndex={-1}>
        <CatalogProvider
          fallback={<div className="loading" role="status"><p>{pick(LOADING)}</p></div>}
          error={(m) => <div className="empty" role="alert"><h1>The catalog did not load</h1><p>{m}</p></div>}
        >
          <Page route={route} />
        </CatalogProvider>
      </main>
      <footer className="foot">
        <p>Built by Gary. Rescued with Jarvis.</p>
        <p className="muted small">Data from GitHub and ecosyste.ms (CC BY-SA 4.0). Scores are heuristics from public metadata, not legal or security advice. Projects belong to their authors. <a href="https://x.com/Gary_NGMI" target="_blank" rel="noreferrer">@Gary_NGMI</a></p>
      </footer>
    </>
  )
}

function SavedLink({ current }: { current: boolean }) {
  const n = useStore(favoritesStore).length
  return <a href={href('saved')} aria-current={current ? 'page' : undefined}>Saved{n ? <span className="count"> {n}</span> : ''}</a>
}
function CompareLink({ current }: { current: boolean }) {
  const n = useStore(compareStore).length
  if (!n) return null
  return <li><a href={href('compare')} aria-current={current ? 'page' : undefined}>Compare<span className="count"> {n}</span></a></li>
}

function Page({ route }: { route: ReturnType<typeof useRoute> }) {
  const [a, ...rest] = route.path
  switch (a) {
    case undefined: return <Home />
    case 'explore': return <Explore route={route} />
    case 'collections': return <CollectionsIndex />
    case 'c': return <CollectionPage id={rest[0] ?? ''} />
    case 'random': return <RandomRescue route={route} />
    case 'finder': return <Finder route={route} />
    case 'p': return <ProjectPage fullName={rest.join('/')} />
    case 'saved': return <Saved />
    case 'compare': return <Compare />
    case 'method': return <Method />
    default: return <NotFound />
  }
}
