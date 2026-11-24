import type { Project } from '../core/types'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function wrap(text: string, max: number, lines: number): string[] {
  const words = text.split(/\s+/)
  const out: string[] = []
  let cur = ''
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      out.push(cur.trim())
      cur = w
      if (out.length === lines) break
    } else cur += ` ${w}`
  }
  if (out.length < lines && cur.trim()) out.push(cur.trim())
  if (out.length === lines && words.join(' ').length > out.join(' ').length) out[lines - 1] = out[lines - 1].replace(/.{0,2}$/, '…')
  return out
}

/** 1200x675 share card (X / social), drawn as SVG then rasterized client-side. Facts only. */
export function shareCardSvg(p: Project, line: string): string {
  const a = p.a
  const desc = wrap(p.description ?? 'No description provided by the owner.', 58, 3)
  const y0 = new Date(p.createdAt).getUTCFullYear()
  const last = new Date(p.lastCommitAt ?? p.pushedAt ?? p.createdAt).getUTCFullYear()
  const now = new Date().getUTCFullYear()
  const span = Math.max(now - y0, 1)
  const lifeW = Math.max(12, ((last - y0) / span) * 1040)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs><pattern id="h" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" stroke="#3a4a5e" stroke-width="4"/></pattern></defs>
  <rect width="1200" height="675" fill="#141c26"/>
  <text x="80" y="92" font-family="IBM Plex Mono, monospace" font-size="26" fill="#8fd1c2">gary's repo rescue</text>
  <text x="80" y="170" font-family="IBM Plex Mono, monospace" font-size="30" fill="#9aa3ae">${esc(p.owner)}/</text>
  <text x="80" y="232" font-family="IBM Plex Mono, monospace" font-size="62" font-weight="600" fill="#ece5d6">${esc(p.name.length > 26 ? p.name.slice(0, 25) + '…' : p.name)}</text>
  ${desc.map((l, i) => `<text x="80" y="${296 + i * 40}" font-family="IBM Plex Sans, sans-serif" font-size="30" fill="#c9c3b6">${esc(l)}</text>`).join('')}
  <rect x="80" y="440" width="1040" height="22" fill="url(#h)"/>
  <rect x="80" y="440" width="${lifeW}" height="22" fill="#5fb3a1"/>
  <text x="80" y="492" font-family="IBM Plex Mono, monospace" font-size="20" fill="#9aa3ae">${y0}</text>
  <text x="1120" y="492" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="20" fill="#9aa3ae">${now}</text>
  <text x="80" y="566" font-family="IBM Plex Mono, monospace" font-size="56" font-weight="600" fill="#e2b04a">${a.rescue.score}</text>
  <text x="170" y="548" font-family="IBM Plex Sans, sans-serif" font-size="22" fill="#9aa3ae">rescue score</text>
  <text x="170" y="574" font-family="IBM Plex Sans, sans-serif" font-size="22" fill="#ece5d6">${esc(a.maintenance)} · ${esc(p.license.spdx && p.license.spdx !== 'NOASSERTION' ? p.license.spdx : a.licenseStatus)} · ★ ${p.stars}</text>
  <text x="80" y="630" font-family="IBM Plex Mono, monospace" font-size="24" fill="#8fd1c2">${esc(line)}</text>
  <text x="1120" y="630" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="20" fill="#6b7686">@Gary_NGMI</text>
</svg>`
}

export async function downloadShareCard(p: Project, line: string) {
  const svg = shareCardSvg(p, line)
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej(new Error('render failed'))
    img.src = url
  })
  const c = document.createElement('canvas')
  c.width = 1200
  c.height = 675
  c.getContext('2d')!.drawImage(img, 0, 0)
  URL.revokeObjectURL(url)
  const a = document.createElement('a')
  a.download = `${p.fullName.replace('/', '__')}-rescue-card.png`
  a.href = c.toDataURL('image/png')
  a.click()
}
