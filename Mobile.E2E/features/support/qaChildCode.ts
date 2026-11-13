import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as QRCode from 'qrcode'

const EMAIL_PLUS_PATH = '/family-profiles/parental-consent/email-plus'

export interface QaChildCode {
    childId: string
    childName: string
    familyId: string
    parentToken: string
    token: string
    /** PNG with the same payload the parent dashboard downloads (buildChildQRData in astro-kid-web). */
    qrPng: Buffer
    /** True when the PNG came from Web.E2E `.cache/child-qr` (do not DELETE the child). */
    fromWebCache?: boolean
}

/** Default path written by Web.E2E `09-child-qr-download` (run from repo root or Mobile.E2E). */
export function defaultWebChildQrPngPath(): string {
    return path.resolve(__dirname, '../../../Web.E2E/.cache/child-qr/latest.png')
}

export function defaultWebChildQrMetaPath(): string {
    return path.resolve(__dirname, '../../../Web.E2E/.cache/child-qr/latest.json')
}

/**
 * Optional bridge: use the PNG the parent downloaded in Playwright.
 * Set ASTROKID_USE_WEB_QR=1 and/or ASTROKID_QR_PNG=/path/to/file.png
 */
export function tryLoadWebDownloadedChildQr(): QaChildCode | null {
    const explicit = process.env.ASTROKID_QR_PNG?.trim()
    const useFlag = process.env.ASTROKID_USE_WEB_QR?.trim() === '1'
    if (!explicit && !useFlag) return null

    const pngPath = explicit || defaultWebChildQrPngPath()
    if (!fs.existsSync(pngPath)) {
        throw new Error(
            `ASTROKID_USE_WEB_QR/ASTROKID_QR_PNG activo pero no hay PNG en ${pngPath}. ` +
                'Corré antes Web.E2E specs/01-provisioning/09-child-qr-download.spec.ts',
        )
    }
    const qrPng = fs.readFileSync(pngPath)
    if (qrPng.length < 200) {
        throw new Error(`QR PNG demasiado pequeño: ${pngPath}`)
    }

    let childName = 'child'
    const metaPath = explicit
        ? path.join(path.dirname(explicit), `${path.basename(explicit, path.extname(explicit))}.json`)
        : defaultWebChildQrMetaPath()
    try {
        const meta = JSON.parse(fs.readFileSync(
            fs.existsSync(metaPath) ? metaPath : defaultWebChildQrMetaPath(),
            'utf8',
        )) as { childName?: string }
        if (meta.childName?.trim()) childName = meta.childName.trim()
    } catch {
        // meta optional for gallery login; welcome step may be softer
    }

    return {
        childId: 'web-cache',
        childName,
        familyId: '',
        parentToken: '',
        token: '',
        qrPng,
        fromWebCache: true,
    }
}

interface ParentSession {
    email: string
    token: string
    devLogin: boolean
}

function apiBaseUrl(): string {
    const base = process.env.ASTROKID_BASE_URL?.trim()
    if (!base) {
        throw new Error(
            'Define ASTROKID_BASE_URL. Esta suite crea un niño y no elige un backend por defecto.')
    }
    return base.replace(/\/$/, '')
}

async function call<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    if (!response.ok) {
        throw new Error(`${method} ${path} devolvió ${response.status}: ${text.slice(0, 300)}`)
    }
    return (text ? JSON.parse(text) : {}) as T
}

function emailFromJwt(token: string): string | undefined {
    try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
        return payload.email ?? payload.sub
    } catch {
        return undefined
    }
}

/**
 * Deployed backends (QA included) reject /auth/dev-login on purpose, so there the run needs
 * ASTROKID_PARENT_TOKEN: a bearer for a QA parent issued by the normal login.
 * Without it, dev-login with a fresh address only works against a local backend.
 */
