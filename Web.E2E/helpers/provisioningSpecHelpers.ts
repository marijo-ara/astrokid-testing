import { test } from '@playwright/test'
import { resolveProvisioningPassword } from '../config/provisioningUsers'
import { usesRemoteFirebaseLogin } from './smokeAccount'

export function skipUnlessProvisioningQaReady(): void {
  test.skip(
    !usesRemoteFirebaseLogin(),
    'Esperado: PLAYWRIGHT_ENV=qa en .env.local (localhost no aprovisiona).'
  )
  test.skip(
    !resolveProvisioningPassword(),
    'Esperado: REGISTRO_SUITE_PASSWORD o SMOKE_PARENT_PASSWORD en .env.local.'
  )
}

export function shouldSendEscuelaAgreement(): boolean {
  return process.env.REGISTRO_ESCUELA_SEND_AGREEMENT !== '0'
}

export function shouldCoordinatorRegisterParent(): boolean {
  return process.env.REGISTRO_ESCUELA_REGISTER_PARENT !== '0'
}

export function shouldAdminActivateSchoolLicense(): boolean {
  return process.env.REGISTRO_ESCUELA_ADMIN_ACTIVATE !== '0'
}
