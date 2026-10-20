# Guía de Aprendizaje de Appium

## 📱 Índice
1. [Conceptos Fundamentales](#conceptos-fundamentales)
2. [Estrategias de Localización](#estrategias-de-localización)
3. [Gestos y Interacciones Móviles](#gestos-y-interacciones-móviles)
4. [Testing de Apps Nativas vs Web](#testing-de-apps-nativas-vs-web)
5. [Capabilities Avanzadas](#capabilities-avanzadas)
6. [Ejemplos Prácticos](#ejemplos-prácticos)

---

## Conceptos Fundamentales

### ¿Qué es Appium?
Appium es un framework de automatización de código abierto para aplicaciones móviles nativas, híbridas y web. Utiliza el protocolo WebDriver para comunicarse con dispositivos iOS y Android.

### Arquitectura de Appium
```
Test Script (WebDriverIO) 
    ↓
Appium Server (Puerto 4723)
    ↓
Driver (UiAutomator2 para Android / XCUITest para iOS)
    ↓
Dispositivo/Emulador
```

### Componentes Clave
- **Appium Server**: Servidor HTTP que recibe comandos WebDriver
- **Drivers**: 
  - `UiAutomator2` (Android)
  - `XCUITest` (iOS)
- **Capabilities**: Configuración que define qué app/dispositivo usar

---

## Estrategias de Localización

### 1. ID (Resource ID) - **RECOMENDADO**
```typescript
// Android
PageElement.located(By.id('com.example.app:id/loginButton'))

// O usando XPath
PageElement.located(By.xpath('//*[@resource-id="com.example.app:id/loginButton"]'))
```

### 2. Accessibility ID (Content Description)
```typescript
// Android - usa contentDescription
PageElement.located(By.css('[content-desc="Login"]'))

// O con XPath
PageElement.located(By.xpath('//*[@content-desc="Login"]'))
```

### 3. XPath
```typescript
// Por texto
PageElement.located(By.xpath('//android.widget.TextView[@text="Login"]'))

// Por clase
PageElement.located(By.xpath('//android.widget.Button'))

// Por múltiples atributos
PageElement.located(By.xpath('//android.widget.Button[@enabled="true" and @text="Submit"]'))
```

### 4. Class Name
```typescript
PageElement.located(By.className('android.widget.Button'))
```

### 5. Android UIAutomator Selector
```typescript
// Por texto
PageElement.located(By.xpath('//*[@text="Login"]'))

// Por descripción de contenido
PageElement.located(By.xpath('//*[@content-desc="Login"]'))

// Combinaciones complejas (requiere código nativo)
// Usar UiAutomator2 directamente en capabilities
```

### 6. CSS Selectors (Solo para Web/Híbridas)
```typescript
// Solo funciona en apps web o híbridas
PageElement.located(By.css('.login-button'))
```

### 🎯 Mejores Prácticas
1. **Prioridad de selectores:**
   - 1. ID (resource-id)
   - 2. Accessibility ID (content-desc)
   - 3. XPath con texto
   - 4. XPath con otros atributos
   - 5. Class name (último recurso)

2. **Evitar:**
   - XPath muy largos y frágiles
   - Selectores que dependen de índices
   - Selectores que cambian con el contenido

---

## Gestos y Interacciones Móviles

### 1. Tap (Click)
```typescript
import { Click, PageElement } from '@serenity-js/web'
import { By } from '@serenity-js/web'

const loginButton = PageElement.located(By.id('com.app:id/login'))
await actor.attemptsTo(Click.on(loginButton))
```

### 2. Long Press
```typescript
// En Serenity/JS necesitas usar ExecuteScript o comandos nativos
// Ejemplo con WebDriverIO directo:
await driver.touchAction({
    action: 'longPress',
    x: 500,
    y: 1000,
    duration: 2000
})
```

### 3. Swipe/Scroll
```typescript
// Scroll hacia abajo
await driver.touchAction([
    { action: 'press', x: 500, y: 1500 },
    { action: 'wait', ms: 500 },
    { action: 'moveTo', x: 500, y: 500 },
    { action: 'release' }
])

// O usando comandos de Appium
await driver.execute('mobile: scroll', {
    direction: 'down',
    element: elementId
})
```

### 4. Swipe Left/Right
```typescript
// Swipe izquierda
await driver.touchAction([
    { action: 'press', x: 800, y: 1000 },
    { action: 'wait', ms: 200 },
    { action: 'moveTo', x: 200, y: 1000 },
    { action: 'release' }
])
```

### 5. Pinch/Zoom
```typescript
// Zoom in (pinch out)
await driver.touchAction([
    { action: 'press', x: 400, y: 800 },
    { action: 'moveTo', x: 400, y: 600 },
    { action: 'release' },
    { action: 'press', x: 400, y: 1000 },
    { action: 'moveTo', x: 400, y: 1200 },
    { action: 'release' }
])
```

### 6. Drag and Drop
```typescript
await driver.touchAction([
    { action: 'press', x: 500, y: 1000 },
    { action: 'wait', ms: 500 },
    { action: 'moveTo', x: 500, y: 500 },
    { action: 'release' }
])
```

### 7. Multi-touch
```typescript
await driver.touchAction([
    [
        { action: 'press', x: 200, y: 500 },
        { action: 'moveTo', x: 200, y: 300 },
        { action: 'release' }
    ],
    [
        { action: 'press', x: 400, y: 500 },
        { action: 'moveTo', x: 400, y: 300 },
        { action: 'release' }
    ]
])
```

---

## Testing de Apps Nativas vs Web

### Configuración Actual (Web en Mobile Browser)
```typescript
// Tu configuración actual
export const androidEmulatorCapabilities = {
  platformName: 'Android',
  browserName: 'Chrome',  // ← Esto indica web en navegador móvil
  'appium:deviceName': 'Android GoogleAPI Emulator',
  'appium:platformVersion': '12.0',
  'appium:automationName': 'UiAutomator2',
}
```

### Configuración para App Nativa
```typescript
// Para app nativa (.apk)
export const androidNativeAppCapabilities = {
  platformName: 'Android',
  'appium:app': '/path/to/your/app.apk',  // ← Ruta al APK
  'appium:deviceName': 'Android GoogleAPI Emulator',
  'appium:platformVersion': '12.0',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': 'com.example.myapp',  // Package name
  'appium:appActivity': '.MainActivity',     // Activity principal
  'appium:noReset': false,  // true = no limpia datos entre tests
  'appium:fullReset': false, // true = reinstala app cada vez
}
```

### Configuración para App Instalada
```typescript
// Si la app ya está instalada en el dispositivo
export const androidInstalledAppCapabilities = {
  platformName: 'Android',
  'appium:appPackage': 'com.example.myapp',
  'appium:appActivity': '.MainActivity',
  'appium:deviceName': 'Android GoogleAPI Emulator',
  'appium:platformVersion': '12.0',
  'appium:automationName': 'UiAutomator2',
}
```

### Diferencias Clave

| Aspecto | Web en Mobile | App Nativa |
|---------|---------------|------------|
| **Capabilities** | `browserName: 'Chrome'` | `app: '/path/to.apk'` |
| **Selectores** | CSS, XPath web | ID, XPath Android |
| **Navegación** | `Navigate.to(url)` | `driver.activateApp()` |
| **Gestos** | Limitados | Completos (swipe, pinch, etc.) |
| **Contexto** | WEBVIEW | NATIVE_APP |

---

## Capabilities Avanzadas

### Timeouts
```typescript
{
  'appium:newCommandTimeout': 300,  // Timeout para comandos (segundos)
  'appium:uiautomator2ServerLaunchTimeout': 60000,  // Timeout para iniciar UiAutomator2
  'appium:adbExecTimeout': 20000,  // Timeout para comandos ADB
}
```

### Performance
```typescript
{
  'appium:skipServerInstallation': true,  // No reinstalar UiAutomator2 server
  'appium:skipDeviceInitialization': false,  // Saltar inicialización del dispositivo
  'appium:autoGrantPermissions': true,  // Otorgar permisos automáticamente
}
```

### Emulador/Dispositivo
```typescript
{
  'appium:avd': 'Pixel_5_API_31',  // Nombre del AVD específico
  'appium:avdLaunchTimeout': 120000,  // Timeout para lanzar AVD
  'appium:avdReadyTimeout': 120000,  // Timeout para que AVD esté listo
  'appium:udid': 'emulator-5554',  // ID del dispositivo específico
}
```

### Otros
```typescript
{
  'appium:orientation': 'PORTRAIT',  // PORTRAIT o LANDSCAPE
  'appium:autoWebview': false,  // Cambiar automáticamente a contexto webview
  'appium:chromedriverExecutable': '/path/to/chromedriver',  // ChromeDriver personalizado
  'appium:systemPort': 8200,  // Puerto para UiAutomator2 server
}
```

---

## Ejemplos Prácticos

### Ejemplo 1: Login en App Nativa
```typescript
import { Task, Wait } from '@serenity-js/core'
import { By, Enter, PageElement, isVisible, Click } from '@serenity-js/web'

export class LoginScreen {
    static usernameField = () =>
        PageElement.located(By.id('com.app:id/username'))
            .describedAs('username field')

    static passwordField = () =>
        PageElement.located(By.id('com.app:id/password'))
            .describedAs('password field')

    static loginButton = () =>
        PageElement.located(By.id('com.app:id/login_button'))
            .describedAs('login button')

    static login = (username: string, password: string) =>
        Task.where(`#actor logs in as ${username}`,
            Wait.until(this.usernameField(), isVisible()),
            Enter.theValue(username).into(this.usernameField()),
            Enter.theValue(password).into(this.passwordField()),
            Click.on(this.loginButton()),
            Wait.until(Page.current().title(), equals('Home'))
        )
}
```

### Ejemplo 2: Scroll hasta encontrar elemento
```typescript
import { ExecuteScript } from '@serenity-js/web'

static scrollToElement = (element: PageElement) =>
    Task.where('#actor scrolls to element',
        ExecuteScript.sync(`
            const element = arguments[0];
            const elementRect = element.getBoundingClientRect();
            const absoluteElementTop = elementRect.top + window.pageYOffset;
            const middle = absoluteElementTop - (window.innerHeight / 2);
            window.scrollTo(0, middle);
        `, element)
    )
```

### Ejemplo 3: Tomar Screenshot
```typescript
import { TakeScreenshot } from '@serenity-js/web'

await actor.attemptsTo(
    TakeScreenshot.of('login-screen')
)
```

### Ejemplo 4: Cambiar Orientación
```typescript
// Rotar a landscape
await driver.setOrientation('LANDSCAPE')

// Rotar a portrait
await driver.setOrientation('PORTRAIT')
```

### Ejemplo 5: Manejar Notificaciones
```typescript
// Abrir panel de notificaciones
await driver.openNotifications()

// Cerrar panel de notificaciones
await driver.pressKeyCode(4) // Back button
```

### Ejemplo 6: Contextos (WebView)
```typescript
// Obtener todos los contextos disponibles
const contexts = await driver.getContexts()
// Ejemplo: ['NATIVE_APP', 'WEBVIEW_com.app.name']

// Cambiar a contexto WebView
await driver.switchContext('WEBVIEW_com.app.name')

// Volver a contexto nativo
await driver.switchContext('NATIVE_APP')
```

---

## Herramientas Útiles

### 1. Appium Inspector
- Descarga desde: https://github.com/appium/appium-inspector
- Permite inspeccionar elementos de la app
- Genera código de localización

### 2. UI Automator Viewer
- Incluido en Android SDK
- `uiautomatorviewer` en línea de comandos
- Captura jerarquía de UI del dispositivo

### 3. ADB (Android Debug Bridge)
```bash
# Listar dispositivos
adb devices

# Instalar APK
adb install app.apk

# Ver logs
adb logcat

# Obtener package y activity actual
adb shell dumpsys window windows | grep -E 'mCurrentFocus'
```

### 4. Chrome DevTools (para WebView)
- `chrome://inspect` en Chrome
- Inspecciona WebViews en dispositivos conectados

---

## Comandos Útiles de Appium

### Iniciar Appium Server
```bash
# Instalación global
npm install -g appium

# Iniciar servidor
appium

# Con logs detallados
appium --log-level debug

# En puerto específico
appium --port 4724
```

### Instalar Drivers
```bash
# Instalar UiAutomator2 driver
appium driver install uiautomator2

# Listar drivers instalados
appium driver list

# Actualizar driver
appium driver update uiautomator2
```

### Verificar Instalación
```bash
# Ver versión
appium --version

# Ver información del servidor
appium doctor
```

---

## Debugging y Troubleshooting

### 1. Logs de Appium
```typescript
// En wdio.conf.ts
logLevel: 'debug',  // o 'trace' para más detalles
```

### 2. Esperas Explícitas
```typescript
import { Wait, isVisible } from '@serenity-js/web'

Wait.upTo(Duration.ofSeconds(10))
    .until(element, isVisible())
```

### 3. Verificar Estado del Dispositivo
```typescript
// Verificar si app está instalada
const isInstalled = await driver.isAppInstalled('com.app.package')

// Ver estado de la app
const appState = await driver.queryAppState('com.app.package')
```

### 4. Problemas Comunes

**Problema**: "Unable to find element"
- **Solución**: Aumentar tiempo de espera, verificar selector, usar Appium Inspector

**Problema**: "Session not created"
- **Solución**: Verificar capabilities, versión de Appium, driver instalado

**Problema**: "Element not interactable"
- **Solución**: Scroll hasta el elemento, verificar que esté visible, esperar animaciones

---

## Recursos Adicionales

- **Documentación Oficial**: https://appium.io/docs/en/latest/
- **WebDriverIO con Appium**: https://webdriver.io/docs/appium-service
- **Serenity/JS**: https://serenity-js.org/
- **UiAutomator2**: https://github.com/appium/appium-uiautomator2-driver

---

## Próximos Pasos

1. ✅ Entender conceptos fundamentales
2. 🔄 Practicar con diferentes estrategias de localización
3. 🔄 Implementar gestos móviles
4. 🔄 Probar con app nativa (no solo web)
5. 🔄 Explorar capabilities avanzadas
6. 🔄 Aprender sobre contextos (WebView)

¡Sigue practicando y experimentando! 🚀

