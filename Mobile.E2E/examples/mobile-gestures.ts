/**
 * Ejemplos de Gestos Móviles con Appium
 * 
 * Este archivo muestra cómo implementar gestos comunes en testing móvil
 * usando comandos nativos de Appium a través de WebDriverIO
 */

/**
 * NOTA IMPORTANTE:
 * 
 * Estos ejemplos muestran la estructura de comandos de Appium para gestos móviles.
 * Para usar con Serenity/JS, necesitarás adaptarlos usando ExecuteScript
 * o accediendo al driver de WebDriverIO a través de las habilidades de Serenity/JS.
 * 
 * Alternativa: Usar estos comandos directamente en WebDriverIO sin Serenity/JS
 * para testing más directo de gestos móviles.
 */

import { Task, ExecuteScript } from '@serenity-js/core'
import type { Actor } from '@serenity-js/core'

/**
 * Helper para obtener el driver de WebDriverIO
 * 
 * En Serenity/JS, necesitarás acceder al browser/driver de esta manera:
 * const browser = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
 * 
 * O usar ExecuteScript para comandos específicos de Appium
 */

/**
 * 1. SCROLL - Desplazarse en la pantalla
 */
export class MobileScroll {
    /**
     * Scroll hacia abajo
     */
    /**
     * Scroll hacia abajo usando comandos nativos de Appium
     * 
     * NOTA: Este ejemplo muestra la estructura. Para implementarlo en Serenity/JS,
     * necesitarás acceder al driver de WebDriverIO o usar ExecuteScript.
     * 
     * Ejemplo de uso directo en WebDriverIO:
     * ```typescript
     * const { width, height } = await driver.getWindowSize()
     * const startY = Math.floor(height * 0.8)
     * const endY = Math.floor(height * 0.2)
     * const centerX = Math.floor(width / 2)
     * 
     * await driver.touchAction([
     *     { action: 'press', x: centerX, y: startY },
     *     { action: 'wait', ms: 300 },
     *     { action: 'moveTo', x: centerX, y: endY },
     *     { action: 'release' }
     * ])
     * ```
     */
    static scrollDown = (distance: number = 500) =>
        Task.where('#actor hace scroll hacia abajo',
            // Implementación usando ExecuteScript o acceso directo al driver
            // Ver ejemplos en la documentación de Serenity/JS para Appium
            ExecuteScript.sync(`
                // Código JavaScript para scroll
                // Necesitarás adaptar esto según tu setup
                console.log('Scroll hacia abajo');
            `)
        )

    /**
     * Scroll hacia arriba
     */
    /**
     * Scroll hacia arriba
     * 
     * Similar a scrollDown pero en dirección opuesta
     */
    static scrollUp = (distance: number = 500) =>
        Task.where('#actor hace scroll hacia arriba',
            ExecuteScript.sync(`
                // Implementación de scroll hacia arriba
                console.log('Scroll hacia arriba');
            `)
        )

    /**
     * Scroll hasta encontrar un elemento
     */
    /**
     * Scroll hasta que un elemento sea visible
     * 
     * Este método requiere acceso al driver para verificar visibilidad
     * y ejecutar scrolls iterativos.
     */
    static scrollUntilElementVisible = (elementId: string, maxScrolls: number = 10) =>
        Task.where(`#actor hace scroll hasta encontrar elemento`,
            // Implementación requeriría acceso al driver
            // Ver documentación de Serenity/JS para patrones de espera y scroll
            ExecuteScript.sync(`
                // Lógica para scroll hasta encontrar elemento
                console.log('Buscando elemento:', '${elementId}');
            `)
        )
}

/**
 * 2. SWIPE - Deslizar en una dirección
 */
export class MobileSwipe {
    /**
     * Swipe hacia la izquierda
     */
    static swipeLeft = () =>
        Task.where('#actor hace swipe hacia la izquierda',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const startX = Math.floor(width * 0.8)
                const endX = Math.floor(width * 0.2)
                const centerY = Math.floor(height / 2)

                await driver.touchAction([
                    { action: 'press', x: startX, y: centerY },
                    { action: 'wait', ms: 200 },
                    { action: 'moveTo', x: endX, y: centerY },
                    { action: 'release' }
                ])
            }
        )

    /**
     * Swipe hacia la derecha
     */
    static swipeRight = () =>
        Task.where('#actor hace swipe hacia la derecha',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const startX = Math.floor(width * 0.2)
                const endX = Math.floor(width * 0.8)
                const centerY = Math.floor(height / 2)

                await driver.touchAction([
                    { action: 'press', x: startX, y: centerY },
                    { action: 'wait', ms: 200 },
                    { action: 'moveTo', x: endX, y: centerY },
                    { action: 'release' }
                ])
            }
        )

    /**
     * Swipe hacia arriba
     */
    static swipeUp = () =>
        Task.where('#actor hace swipe hacia arriba',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const centerX = Math.floor(width / 2)
                const startY = Math.floor(height * 0.8)
                const endY = Math.floor(height * 0.2)

                await driver.touchAction([
                    { action: 'press', x: centerX, y: startY },
                    { action: 'wait', ms: 200 },
                    { action: 'moveTo', x: centerX, y: endY },
                    { action: 'release' }
                ])
            }
        )

    /**
     * Swipe hacia abajo
     */
    static swipeDown = () =>
        Task.where('#actor hace swipe hacia abajo',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const centerX = Math.floor(width / 2)
                const startY = Math.floor(height * 0.2)
                const endY = Math.floor(height * 0.8)

                await driver.touchAction([
                    { action: 'press', x: centerX, y: startY },
                    { action: 'wait', ms: 200 },
                    { action: 'moveTo', x: centerX, y: endY },
                    { action: 'release' }
                ])
            }
        )
}

