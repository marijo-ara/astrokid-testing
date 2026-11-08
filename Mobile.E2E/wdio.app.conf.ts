import type { WebdriverIOConfig } from '@serenity-js/webdriverio'
import { appiumServer, astroKidApkCapabilities } from './config/android'

/**
 * Black-box specs against the AstroKid Android APK (ASTROKID_APK) on an emulator.
 * The sandbox todo-list features keep using wdio.conf.ts.
 */
export const config: WebdriverIOConfig = {
    runner: 'local',
    tsConfigPath: './tsconfig.json',

    hostname: appiumServer.hostname,
    port: appiumServer.port,
    path: appiumServer.path,

    specs: [
        './features/smoke/**/*.feature',
        './features/child-login/**/*.feature',
    ],

    maxInstances: 1,
    capabilities: [astroKidApkCapabilities()],

    logLevel: 'warn',
    bail: 0,
    waitforTimeout: 20000,
    connectionRetryTimeout: 180000,
    connectionRetryCount: 2,

    // adb_shell: the gallery step asks the media scanner to index the pushed QR image.
    services: [['appium', { args: { allowInsecure: 'uiautomator2:adb_shell' } }]],

    framework: '@serenity-js/webdriverio',
    serenity: {
        runner: 'cucumber',
        crew: [
            '@serenity-js/console-reporter',
            '@serenity-js/serenity-bdd',
            ['@serenity-js/core:ArtifactArchiver', { outputDirectory: 'target/site/serenity' }],
            ['@serenity-js/web:Photographer', { strategy: 'TakePhotosOfFailures' }],
        ],
    },

    reporters: ['spec'],

    cucumberOpts: {
        import: [
            './features/step-definitions/smoke.steps.ts',
            './features/step-definitions/child-login.steps.ts',
            './features/support/*.ts',
        ],
        strict: true,
        // Cold start on Render plus the APK install can take a while.
        timeout: 180000,
    },
}
