import { useEffect, useState } from 'react'

/** Hash router: works on any static host (GitHub Pages, Netlify, file preview) without rewrites. */
export interface Route { path: string[]; query: string }

function parse(): Route {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [p, q = ''] = h.split('?')
  return { path: p.split('/').filter(Boolean).map(decodeURIComponent), query: q }
}

export function useRoute(): Route {
  const [r, setR] = useState(parse)
  useEffect(() => {
    const on = () => {
      setR(parse())
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return r
}

export function href(path: string, query?: string): string {
  return `#/${path.replace(/^\//, '')}${query ? `?${query}` : ''}`
}

export function go(path: string, query?: string, replace = false) {
  const h = href(path, query)
  if (replace) history.replaceState(null, '', h)
  else window.location.hash = h
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export const projectPath = (fullName: string) => `p/${fullName}`
