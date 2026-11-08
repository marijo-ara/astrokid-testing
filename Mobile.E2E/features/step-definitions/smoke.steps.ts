import { Before, Given, Then } from '@cucumber/cucumber'
import { actorInTheSpotlight, type Actor } from '@serenity-js/core'
import { ChildLogin } from '../../serenity/astrokid-app/ChildLogin'

Before({ tags: '@school' }, function () {
    if (!process.env.ASTROKID_PARENT_TOKEN || !process.env.ASTROKID_BASE_URL?.trim()) return 'skipped'
})

Given('que {actor} abre AstroKid recién instalado', (actor: Actor) => {
    if (!actor.name.trim()) throw new Error('El escenario necesita un actor.')
})

Then('ve el botón para elegir el QR de la galería', async () => {
    await actorInTheSpotlight().attemptsTo(ChildLogin.landingIsVisible())
})
