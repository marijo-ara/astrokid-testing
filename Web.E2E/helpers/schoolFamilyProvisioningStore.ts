/** Nombre del niño visto en dashboard tras canje (para validación en escritorio del coordinador). */

import fs from 'fs'
import path from 'path'

const CACHE_DIR = path.join(__dirname, '..', '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'school-family-child-given.txt')

let capturedChildGivenName: string | undefined

function readCachedChildGiven(): string | undefined {
  try {
    const value = fs.readFileSync(CACHE_FILE, 'utf8').trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function writeCachedChildGiven(name: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, name, 'utf8')
}

export function rememberProvisionedChildGivenName(name: string | undefined | null): void {
  const trimmed = name?.trim()
  if (!trimmed) return
  capturedChildGivenName = trimmed
  writeCachedChildGiven(trimmed)
}

export function resolveProvisionedChildGivenName(): string {
  const fromEnv = process.env.REGISTRO_CHILD_GIVEN_NAME?.trim()
  if (fromEnv) return fromEnv
  if (capturedChildGivenName?.trim()) return capturedChildGivenName.trim()
  const fromCache = readCachedChildGiven()
  if (fromCache) return fromCache
  return 'Proton'
}
