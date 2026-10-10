# Appium Cheat Sheet - Referencia Rápida

## 🎯 Selectores (Orden de Prioridad)

```typescript
// 1. Resource ID (MEJOR)
By.id('com.app:id/button')

// 2. Accessibility ID (Content Description)
By.xpath('//*[@content-desc="Login"]')

// 3. XPath por texto
By.xpath('//android.widget.TextView[@text="Login"]')

// 4. XPath por clase
By.xpath('//android.widget.Button')

// 5. Class Name (último recurso)
By.className('android.widget.Button')
```

## 📱 Capabilities Básicas

```typescript
// App Nativa
{
  platformName: 'Android',
  'appium:app': './app.apk',
  'appium:deviceName': 'Android Emulator',
  'appium:platformVersion': '12.0',
  'appium:automationName': 'UiAutomator2',
}

// Web en Navegador
{
  platformName: 'Android',
  browserName: 'Chrome',
  'appium:deviceName': 'Android Emulator',
  'appium:platformVersion': '12.0',
  'appium:automationName': 'UiAutomator2',
}
```

## 👆 Gestos Comunes

### Scroll
```typescript
// Scroll hacia abajo
await driver.touchAction([
    { action: 'press', x: centerX, y: startY },
    { action: 'moveTo', x: centerX, y: endY },
    { action: 'release' }
])
```

### Swipe
```typescript
// Swipe izquierda
await driver.touchAction([
    { action: 'press', x: 800, y: 1000 },
    { action: 'moveTo', x: 200, y: 1000 },
    { action: 'release' }
])
```

### Long Press
```typescript
await driver.touchAction({
    action: 'longPress',
    x: 500,
    y: 1000,
    duration: 2000
})
```

## 🔧 Comandos Útiles

```bash
# Iniciar Appium
appium

# Con logs detallados
appium --log-level debug

# Instalar driver
appium driver install uiautomator2

# Verificar instalación
appium doctor
```

## 📋 ADB Comandos Útiles

```bash
# Listar dispositivos
adb devices

# Instalar APK
adb install app.apk

# Ver logs
adb logcat

# Package y activity actual
adb shell dumpsys window windows | grep -E 'mCurrentFocus'
```

## 🎨 Serenity/JS con Appium

```typescript
// Localizar elemento
PageElement.located(By.id('com.app:id/button'))

// Click
Click.on(element)

// Escribir texto
Enter.theValue('texto').into(element)

// Esperar
Wait.until(element, isVisible())

// Verificar
Ensure.that(Text.of(element), equals('expected'))
```

## 🔄 Contextos (WebView)

```typescript
// Obtener contextos
const contexts = await driver.getContexts()
// ['NATIVE_APP', 'WEBVIEW_com.app.name']

// Cambiar contexto
await driver.switchContext('WEBVIEW_com.app.name')
await driver.switchContext('NATIVE_APP')
```

## 📸 Screenshots y Logs

```typescript
// Screenshot
TakeScreenshot.of('screen-name')

// Logs en wdio.conf.ts
logLevel: 'debug'  // o 'trace'
```

## ⚙️ Capabilities Avanzadas

```typescript
{
  'appium:noReset': false,           // No limpiar datos
  'appium:fullReset': false,          // Reinstalar app
  'appium:autoGrantPermissions': true, // Otorgar permisos
  'appium:orientation': 'PORTRAIT',   // Orientación
  'appium:newCommandTimeout': 300,    // Timeout comandos
}
```

## 🐛 Troubleshooting

| Problema | Solución |
|----------|----------|
| "Unable to find element" | Aumentar wait, verificar selector |
| "Session not created" | Verificar capabilities, driver instalado |
| "Element not interactable" | Scroll hasta elemento, esperar animaciones |

## 📚 Recursos

- Docs: https://appium.io/docs/
- WebDriverIO: https://webdriver.io/docs/appium-service
- Serenity/JS: https://serenity-js.org/

---

**Tip**: Guarda esta hoja de referencia para consulta rápida mientras aprendes! 🚀


