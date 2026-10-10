/**
 * Ejemplos de Configuración de Capabilities para Appium
 * 
 * Este archivo muestra diferentes configuraciones de capabilities
 * para diferentes escenarios de testing móvil
 */

/**
 * 1. APP NATIVA ANDROID (.apk)
 * 
 * Para testing de aplicaciones Android nativas instaladas desde un APK
 */
export const nativeAndroidAppCapabilities = {
    platformName: 'Android',
    
    // Ruta al archivo APK (puede ser relativa o absoluta)
    'appium:app': './apps/my-app.apk',
    
    // O si la app ya está instalada, usar appPackage y appActivity
    // 'appium:appPackage': 'com.example.myapp',
    // 'appium:appActivity': '.MainActivity',
    
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Opciones útiles
    'appium:noReset': false,        // true = no limpia datos entre sesiones
    'appium:fullReset': false,      // true = reinstala app cada vez
    'appium:autoGrantPermissions': true,  // Otorga permisos automáticamente
    'appium:newCommandTimeout': 300,  // Timeout para comandos (segundos)
}

/**
 * 2. WEB EN NAVEGADOR MÓVIL (Tu configuración actual)
 * 
 * Para testing de aplicaciones web en Chrome/Safari móvil
 */
export const mobileWebCapabilities = {
    platformName: 'Android',
    browserName: 'Chrome',  // ← Indica que es web en navegador
    
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Opciones específicas de Chrome
    'appium:chromedriverExecutable': undefined,  // Usar ChromeDriver por defecto
    'appium:chromeOptions': {
        args: [
            '--disable-web-security',
            '--disable-popup-blocking',
        ]
    }
}

/**
 * 3. APP HÍBRIDA (WebView dentro de app nativa)
 * 
 * Para apps que combinan componentes nativos y WebView
 */
export const hybridAppCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/hybrid-app.apk',
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Importante para apps híbridas
    'appium:autoWebview': false,  // Cambiar automáticamente a contexto WebView
    'appium:chromedriverExecutable': undefined,
}

/**
 * 4. DISPOSITIVO FÍSICO (no emulador)
 * 
 * Para testing en dispositivos Android físicos conectados
 */
export const physicalDeviceCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    
    // Usar UDID del dispositivo físico
    'appium:udid': 'R58M40ABCDE',  // Obtener con: adb devices
    
    'appium:platformVersion': '12.0',  // Versión del dispositivo
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Samsung Galaxy S21',  // Nombre descriptivo
    
    'appium:noReset': true,  // Generalmente true para dispositivos físicos
}

/**
 * 5. EMULADOR ESPECÍFICO
 * 
 * Para usar un AVD (Android Virtual Device) específico
 */
export const specificEmulatorCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    
    // Nombre del AVD específico
    'appium:avd': 'Pixel_5_API_31',
    
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Timeouts para lanzar el emulador
    'appium:avdLaunchTimeout': 120000,  // 2 minutos
    'appium:avdReadyTimeout': 120000,
}

/**
 * 6. CONFIGURACIÓN PARA CI/CD
 * 
 * Optimizada para ejecución en pipelines de CI/CD
 */
export const ciCdCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Optimizaciones para CI
    'appium:skipServerInstallation': true,  // No reinstalar UiAutomator2 server
    'appium:skipDeviceInitialization': false,
    'appium:autoGrantPermissions': true,
    'appium:newCommandTimeout': 600,  // Timeout más largo para CI
    
    // Performance
    'appium:uiautomator2ServerLaunchTimeout': 60000,
    'appium:adbExecTimeout': 20000,
}

/**
 * 7. CONFIGURACIÓN CON ORIENTACIÓN ESPECÍFICA
 * 
 * Para forzar orientación portrait o landscape
 */
export const orientationCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Forzar orientación
    'appium:orientation': 'PORTRAIT',  // o 'LANDSCAPE'
}

/**
 * 8. CONFIGURACIÓN CON PERMISOS ESPECÍFICOS
 * 
 * Para apps que requieren permisos especiales
 */
export const permissionsCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Otorgar permisos específicos
    'appium:autoGrantPermissions': true,
    'appium:autoAcceptAlerts': true,  // Aceptar alertas automáticamente
}

/**
 * 9. CONFIGURACIÓN PARA DEBUGGING
 * 
 * Con logs y opciones de debugging habilitadas
 */
export const debuggingCapabilities = {
    platformName: 'Android',
    'appium:app': './apps/my-app.apk',
    'appium:deviceName': 'Android GoogleAPI Emulator',
    'appium:platformVersion': '12.0',
    'appium:automationName': 'UiAutomator2',
    
    // Opciones de debugging
    'appium:newCommandTimeout': 600,
    'appium:uiautomator2ServerInstallTimeout': 120000,
    
    // Mantener sesión activa más tiempo
    'appium:keepAliveTimeout': 300,
}

/**
 * 10. CONFIGURACIÓN MÚLTIPLE DISPOSITIVOS
 * 
 * Para ejecutar tests en paralelo en múltiples dispositivos
 */
export const multiDeviceCapabilities = [
    {
        platformName: 'Android',
        'appium:app': './apps/my-app.apk',
        'appium:udid': 'emulator-5554',
        'appium:deviceName': 'Emulator 1',
        'appium:platformVersion': '12.0',
        'appium:automationName': 'UiAutomator2',
    },
    {
        platformName: 'Android',
        'appium:app': './apps/my-app.apk',
        'appium:udid': 'emulator-5556',
        'appium:deviceName': 'Emulator 2',
        'appium:platformVersion': '12.0',
        'appium:automationName': 'UiAutomator2',
    }
]

/**
 * VARIABLES DE ENTORNO ÚTILES
 * 
 * Puedes usar variables de entorno para hacer las capabilities más flexibles:
 * 
 * process.env.ANDROID_PLATFORM_VERSION ?? '12.0'
 * process.env.ANDROID_DEVICE_NAME ?? 'Android GoogleAPI Emulator'
 * process.env.APPIUM_APP_PATH ?? './apps/my-app.apk'
 * process.env.APPIUM_UDID ?? undefined
 */

/**
 * EJEMPLO DE USO EN wdio.conf.ts
 * 
 * import { nativeAndroidAppCapabilities } from './examples/appium-capabilities-examples'
 * 
 * export const config = {
 *     // ... otras configuraciones
 *     capabilities: [nativeAndroidAppCapabilities],
 *     // ...
 * }
 */


