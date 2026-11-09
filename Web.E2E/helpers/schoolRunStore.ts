/**
 * Nombre del colegio en la corrida provisioning (único por defecto; compartido entre los 8 pasos).
 * No va datos personales en git: solo `.cache/school-provisioning-name.txt`.
 */

import fs from 'fs'
import path from 'path'

/** Ejecutar `npm run test:*` desde `Web.E2E` (mismo criterio que otros `.cache/*`). */
const CACHE_DIR = path.join(process.cwd(), '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'school-provisioning-name.txt')

let runSchoolName: string | undefined

function readCachedName(): string | undefined {
  try {
    const value = fs.readFileSync(CACHE_FILE, 'utf8').trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function writeCachedName(name: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, name, 'utf8')
}

export function resolveSchoolNameBase(): string {
  return (
    process.env.REGISTRO_SCHOOL_NAME?.trim() ||
    process.env.SMOKE_SCHOOL_NAME?.trim() ||
    'Colegio Proton QA'
  )
}

function buildTimestampSuffix(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}

/** Fija el nombre usado en toda la suite «Activar Licencia Escolar» de esta corrida. */
export function ensureProvisioningSchoolNameForRun(): string {
  if (process.env.REGISTRO_ESCUELA_FIXED_SCHOOL === '1') {
    return resolveSchoolNameBase()
  }

  const explicitSuffix = process.env.REGISTRO_SCHOOL_NAME_SUFFIX?.trim()
  if (explicitSuffix) {
    runSchoolName = `${resolveSchoolNameBase()} ${explicitSuffix}`.trim()
    writeCachedName(runSchoolName)
    return runSchoolName
  }

  if (runSchoolName?.trim()) return runSchoolName.trim()

  const reuseCached = process.env.REGISTRO_ESCUELA_REUSE_CACHED_SCHOOL === '1'
  const fromCache = readCachedName()
  if (reuseCached && fromCache) {
    runSchoolName = fromCache
    return fromCache
  }

  runSchoolName = `${resolveSchoolNameBase()} ${buildTimestampSuffix()}`
  writeCachedName(runSchoolName)
  return runSchoolName
}

export function rememberProvisioningSchoolName(name: string | undefined | null): void {
  const trimmed = name?.trim()
  if (!trimmed) return
  runSchoolName = trimmed
  writeCachedName(trimmed)
}

export function resolveProvisioningSchoolName(): string {
  return ensureProvisioningSchoolNameForRun()
}

export function resetProvisioningSchoolNameForTests(): void {
  runSchoolName = undefined
  try {
    fs.unlinkSync(CACHE_FILE)
  } catch {
    /* absent */
  }
}
