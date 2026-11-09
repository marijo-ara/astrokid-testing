import { test, expect } from '@playwright/test'
import {
  formatSendAgreementHttpError,
  guidanceForSendAgreementConflict,
  schoolNameKey,
} from '../../helpers/schoolAgreementRules'
import {
  ensureProvisioningSchoolNameForRun,
  resetProvisioningSchoolNameForTests,
  resolveSchoolNameBase,
} from '../../helpers/schoolRunStore'

/**
 * Reglas de negocio y nombres únicos — sin sesión QA (rápidas en CI y en `test:provisioning`).
 */
test.describe('Reglas licencia escolar @provisioning', () => {
  test('mismo correo coordinador: nombre de colegio distinto por corrida (timestamp)', () => {
    const prevFixed = process.env.REGISTRO_ESCUELA_FIXED_SCHOOL
    const prevSuffix = process.env.REGISTRO_SCHOOL_NAME_SUFFIX
    process.env.REGISTRO_ESCUELA_FIXED_SCHOOL = '0'
    delete process.env.REGISTRO_SCHOOL_NAME_SUFFIX
    resetProvisioningSchoolNameForTests()

    const name = ensureProvisioningSchoolNameForRun()
    expect(name).toContain(resolveSchoolNameBase())
    expect(name).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)
    expect(ensureProvisioningSchoolNameForRun()).toBe(name)

    if (prevFixed !== undefined) process.env.REGISTRO_ESCUELA_FIXED_SCHOOL = prevFixed
    else delete process.env.REGISTRO_ESCUELA_FIXED_SCHOOL
    if (prevSuffix !== undefined) process.env.REGISTRO_SCHOOL_NAME_SUFFIX = prevSuffix
    resetProvisioningSchoolNameForTests()
  })

  test('clave de nombre ignora mayúsculas y espacios extra', () => {
    expect(schoolNameKey('  Colegio Proton QA  ')).toBe(schoolNameKey('colegio proton qa'))
  })

  test('409 SCHOOL_ALREADY_ACTIVE: mensaje de prueba alinea con guía de ampliar cupos', () => {
    const formatted = formatSendAgreementHttpError(409, {
      code: 'SCHOOL_ALREADY_ACTIVE',
      message_es: 'Este colegio ya tiene una licencia activa.',
      next_action: 'amend_seats',
    })
    expect(formatted).toMatch(/409/)
    expect(formatted).toMatch(/ampliá cupos/i)
    expect(guidanceForSendAgreementConflict('SCHOOL_ALREADY_ACTIVE')).toMatch(/PATCH seats|ampliá cupos/i)
  })

  test('409 SCHOOL_PACKET_ALREADY_RECEIVED: no reenviar acuerdo', () => {
    const formatted = formatSendAgreementHttpError(409, {
      code: 'SCHOOL_PACKET_ALREADY_RECEIVED',
      message_es: 'Ya recibimos el paquete firmado.',
    })
    expect(formatted).toMatch(/Aprobá en la cola/i)
  })
})
