import { useEffect, useState, useSyncExternalStore } from 'react'

/** Tiny localStorage-backed stores. Wrapped in try/catch: storage can be missing or full. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

function createStore<T>(key: string, fallback: T) {
  let state = read(key, fallback)
  const subs = new Set<() => void>()
  return {
    get: () => state,
    set: (next: T) => {
      state = next
      write(key, next)
      subs.forEach((s) => s())
    },
    subscribe: (fn: () => void) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

export interface PersonalCollection { id: string; name: string; ids: string[] }

export const favoritesStore = createStore<string[]>('grr:favorites', [])
export const historyStore = createStore<{ id: string; at: string }[]>('grr:history', [])
export const compareStore = createStore<string[]>('grr:compare', [])
export const listsStore = createStore<PersonalCollection[]>('grr:lists', [])

export function useStore<T>(s: { get: () => T; subscribe: (f: () => void) => () => void }): T {
  return useSyncExternalStore(s.subscribe, s.get, s.get)
}

export function toggleFavorite(id: string) {
  const f = favoritesStore.get()
  favoritesStore.set(f.includes(id) ? f.filter((x) => x !== id) : [id, ...f])
}

export function toggleCompare(id: string) {
  const c = compareStore.get()
  compareStore.set(c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-4))
}

export function recordVisit(id: string) {
  const h = historyStore.get().filter((x) => x.id !== id)
  historyStore.set([{ id, at: new Date().toISOString() }, ...h].slice(0, 100))
}

export function usePrefersReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setR(m.matches)
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}

export function download(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
