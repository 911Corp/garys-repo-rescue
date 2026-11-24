import type { LicenseInfo, LicenseStatus } from './types'

/** SPDX identifiers grouped by reuse family. Documented in docs/SCORING.md. */
export const PERMISSIVE = new Set([
  'MIT', 'MIT-0', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSD-3-Clause-Clear', 'BSD-4-Clause',
  'ISC', '0BSD', 'Unlicense', 'Zlib', 'CC0-1.0', 'WTFPL', 'BSL-1.0', 'Artistic-2.0', 'PostgreSQL',
  'NCSA', 'UPL-1.0', 'MS-PL', 'AFL-3.0', 'ECL-2.0', 'OFL-1.1', 'CC-BY-4.0', 'Vim', 'X11', 'JSON',
])

export const COPYLEFT = new Set([
  'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'LGPL-2.1', 'LGPL-2.1-only', 'LGPL-2.1-or-later',
  'LGPL-3.0', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'MPL-2.0', 'EPL-1.0', 'EPL-2.0', 'EUPL-1.1',
  'EUPL-1.2', 'CDDL-1.0', 'CDDL-1.1', 'OSL-3.0', 'CECILL-2.1', 'MS-RL', 'CC-BY-SA-4.0', 'LPPL-1.3c',
])

/** Licenses with usage restrictions that are not OSI open source (non-commercial, source-available...). */
export const RESTRICTED_PATTERNS = [/-NC/i, /-ND/i, /^SSPL/i, /^BUSL/i, /^Elastic/i, /Commons-Clause/i, /PolyForm/i]

export function licenseStatus(lic: LicenseInfo, licenseFile: boolean | null): { status: LicenseStatus; note: string } {
  const spdx = lic.spdx
  if (!spdx) {
    if (licenseFile === true) {
      return { status: 'Unknown', note: 'A license file seems present but GitHub could not identify it. Read it before reusing anything.' }
    }
    if (licenseFile === false) {
      return {
        status: 'No Explicit License',
        note: 'No license detected. Public code without a license is NOT free to reuse: default copyright applies. Ask the author or contribute upstream.',
      }
    }
    return { status: 'Unknown', note: 'License information was not collected.' }
  }
  if (spdx === 'NOASSERTION' || spdx === 'OTHER') {
    return { status: 'Unknown', note: 'GitHub detected a license file it could not match to a known license. Read it before reusing anything.' }
  }
  if (RESTRICTED_PATTERNS.some((p) => p.test(spdx))) {
    return { status: 'Other Restrictions', note: `${spdx} restricts some uses (often commercial use or derivatives). Read the terms.` }
  }
  if (PERMISSIVE.has(spdx)) {
    return { status: 'Permissive', note: `${spdx}: reuse, modification and redistribution allowed, usually with attribution and license notice kept.` }
  }
  if (COPYLEFT.has(spdx)) {
    return { status: 'Copyleft', note: `${spdx}: derivatives generally must stay under the same or a compatible license. Check network-use clauses (AGPL).` }
  }
  return { status: 'Other Restrictions', note: `${spdx}: uncommon license, read it before reuse.` }
}

export function isReusable(status: LicenseStatus): boolean {
  return status === 'Permissive' || status === 'Copyleft'
}
