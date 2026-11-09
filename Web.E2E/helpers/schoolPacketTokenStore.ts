/** Token del enlace /escuela/acuerdo (respuesta send-agreement en QA; no va en .env). */

import fs from 'fs'
import path from 'path'

const CACHE_DIR = path.join(__dirname, '..', '.cache')
const CACHE_FILE = path.join(CACHE_DIR, 'school-packet-url.txt')

let capturedUploadUrl: string | undefined

function readCachedUploadUrl(): string | undefined {
  try {
    const value = fs.readFileSync(CACHE_FILE, 'utf8').trim()
    return value || undefined
  } catch {
    return undefined
  }
}

function writeCachedUploadUrl(url: string): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(CACHE_FILE, url, 'utf8')
}

export function rememberSchoolPacketUploadUrl(url: string | undefined | null): void {
  const trimmed = url?.trim()
  if (!trimmed) return
  capturedUploadUrl = trimmed
  writeCachedUploadUrl(trimmed)
}

export function pickSchoolPacketUploadUrl(): string | undefined {
  if (capturedUploadUrl?.trim()) return capturedUploadUrl.trim()
  return readCachedUploadUrl()
}

export function hasResolvableSchoolPacketLink(): boolean {
  return Boolean(resolveSchoolPacketToken())
}

export function parseSchoolPacketTokenFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url, 'https://astro-kid.invalid')
    return parsed.searchParams.get('token')?.trim() || undefined
  } catch {
    const match = url.match(/[?&]token=([^&]+)/)
    return match?.[1] ? decodeURIComponent(match[1]) : undefined
  }
}

export function resolveSchoolPacketToken(): string | undefined {
  const live = pickSchoolPacketUploadUrl()
  if (live) {
    const token = parseSchoolPacketTokenFromUrl(live)
    if (token) return token
  }

  const fromEnv = process.env.REGISTRO_SCHOOL_PACKET_TOKEN?.trim()
  if (fromEnv) return fromEnv

  const fromLink =
    process.env.REGISTRO_SCHOOL_PACKET_URL?.trim() ||
    process.env.REGISTRO_SCHOOL_PACKET_LINK?.trim()
  if (fromLink) {
    return parseSchoolPacketTokenFromUrl(fromLink)
  }

  return undefined
}

/** Ruta relativa para `page.goto` (enlace del correo o token capturado en send-agreement). */
export function resolveSchoolPacketAcuerdoPath(): string | undefined {
  const live = pickSchoolPacketUploadUrl()
  if (live) {
    try {
      const parsed = new URL(live, 'https://astro-kid.invalid')
      if (parsed.pathname.includes('/escuela/acuerdo')) {
        return `${parsed.pathname}${parsed.search}`
      }
    } catch {
      if (live.includes('/escuela/acuerdo')) {
        return live.startsWith('/') ? live : `/${live.replace(/^\//, '')}`
      }
    }
  }

  const fromLink =
    process.env.REGISTRO_SCHOOL_PACKET_URL?.trim() ||
    process.env.REGISTRO_SCHOOL_PACKET_LINK?.trim()
  if (fromLink) {
    try {
      const parsed = new URL(fromLink, 'https://astro-kid.invalid')
      if (parsed.pathname.includes('/escuela/acuerdo')) {
        return `${parsed.pathname}${parsed.search}`
      }
    } catch {
      if (fromLink.includes('/escuela/acuerdo')) {
        return fromLink.startsWith('/') ? fromLink : `/${fromLink.replace(/^\//, '')}`
      }
    }
  }

  const token = resolveSchoolPacketToken()
  if (!token) return undefined
  return `/escuela/acuerdo?token=${encodeURIComponent(token)}`
}
