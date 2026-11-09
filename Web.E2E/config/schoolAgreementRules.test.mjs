import assert from 'node:assert/strict'
import test from 'node:test'
import {
  formatSendAgreementHttpError,
  guidanceForSendAgreementConflict,
  schoolNameKey,
  schoolsMatchByName,
} from '../helpers/schoolAgreementRules.ts'
import {
  ensureProvisioningSchoolNameForRun,
  resetProvisioningSchoolNameForTests,
  resolveSchoolNameBase,
} from '../helpers/schoolRunStore.ts'

test('schoolNameKey normaliza espacios y mayúsculas', () => {
  assert.equal(schoolNameKey('  Colegio   QA Gmail  '), schoolNameKey('colegio qa gmail'))
  assert.equal(schoolsMatchByName('Escuela Duplicada', 'escuela duplicada'), true)
})

test('guidance para conflictos send-agreement', () => {
  assert.match(
    guidanceForSendAgreementConflict('SCHOOL_ALREADY_ACTIVE'),
    /ampliá cupos/i
  )
  assert.match(
    guidanceForSendAgreementConflict('SCHOOL_PACKET_ALREADY_RECEIVED'),
    /Aprobá en la cola/i
  )
})

test('formatSendAgreementHttpError incluye código y guía', () => {
  const msg = formatSendAgreementHttpError(409, {
    code: 'SCHOOL_ALREADY_ACTIVE',
    message_es: 'Este colegio ya tiene una licencia activa.',
    next_action: 'amend_seats_or_renew',
  })
  assert.match(msg, /409/)
  assert.match(msg, /SCHOOL_ALREADY_ACTIVE/)
  assert.match(msg, /ampliá cupos/i)
})

test('nombre de corrida provisioning lleva timestamp único', () => {
  const prevFixed = process.env.REGISTRO_ESCUELA_FIXED_SCHOOL
  const prevSuffix = process.env.REGISTRO_SCHOOL_NAME_SUFFIX
  process.env.REGISTRO_ESCUELA_FIXED_SCHOOL = '0'
  delete process.env.REGISTRO_SCHOOL_NAME_SUFFIX
  resetProvisioningSchoolNameForTests()

  const name = ensureProvisioningSchoolNameForRun()
  assert.match(name, new RegExp(`${resolveSchoolNameBase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
  assert.match(name, /\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)

  const again = ensureProvisioningSchoolNameForRun()
  assert.equal(again, name)

  if (prevFixed !== undefined) process.env.REGISTRO_ESCUELA_FIXED_SCHOOL = prevFixed
  else delete process.env.REGISTRO_ESCUELA_FIXED_SCHOOL
  if (prevSuffix !== undefined) process.env.REGISTRO_SCHOOL_NAME_SUFFIX = prevSuffix
  resetProvisioningSchoolNameForTests()
})
