import assert from 'node:assert/strict'
import test from 'node:test'
import {
  PROVISIONING_AUTH_ERROR_KIND,
  PROVISIONING_AUTH_UI,
  loginMeansAccountNotFound,
  messageMeansAccountNotFound,
  messageMeansEmailAlreadyRegistered,
  provisioningLoginShouldTryRegistro,
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

test('provisioning: invalid-credentials dispara registro', () => {
  assert.equal(
    provisioningLoginShouldTryRegistro(
      PROVISIONING_AUTH_ERROR_KIND.invalidCredentials,
      PROVISIONING_AUTH_UI.loginInvalidCredentials.es
    ),
    true
  )
  assert.equal(
    provisioningLoginShouldTryRegistro(null, 'Correo o contraseña incorrectos. Si te acabas de registrar'),
    true
  )
  assert.equal(provisioningLoginShouldTryRegistro(null, 'No pudimos conectar con el servidor'), false)
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