/**
 * 3. LONG PRESS - Presión prolongada
 */
export class MobileLongPress {
    /**
     * Long press en coordenadas específicas
     */
    static longPressAt = (x: number, y: number, duration: number = 2000) =>
        Task.where(`#actor hace long press en (${x}, ${y})`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                
                await driver.touchAction({
                    action: 'longPress',
                    x: x,
                    y: y,
                    duration: duration
                })
            }
        )

    /**
     * Long press en un elemento
     */
    static longPressOnElement = (elementId: string, duration: number = 2000) =>
        Task.where(`#actor hace long press en elemento ${elementId}`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const element = await driver.$(`id=${elementId}`)
                const location = await element.getLocation()
                const size = await element.getSize()
                
                const centerX = location.x + (size.width / 2)
                const centerY = location.y + (size.height / 2)

                await driver.touchAction({
                    action: 'longPress',
                    x: centerX,
                    y: centerY,
                    duration: duration
                })
            }
        )
}

/**
 * 4. PINCH/ZOOM - Pellizcar para hacer zoom
 */
export class MobilePinch {
    /**
     * Zoom in (pellizcar hacia afuera)
     */
    static zoomIn = () =>
        Task.where('#actor hace zoom in',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const centerX = Math.floor(width / 2)
                const centerY = Math.floor(height / 2)

                await driver.touchAction([
                    [
                        { action: 'press', x: centerX - 50, y: centerY },
                        { action: 'moveTo', x: centerX - 150, y: centerY },
                        { action: 'release' }
                    ],
                    [
                        { action: 'press', x: centerX + 50, y: centerY },
                        { action: 'moveTo', x: centerX + 150, y: centerY },
                        { action: 'release' }
                    ]
                ])
            }
        )

    /**
     * Zoom out (pellizcar hacia adentro)
     */
    static zoomOut = () =>
        Task.where('#actor hace zoom out',
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                const { width, height } = await driver.getWindowSize()
                const centerX = Math.floor(width / 2)
                const centerY = Math.floor(height / 2)

                await driver.touchAction([
                    [
                        { action: 'press', x: centerX - 150, y: centerY },
                        { action: 'moveTo', x: centerX - 50, y: centerY },
                        { action: 'release' }
                    ],
                    [
                        { action: 'press', x: centerX + 150, y: centerY },
                        { action: 'moveTo', x: centerX + 50, y: centerY },
                        { action: 'release' }
                    ]
                ])
            }
        )
}

/**
 * 5. DRAG AND DROP - Arrastrar y soltar
 */
export class MobileDragAndDrop {
    /**
     * Arrastrar elemento desde una posición a otra
     */
    static dragFromTo = (fromX: number, fromY: number, toX: number, toY: number) =>
        Task.where(`#actor arrastra de (${fromX}, ${fromY}) a (${toX}, ${toY})`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                
                await driver.touchAction([
                    { action: 'press', x: fromX, y: fromY },
                    { action: 'wait', ms: 500 },
                    { action: 'moveTo', x: toX, y: toY },
                    { action: 'release' }
                ])
            }
        )

    /**
     * Arrastrar un elemento a otro
     */
    static dragElementToElement = (sourceElementId: string, targetElementId: string) =>
        Task.where(`#actor arrastra elemento ${sourceElementId} a ${targetElementId}`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                
                const sourceElement = await driver.$(`id=${sourceElementId}`)
                const targetElement = await driver.$(`id=${targetElementId}`)
                
                const sourceLocation = await sourceElement.getLocation()
                const sourceSize = await sourceElement.getSize()
                const targetLocation = await targetElement.getLocation()
                const targetSize = await targetElement.getSize()
                
                const sourceX = sourceLocation.x + (sourceSize.width / 2)
                const sourceY = sourceLocation.y + (sourceSize.height / 2)
                const targetX = targetLocation.x + (targetSize.width / 2)
                const targetY = targetLocation.y + (targetSize.height / 2)

                await driver.touchAction([
                    { action: 'press', x: sourceX, y: sourceY },
                    { action: 'wait', ms: 500 },
                    { action: 'moveTo', x: targetX, y: targetY },
                    { action: 'release' }
                ])
            }
        )
}

/**
 * 6. TAP - Toque simple (ya disponible en Serenity/JS)
 * Pero aquí hay variaciones útiles
 */
export class MobileTap {
    /**
     * Tap en coordenadas específicas
     */
    static tapAt = (x: number, y: number) =>
        Task.where(`#actor hace tap en (${x}, ${y})`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                await driver.touchAction({
                    action: 'tap',
                    x: x,
                    y: y
                })
            }
        )

    /**
     * Double tap
     */
    static doubleTap = (x: number, y: number) =>
        Task.where(`#actor hace double tap en (${x}, ${y})`,
            async (actor: Actor) => {
                const driver = await actor.answer(actor.abilityTo(BrowseTheWeb).browser)
                await driver.touchAction([
                    { action: 'tap', x: x, y: y },
                    { action: 'wait', ms: 100 },
                    { action: 'tap', x: x, y: y }
                ])
            }
        )
}

/**
 * NOTA IMPORTANTE:
 * 
 * Estos ejemplos asumen que tienes acceso al driver de WebDriverIO.
 * En Serenity/JS, necesitarás adaptar estos ejemplos para usar
 * las habilidades (Abilities) de Serenity/JS correctamente.
 * 
 * Alternativa más simple: Usar comandos de Appium directamente
 * a través de ExecuteScript cuando sea posible.
 */

