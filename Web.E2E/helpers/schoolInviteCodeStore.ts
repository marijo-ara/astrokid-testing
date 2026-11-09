/** Código de familias (activación admin en QA; fallback REGISTRO_SCHOOL_INVITE_CODE). */

import fs from 'fs'
import path from 'path'

const CACHE_DIR = path.join(__dirname, '..', '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'school-invite-code.txt')

let capturedInviteCode: string | undefined

function readCachedInviteCode(): string | undefined {
  try {
    const value = fs.readFileSync(CACHE_FILE, 'utf8').trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function writeCachedInviteCode(code: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, code, 'utf8')
}

export function rememberSchoolInviteCode(code: string | undefined | null): void {
  const trimmed = code?.trim()
  if (!trimmed) return
  capturedInviteCode = trimmed
  writeCachedInviteCode(trimmed)
}

export function resolveSchoolInviteCode(): string | undefined {
  if (capturedInviteCode?.trim()) return capturedInviteCode.trim()
  const fromCache = readCachedInviteCode()
  if (fromCache) return fromCache
  const fromEnv = process.env.REGISTRO_SCHOOL_INVITE_CODE?.trim()
  return fromEnv || undefined
}

export function hasResolvableSchoolInviteCode(): boolean {
  return Boolean(resolveSchoolInviteCode())
}
