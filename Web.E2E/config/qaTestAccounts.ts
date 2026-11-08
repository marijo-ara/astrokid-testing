/**
 * Cuentas canónicas QA = provisioning (`REGISTRO_*` + `REGISTRO_SUITE_PASSWORD`) con
 * overrides opcionales `SMOKE_*`. Usar en login real y como identidad en mocks API.
 */

import {
  PROVISIONING_ROLES,
  type ProvisioningRoleId,
  resolveProvisioningAdmin,
  resolveProvisioningEmail,
  resolveProvisioningPassword,
} from './provisioningUsers'
import type { SmokeAccount } from '../helpers/smokeAccount'

export type QaRoleId =
  | 'admin_plataforma'
  | 'coordinador_escuela'
  | 'familia_free'
  | 'familia_escolar'
  | 'familia_premium'

export const QA_ROLE_LABELS: Record<QaRoleId, string> = {
  admin_plataforma: 'Admin plataforma',
  coordinador_escuela: 'Coordinador escuela',
  familia_free: 'Familia Free',
  familia_escolar: 'Familia licencia escolar',
  familia_premium: 'Familia Premium',
}

const SMOKE_PREFIX_BY_ROLE: Partial<Record<QaRoleId, string>> = {
  admin_plataforma: 'SMOKE_ADMIN',
  coordinador_escuela: 'SMOKE_COORDINATOR',
  familia_free: 'SMOKE_PARENT',
  familia_escolar: 'SMOKE_SCHOOL',
  familia_premium: 'SMOKE_PREMIUM',
}

/** Correo canónico del rol (env SMOKE_* o default Proton de provisioning). */
export function qaIdentityEmail(role: QaRoleId): string {
  if (role === 'admin_plataforma') {
    const admin = resolveProvisioningAdmin()
    if (admin?.email) return admin.email
    return (
      process.env.SMOKE_ADMIN_EMAIL?.trim() ||
      process.env.REGISTRO_ADMIN_EMAIL?.trim() ||
      'soporte+qa-admin@astrokid.io'
    )
  }

  const prefix = SMOKE_PREFIX_BY_ROLE[role]
  const fromSmoke = prefix ? process.env[`${prefix}_EMAIL`]?.trim() : undefined
  if (fromSmoke) return fromSmoke

  const prov = PROVISIONING_ROLES.find((r) => r.id === role as ProvisioningRoleId)
  if (!prov) throw new Error(`Rol QA desconocido: ${role}`)
  return resolveProvisioningEmail(prov)
}

export function qaIdentityPassword(role: QaRoleId): string | undefined {
  const suite = resolveProvisioningPassword()
  const prefix = SMOKE_PREFIX_BY_ROLE[role]

  if (role === 'admin_plataforma') {
    const adminPass =
      process.env.SMOKE_ADMIN_PASSWORD?.trim() || suite
    if (adminPass) return adminPass
    return undefined
  }

  const fromSmoke = prefix ? process.env[`${prefix}_PASSWORD`] : undefined
  if (fromSmoke) return fromSmoke
  return suite
}

export function resolveQaAccount(role: QaRoleId): SmokeAccount | undefined {
  const email = qaIdentityEmail(role)
  const password = qaIdentityPassword(role)
  if (!email || !password) return undefined
  return { email, password }
}

export function requireQaAccount(role: QaRoleId): SmokeAccount | undefined {
  const account = resolveQaAccount(role)
  if (!account && (process.env.CI === 'true' || process.env.GITLAB_CI === 'true')) {
    throw new Error(
      `En CI hace falta cuenta QA para ${QA_ROLE_LABELS[role]} (REGISTRO_SUITE_PASSWORD y/o SMOKE_*).`
    )
  }
  return account
}

/** Prefijo legible en títulos de prueba Playwright. */
export function qaTitle(roles: QaRoleId | QaRoleId[], title: string): string {
  const list = Array.isArray(roles) ? roles : [roles]
  const tag = list.map((r) => QA_ROLE_LABELS[r]).join(' + ')
  return `[${tag}] ${title}`
}

export function maskEmailForDesk(email: string): string {
  const at = email.indexOf('@')
  if (at <= 0) return email
  return `${email[0]}***${email.slice(at)}`
}

/** Solo mocks locales: usuario sin aprovisionar (nunca usar en QA con Firebase). */
export const MOCK_UNPROVISIONED_PARENT_EMAIL = 'e2e-fixture-sin-cuenta@astrokid.invalid'
