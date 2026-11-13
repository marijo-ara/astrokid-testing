import { After, Before, Given, Then, When } from '@cucumber/cucumber'
import { actorInTheSpotlight, type Actor } from '@serenity-js/core'
import { ChildLogin } from '../../serenity/astrokid-app/ChildLogin'
import {
    createQaChildCode,
    removeQaChild,
    tryLoadWebDownloadedChildQr,
    type QaChildCode,
} from '../support/qaChildCode'

let qaCode: QaChildCode | undefined

Before({ tags: '@child-login' }, () => {
    qaCode = undefined
})

After({ tags: '@child-login or @school' }, async () => {
    if (!qaCode) return
    const created = qaCode
    qaCode = undefined
    await removeQaChild(created)
})

function currentCode(): QaChildCode {
    if (!qaCode) throw new Error('Falta el paso que crea el código QR de QA.')
    return qaCode
}

Given('que {actor} tiene el código QR de acceso que su familia descargó en QA', async (actor: Actor) => {
    qaCode = tryLoadWebDownloadedChildQr() ?? (await createQaChildCode(actor.name))
})

When('abre AstroKid recién instalado y elige ese QR desde la galería', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.withQrFromGallery(currentCode().qrPng))
})

Then('la app le da la bienvenida por su nombre', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.welcomeShowsName(currentCode().childName))
})

Then('entra a su mundo después de la introducción', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.finishIntro())
})

When('cierra la app y la vuelve a abrir', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.restartApp())
})

Then('sigue dentro de su sesión sin escanear de nuevo', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.stillInSession())
})
