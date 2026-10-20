# Ejemplos de Appium

Esta carpeta contiene ejemplos prácticos para aprender Appium.

## 📁 Archivos

### 1. `native-app-example.ts`
Ejemplos de cómo escribir tests para aplicaciones Android nativas (no web en navegador).
- Localización de elementos usando resource-id
- Ejemplos de Page Objects para apps nativas
- Diferencia entre testing nativo vs web

### 2. `mobile-gestures.ts`
Ejemplos conceptuales de gestos móviles comunes:
- Scroll (arriba/abajo)
- Swipe (izquierda/derecha/arriba/abajo)
- Long press
- Pinch/Zoom
- Drag and Drop
- Tap y Double tap

**Nota**: Estos son ejemplos conceptuales. Para implementarlos completamente con Serenity/JS, necesitarás acceder al driver de WebDriverIO o usar `ExecuteScript`.

### 3. `appium-capabilities-examples.ts`
Diferentes configuraciones de capabilities para:
- Apps nativas
- Web en navegador móvil
- Apps híbridas
- Dispositivos físicos
- Emuladores específicos
- Configuración para CI/CD
- Y más...

### 4. `mobile-test-example.feature`
Ejemplos de features de Cucumber para testing móvil.

## 🚀 Cómo Usar Estos Ejemplos

### Paso 1: Entender la Configuración Actual
Tu proyecto actualmente está configurado para testing de **web en navegador móvil** (Chrome en Android).

### Paso 2: Probar con App Nativa
1. Obtén un APK de prueba o compila tu app
2. Modifica `packages/shared/src/mobile/emulator.ts` para usar capabilities de app nativa
3. Usa los ejemplos en `native-app-example.ts` como referencia

### Paso 3: Experimentar con Gestos
Los gestos móviles requieren acceso directo al driver de WebDriverIO. Puedes:
- Usar `ExecuteScript` de Serenity/JS
- Crear helpers personalizados que accedan al driver
- Usar comandos de Appium directamente cuando sea necesario

### Paso 4: Adaptar a Tu Proyecto
Copia y adapta los ejemplos según tus necesidades específicas.

## 📚 Recursos Adicionales

- Ver `APPIUM_LEARNING_GUIDE.md` en la raíz del proyecto para conceptos detallados
- Documentación oficial: https://appium.io/docs/en/latest/
- WebDriverIO con Appium: https://webdriver.io/docs/appium-service

## 💡 Tips

1. **Empieza Simple**: Comienza con tap y scroll básicos antes de gestos complejos
2. **Usa Appium Inspector**: Descarga Appium Inspector para inspeccionar elementos
3. **Prueba en Emulador Primero**: Es más fácil debuggear en emulador que en dispositivo físico
4. **Lee los Logs**: Los logs de Appium son muy útiles para entender qué está pasando

## 🔧 Próximos Pasos

1. ✅ Leer la guía de aprendizaje
2. 🔄 Probar los ejemplos de localización
3. 🔄 Implementar un test simple con app nativa
4. 🔄 Experimentar con gestos básicos
5. 🔄 Explorar capabilities avanzadas

¡Sigue aprendiendo! 🎓


