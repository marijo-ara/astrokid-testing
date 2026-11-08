import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROVISIONING_AUTH_ERROR_KIND,
  PROVISIONING_AUTH_UI,
  loginMeansAccountNotFound,
  messageMeansAccountNotFound,
  messageMeansEmailAlreadyRegistered,
  registroMeansEmailInUse,
} from './provisioningAuthMessages.ts'

test('detecta mensaje de cuenta inexistente en login', () => {
  assert.equal(messageMeansAccountNotFound(PROVISIONING_AUTH_UI.loginAccountNotFound.es), true)
  assert.equal(messageMeansAccountNotFound(PROVISIONING_AUTH_UI.loginAccountNotFound.en), true)
  assert.equal(messageMeansAccountNotFound('Correo o contraseña incorrectos'), false)
  assert.equal(
    loginMeansAccountNotFound(PROVISIONING_AUTH_ERROR_KIND.accountNotFound, null),
    true
  )
  assert.equal(
    loginMeansAccountNotFound('invalid-credentials', PROVISIONING_AUTH_UI.loginInvalidCredentials.es),
    false
  )
})

test('detecta mensaje de correo ya registrado', () => {
  assert.equal(
    messageMeansEmailAlreadyRegistered(PROVISIONING_AUTH_UI.emailAlreadyRegistered.registro.es),
    true
  )
  assert.equal(
    messageMeansEmailAlreadyRegistered(PROVISIONING_AUTH_UI.emailAlreadyRegistered.login.en),
    true
  )
  assert.equal(messageMeansEmailAlreadyRegistered(PROVISIONING_AUTH_UI.loginAccountNotFound.es), false)
  assert.equal(
    registroMeansEmailInUse(PROVISIONING_AUTH_ERROR_KIND.emailInUse, null),
    true
  )
})
