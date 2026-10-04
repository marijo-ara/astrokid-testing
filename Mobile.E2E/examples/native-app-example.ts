/**
 * Ejemplo de Testing de App Nativa con Appium
 * 
 * Este archivo muestra cómo configurar y usar Appium para testing
 * de aplicaciones Android nativas (no web en navegador móvil)
 */

import { Task, Wait } from '@serenity-js/core'
import { By, Enter, PageElement, isVisible, Click, Text, Ensure, equals } from '@serenity-js/web'
import type { Actor } from '@serenity-js/core'

/**
 * Ejemplo: Pantalla de Login de una App Nativa
 * 
 * Diferencia clave vs Web:
 * - Usa resource-id en lugar de CSS selectors
 * - Los elementos son componentes Android nativos
 * - No hay navegación por URL
 */
export class NativeLoginScreen {
    // Localización usando resource-id (recomendado para Android)
    static usernameField = () =>
        PageElement.located(By.id('com.example.app:id/username_input'))
            .describedAs('campo de usuario')

    static passwordField = () =>
        PageElement.located(By.id('com.example.app:id/password_input'))
            .describedAs('campo de contraseña')

    static loginButton = () =>
        PageElement.located(By.id('com.example.app:id/login_button'))
            .describedAs('botón de login')

    // Alternativa usando XPath con texto
    static loginButtonByText = () =>
        PageElement.located(By.xpath('//android.widget.Button[@text="Iniciar Sesión"]'))
            .describedAs('botón de login por texto')

    // Alternativa usando content-desc (Accessibility ID)
    static loginButtonByContentDesc = () =>
        PageElement.located(By.xpath('//*[@content-desc="Login"]'))
            .describedAs('botón de login por descripción')

    static errorMessage = () =>
        PageElement.located(By.id('com.example.app:id/error_message'))
            .describedAs('mensaje de error')

    /**
     * Tarea: Realizar login
     */
    static login = (username: string, password: string) =>
        Task.where(`#actor inicia sesión como ${username}`,
            // Esperar a que la pantalla esté lista
            Wait.until(this.usernameField(), isVisible()),
            
            // Ingresar credenciales
            Enter.theValue(username).into(this.usernameField()),
            Enter.theValue(password).into(this.passwordField()),
            
            // Hacer click en login
            Click.on(this.loginButton()),
            
            // Esperar a que desaparezca el botón de login (indicando navegación)
            Wait.until(this.loginButton(), isVisible().not())
        )

    /**
     * Tarea: Verificar mensaje de error
     */
    static verifyErrorMessage = (expectedMessage: string) =>
        Task.where(`#actor verifica mensaje de error: ${expectedMessage}`,
            Wait.until(this.errorMessage(), isVisible()),
            Ensure.that(Text.of(this.errorMessage()), equals(expectedMessage))
        )
}

/**
 * Ejemplo: Pantalla con Lista (requiere scroll)
 */
export class NativeListScreen {
    static listContainer = () =>
        PageElement.located(By.id('com.example.app:id/list_container'))
            .describedAs('contenedor de lista')

    static listItem = (index: number) =>
        PageElement.located(By.xpath(`//android.widget.ListView/android.widget.TextView[${index}]`))
            .describedAs(`item de lista en posición ${index}`)

    static listItemByText = (text: string) =>
        PageElement.located(By.xpath(`//android.widget.TextView[@text="${text}"]`))
            .describedAs(`item de lista: ${text}`)

    /**
     * Tarea: Scroll hasta encontrar un elemento
     * Nota: En Serenity/JS necesitarías usar comandos nativos de Appium
     */
    static scrollToItem = (itemText: string) =>
        Task.where(`#actor hace scroll hasta encontrar ${itemText}`,
            // Esto requeriría implementación personalizada con comandos Appium
            // Ver ejemplo en mobile-gestures.ts
        )
}

/**
 * Ejemplo de uso en un test
 */
export const nativeLoginExample = async (actor: Actor) => {
    await actor.attemptsTo(
        NativeLoginScreen.login('usuario@ejemplo.com', 'password123')
    )
}

