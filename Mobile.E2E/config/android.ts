import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const ASTROKID_APP_PACKAGE = 'com.astrokid.mobile'

export const appiumServer = Object.freeze({
    hostname: process.env.APPIUM_SERVER_HOST ?? '127.0.0.1',
    port: Number(process.env.APPIUM_SERVER_PORT ?? '4723'),
    path: process.env.APPIUM_SERVER_PATH ?? '/',
})

const deviceName = process.env.ANDROID_DEVICE_NAME ?? 'Android Emulator'
const platformVersion = process.env.ANDROID_PLATFORM_VERSION

/** Demo app driven by the sandbox todo-list features. */
export const mobileTestBaseUrl = process.env.MOBILE_TEST_APP_URL ?? 'https://todo-app.serenity-js.org/'

/** Mobile Chrome on the emulator, for the sandbox todo-list features. */
export const androidChromeCapabilities = Object.freeze({
    platformName: 'Android',
    browserName: process.env.ANDROID_BROWSER_NAME ?? 'Chrome',
    'appium:deviceName': deviceName,
    ...(platformVersion ? { 'appium:platformVersion': platformVersion } : {}),
    'appium:automationName': 'UiAutomator2',
})

/**
 * The AstroKid release APK under test. Each session reinstalls it and clears its data,
 * so the child always logs in on a clean install.
 */
export function astroKidApkCapabilities() {
    const apk = process.env.ASTROKID_APK
    if (!apk) {
        throw new Error('Define ASTROKID_APK con la ruta del APK a probar (por ejemplo app-release.apk).')
    }
    const apkPath = resolve(apk)
    if (!existsSync(apkPath)) {
        throw new Error(`ASTROKID_APK no existe: ${apkPath}`)
    }
    return {
        platformName: 'Android',
        'appium:deviceName': deviceName,
        ...(platformVersion ? { 'appium:platformVersion': platformVersion } : {}),
        'appium:automationName': 'UiAutomator2',
        'appium:app': apkPath,
        'appium:appPackage': ASTROKID_APP_PACKAGE,
        'appium:enforceAppInstall': true,
        'appium:noReset': false,
        'appium:autoGrantPermissions': true,
        'appium:newCommandTimeout': 240,
    }
}
