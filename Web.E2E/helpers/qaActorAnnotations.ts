import type { TestInfo } from '@playwright/test'
import { QA_ROLE_LABELS, type QaRoleId } from '../config/qaTestAccounts'
import type { ProvisioningPersonaId } from '../config/provisioningUsers'

/** Cómo entra el actor a la prueba (sin sesión, Firebase QA, mock local, API simulada). */
export type QaExecutionMode =
  | 'sin_sesion'
  | 'firebase_login'
  | 'mock_localStorage'
  | 'mock_api'

const MODE_LABELS: Record<QaExecutionMode, string> = {
  sin_sesion: 'Sin sesión (visitante)',
  firebase_login: 'Login Firebase (cuenta QA)',
  mock_localStorage: 'Sesión mock (localStorage + token)',
  mock_api: 'Sesión mock + rutas API simuladas',
}

export type QaActorRef = QaRoleId | QaRoleId[] | 'visitante' | 'diagnostico' | 'mock_padre_fixture'

export function provisioningPersonaToQaRole(id: ProvisioningPersonaId): QaRoleId {
  return id
}

function formatActorRef(ref: QaActorRef): string {
  if (ref === 'visitante') return 'Visitante (sin sesión)'
  if (ref === 'diagnostico') return 'Diagnóstico (credenciales probe, no cuenta QA)'
  if (ref === 'mock_padre_fixture') return 'Mock — padre genérico (test@example.com / TestHelpers)'
  const list = Array.isArray(ref) ? ref : [ref]
  return list.map((r) => QA_ROLE_LABELS[r]).join(' + ')
}

/**
 * Anotación visible en reporte HTML / UI de Playwright: quién ejecuta la prueba.
 */
export function annotateQaActors(
  testInfo: TestInfo,
  actor: QaActorRef,
  mode: QaExecutionMode,
  detail?: string
): void {
  const who = formatActorRef(actor)
  const how = MODE_LABELS[mode]
  testInfo.annotations.push({
    type: 'qa-actor',
    description: detail ? `${who} · ${how} — ${detail}` : `${who} · ${how}`,
  })
}

export function annotateSuiteDefaultActor(testInfo: TestInfo, actor: QaActorRef, mode: QaExecutionMode): void {
  annotateQaActors(testInfo, actor, mode, 'default de la suite')
}
