import { browser } from '@wdio/globals'
import { Duration, Interaction, Task, Wait } from '@serenity-js/core'
import { Ensure, includes, not } from '@serenity-js/assertions'
import { By, Click, PageElement, Text, isVisible } from '@serenity-js/web'
import { ASTROKID_APP_PACKAGE } from '../../config/android'

/** React Native exposes testID as the Android resource-id. */
const byTestId = (testId: string, description: string) =>
    PageElement.located(By.xpath(`//*[@resource-id="${testId}"]`)).describedAs(description)

export const Landing = {
    galleryButton: () => byTestId('landing-gallery-button', 'el botón "elegir QR de la galería"'),
}

export const PermissionConsent = {
    accept: () => byTestId('permission-consent-accept', 'el botón "Permitir" del aviso de galería'),
}

/** Android Photo Picker (API 33+) or DocumentsUI on older images; the newest item comes first. */
const newestPickerImage = () =>
    PageElement.located(By.xpath(
        '(//*[contains(@resource-id, ":id/icon_thumbnail") or contains(@resource-id, ":id/icon_thumb")])[1]',
    )).describedAs('la imagen más reciente del selector de fotos')

export const NativeAlert = {
    message: () => PageElement.located(By.xpath('//*[@resource-id="android:id/message"]'))
        .describedAs('el mensaje del aviso'),
    ok: () => PageElement.located(By.xpath('//*[@resource-id="android:id/button1"]'))
        .describedAs('el botón OK del aviso'),
}

export const AstroWorldIntro = {
    enter: () => byTestId('astroworld-intro-cta', 'el botón "Entrar a mi mundo"'),
}

/** A fresh child lands on the home screen and the daily mission opens on its own right after. */
export const ChildSession = {
    screen: () => PageElement.located(By.xpath(
        '//*[@resource-id="child-dashboard" or @resource-id="mission-screen"]',
    )).describedAs('el inicio del niño o su misión diaria'),
}

const SLOW_BACKEND = Duration.ofSeconds(90)

const PutImageInGallery = (png: Buffer) =>
    Interaction.where(`#actor guarda el QR descargado en la galería del teléfono`, async () => {
        const remotePath = `/sdcard/Pictures/astrokid-qr-${Date.now()}.png`
        await browser.pushFile(remotePath, png.toString('base64'))
        await browser.execute('mobile: shell', {
            command: 'am',
            args: ['broadcast', '-a', 'android.intent.action.MEDIA_SCANNER_SCAN_FILE', '-d', `file://${remotePath}`],
        })
    })

const RestartApp = () =>
    Interaction.where(`#actor cierra AstroKid y lo vuelve a abrir`, async () => {
        await browser.terminateApp(ASTROKID_APP_PACKAGE)
        await browser.activateApp(ASTROKID_APP_PACKAGE)
    })

export const ChildLogin = {
    landingIsVisible: () =>
        Task.where(`#actor ve la entrada para elegir el QR`,
            Wait.upTo(Duration.ofSeconds(60)).until(Landing.galleryButton(), isVisible()),
        ),

    withQrFromGallery: (qrPng: Buffer) =>
        Task.where(`#actor entra con el QR desde la galería`,
            PutImageInGallery(qrPng),
            Wait.upTo(Duration.ofSeconds(60)).until(Landing.galleryButton(), isVisible()),
            Click.on(Landing.galleryButton()),
            Wait.until(PermissionConsent.accept(), isVisible()),
            Click.on(PermissionConsent.accept()),
            Wait.upTo(Duration.ofSeconds(30)).until(newestPickerImage(), isVisible()),
            Click.on(newestPickerImage()),
        ),

    welcomeShowsName: (childName: string) =>
        Task.where(`#actor ve la bienvenida con su nombre`,
            Wait.upTo(SLOW_BACKEND).until(NativeAlert.message(), isVisible()),
            Ensure.that(Text.of(NativeAlert.message()), includes(childName)),
            Click.on(NativeAlert.ok()),
        ),

    finishIntro: () =>
        Task.where(`#actor termina la introducción de AstroWorld`,
            Wait.upTo(Duration.ofSeconds(30)).until(AstroWorldIntro.enter(), isVisible()),
            Click.on(AstroWorldIntro.enter()),
            Wait.upTo(Duration.ofSeconds(30)).until(ChildSession.screen(), isVisible()),
        ),

    restartApp: () => Task.where(`#actor reinicia la app`, RestartApp()),

    stillInSession: () =>
        Task.where(`#actor sigue dentro de su sesión`,
            Wait.upTo(SLOW_BACKEND).until(ChildSession.screen(), isVisible()),
            Ensure.that(Landing.galleryButton(), not(isVisible())),
        ),
}