async function parentSession(): Promise<ParentSession> {
    const token = process.env.ASTROKID_PARENT_TOKEN
    if (token) {
        const email = process.env.ASTROKID_PARENT_EMAIL ?? emailFromJwt(token)
        if (!email) throw new Error('No se pudo leer el email de ASTROKID_PARENT_TOKEN; define ASTROKID_PARENT_EMAIL.')
        return { email, token, devLogin: false }
    }

    const email = `delivered+mobile-qr-login-${randomUUID().replace(/-/g, '')}@resend.dev`
    const response = await fetch(`${apiBaseUrl()}/auth/dev-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: 'QA Parent' }),
    })
    if (response.status === 404) {
        throw new Error(
            `${apiBaseUrl()} no tiene /auth/dev-login (los entornos desplegados lo apagan). ` +
            'Define ASTROKID_PARENT_TOKEN con el token de un padre de QA.')
    }
    if (!response.ok) throw new Error(`POST /auth/dev-login devolvió ${response.status}: ${await response.text()}`)
    return { email, token: ((await response.json()) as { access_token: string }).access_token, devLogin: true }
}

/**
 * Same walk as CompleteEmailPlusAsync in API.Tests/BaseApiTest.cs.
 * Needs COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true on the QA backend (never in production).
 */
async function completeEmailPlus(parentToken: string): Promise<void> {
    const status = await fetch(`${apiBaseUrl()}${EMAIL_PLUS_PATH}`, {
        headers: { Authorization: `Bearer ${parentToken}` },
    })
    if (status.status === 404 || status.status === 405) return
    if (!status.ok) throw new Error(`GET ${EMAIL_PLUS_PATH} devolvió ${status.status}`)
    if (((await status.json()) as { status?: string }).status === 'confirmed') return

    const start = await call<{ status?: string; token?: string }>(
        'POST', `${EMAIL_PLUS_PATH}/start`, { locale: 'es' }, parentToken)
    if (start.status === 'confirmed') return

    let link = start.token
    for (let step = 0; step < 2; step++) {
        if (!link) {
            throw new Error('El backend no expone el token de email-plus. Activa COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true solo en QA.')
        }
        const consume = await call<{ status?: string; token?: string }>(
            'POST', `${EMAIL_PLUS_PATH}/consume`, { token: link, locale: 'es' })
        if (consume.status === 'confirmed') return
        link = consume.token
    }
    throw new Error('El flujo email-plus no llegó a "confirmed".')
}

/** A new child for a consented QA parent, with a fresh login code and its QR image. */
export async function createQaChildCode(firstName: string, age = 8): Promise<QaChildCode> {
    const parent = await parentSession()
    // A local backend for this suite runs with COPPA_EMAIL_PLUS_REQUIRED=false, like its own conftest.
    if (!parent.devLogin) await completeEmailPlus(parent.token)

    const childName = `${firstName} ${randomUUID().slice(0, 4)}`
    const birthdate = new Date()
    birthdate.setFullYear(birthdate.getFullYear() - age)
    // With an existing family the backend adds this child to it.
    const family = await call<{ id: string; children: Array<{ id: string; name: string }> }>('POST', '/family-profiles/', {
        parent: { parent_name: 'QA Parent', parent_email: parent.email },
        child: {
            name: childName,
            birthdate: birthdate.toISOString().slice(0, 10),
            age,
            interests: ['space'],
            // A chosen companion sends the child from the intro straight to the home screen.
            avatarId: 'nova',
            parental_consent_acknowledged: true,
            household_country: 'CR',
            selectedAdjectives: [
                { id: '1', word: 'curious', category: 'personality', emoji: '🤔' },
                { id: '2', word: 'brave', category: 'personality', emoji: '🦁' },
                { id: '3', word: 'creative', category: 'personality', emoji: '🎨' },
            ],
        },
    }, parent.token)
    const child = family.children.find(c => c.name === childName)
    if (!child) throw new Error(`family-profiles no devolvió al niño ${childName}`)

    const session = await call<{ token: string; expires_at?: string }>('POST', '/child-tokens/generate', {
        child_id: child.id,
        parent_email: parent.email,
        child_name: childName,
        age,
    }, parent.token)

    const payload = {
        childId: child.id,
        token: session.token,
        expiresAt: session.expires_at ?? '',
        parentEmail: parent.email,
        childName,
        age,
        appUrl: 'astrokid://auth',
    }
    const qrPng = await QRCode.toBuffer(JSON.stringify(payload), {
        type: 'png',
        width: 600,
        margin: 4,
        errorCorrectionLevel: 'M',
    })

    return {
        childId: child.id,
        childName,
        familyId: family.id,
        parentToken: parent.token,
        token: session.token,
        qrPng,
    }
}

/** Deletes the child and all of its activity, so runs against a shared QA parent do not pile up. */
export async function removeQaChild(code: QaChildCode): Promise<void> {
    if (code.fromWebCache || !code.familyId || !code.parentToken) return
    await call('DELETE', `/family-profiles/${code.familyId}/children/${code.childId}`, undefined, code.parentToken)
}
