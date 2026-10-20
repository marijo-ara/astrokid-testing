Feature: Ejemplo de Testing Móvil con Appium

  # Este feature muestra ejemplos prácticos de testing móvil
  # usando diferentes estrategias y gestos de Appium

  Scenario: Login en app nativa
    Given que la app está abierta
    When el usuario ingresa credenciales válidas
    Then debería ver la pantalla principal

  Scenario: Scroll en lista de items
    Given que estoy en la pantalla de lista
    When hago scroll hacia abajo
    Then debería ver más items en la lista

  Scenario: Swipe para eliminar item
    Given que tengo items en mi lista
    When hago swipe izquierda en un item
    Then el item debería ser eliminado

  Scenario: Long press para menú contextual
    Given que estoy viendo un item
    When hago long press en el item
    Then debería aparecer el menú contextual

  Scenario: Cambiar orientación de pantalla
    Given que la app está en modo portrait
    When roto el dispositivo a landscape
    Then la interfaz debería adaptarse correctamente

  Scenario: Navegar entre pantallas
    Given que estoy en la pantalla principal
    When toco el botón de configuración
    Then debería ver la pantalla de configuración

  Scenario: Verificar elemento después de scroll
    Given que tengo una lista larga
    When busco un elemento específico haciendo scroll
    Then el elemento debería ser visible


