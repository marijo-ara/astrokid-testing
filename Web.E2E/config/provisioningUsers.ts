/**
 * Cuentas Proton para la suite «Registrar usuarios» (QA manual / aprovisionamiento).
 * Sobrescribí cada correo con REGISTRO_*_EMAIL en .env.local si hace falta.
 * Admin: SMOKE_ADMIN_EMAIL/PASSWORD o REGISTRO_ADMIN_EMAIL + REGISTRO_SUITE_PASSWORD.
 */

export type ProvisioningRoleId =
  | 'coordinador_escuela'
  | 'familia_free'
  | 'familia_escolar'
  | 'familia_premium'

export type ProvisioningPersonaId = 'admin_plataforma' | ProvisioningRoleId

export type ProvisioningRole = {
  id: ProvisioningRoleId
  label: string
  defaultEmail: string
  envEmailKey: string
  /** data-quota-plan esperado tras login cuando la familia está completa. */
  expectedPlan?: 'free_capped' | 'institutional_capped' | 'premium_unlimited'
}

export type ProvisioningPersona = {
  id: ProvisioningPersonaId
  label: string
  email: string
  password: string
  role?: ProvisioningRole
}

export const PROVISIONING_ROLES: readonly ProvisioningRole[] = [
  {
    id: 'coordinador_escuela',
    label: 'Coordinador de escuela',
    defaultEmail: 'astrokid.io+1@proton.me',
    envEmailKey: 'REGISTRO_COORDINADOR_EMAIL',
  },
  {
    id: 'familia_free',
    label: 'Familia Free',
    defaultEmail: 'astrokid.io@proton.me',
    envEmailKey: 'REGISTRO_FREE_EMAIL',
    expectedPlan: 'free_capped',
  },
  {
    id: 'familia_escolar',
    label: 'Familia con licencia escolar',
    defaultEmail: 'astrokid.io+2@proton.me',
    envEmailKey: 'REGISTRO_ESCOLAR_EMAIL',
    expectedPlan: 'institutional_capped',
  },
  {
    id: 'familia_premium',
    label: 'Familia Premium',
    defaultEmail: 'astrokid.io+3@proton.me',
    envEmailKey: 'REGISTRO_PREMIUM_EMAIL',
    expectedPlan: 'premium_unlimited',
  },
] as const

const SMOKE_EMAIL_BY_ROLE_ID: Partial<Record<ProvisioningRoleId, string>> = {
  coordinador_escuela: 'SMOKE_COORDINATOR',
  familia_free: 'SMOKE_PARENT',
  familia_escolar: 'SMOKE_SCHOOL',
  familia_premium: 'SMOKE_PREMIUM',
}

export function resolveProvisioningEmail(role: ProvisioningRole): string {
  const smokePrefix = SMOKE_EMAIL_BY_ROLE_ID[role.id]
  const smokeEmail = smokePrefix ? process.env[`${smokePrefix}_EMAIL`]?.trim() : undefined
  if (smokeEmail) return smokeEmail

  const fromEnv = process.env[role.envEmailKey]?.trim()
  return fromEnv || role.defaultEmail
}

export function resolveProvisioningPassword(): string | undefined {
  const fromSuite = process.env.REGISTRO_SUITE_PASSWORD?.trim()
  if (fromSuite) return fromSuite
  const shared =
    process.env.SMOKE_PARENT_PASSWORD?.trim() ||
    process.env.SMOKE_SCHOOL_PASSWORD?.trim() ||
    process.env.SMOKE_PREMIUM_PASSWORD?.trim()
  return shared || undefined
}

/** Admin QA para /admin/licenses y aprovisionamiento (SMOKE_ADMIN_* o REGISTRO_ADMIN_EMAIL). */
export function resolveProvisioningAdmin(): { email: string; password: string } | undefined {
  const email =
    process.env.SMOKE_ADMIN_EMAIL?.trim() || process.env.REGISTRO_ADMIN_EMAIL?.trim()
  const password =
    process.env.SMOKE_ADMIN_PASSWORD?.trim() || resolveProvisioningPassword()
  if (!email || !password) return undefined
  return { email, password }
}

/**
 * Orden: admin → coordinador → familias. Login primero; registro solo si no existe.
 */
export function listProvisioningPersonas(): ProvisioningPersona[] {
  const suitePassword = resolveProvisioningPassword()
  if (!suitePassword) return []

  const personas: ProvisioningPersona[] = []

  const admin = resolveProvisioningAdmin()
  if (admin) {
    personas.push({
      id: 'admin_plataforma',
      label: 'Admin plataforma',
      email: admin.email,
      password: admin.password,
    })
  }

  for (const role of PROVISIONING_ROLES) {
    const smokePrefix = SMOKE_EMAIL_BY_ROLE_ID[role.id]
    const rolePassword = smokePrefix
      ? process.env[`${smokePrefix}_PASSWORD`]?.trim() || suitePassword
      : suitePassword
    personas.push({
      id: role.id,
      label: role.label,
      email: resolveProvisioningEmail(role),
      password: rolePassword,
      role,
    })
  }

  return personas
}
