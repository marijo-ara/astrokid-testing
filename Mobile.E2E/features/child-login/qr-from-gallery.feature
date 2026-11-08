# language: es
@mobile @child-login
Característica: El niño entra con el código QR que su familia descargó

  En la 1.5.13 el APK no dejaba entrar con el QR: el cifrado de los datos del niño
  en el teléfono usaba TextDecoder y crypto.getRandomValues, que Hermes no trae.
  Este escenario corre sobre el APK real, instalado desde cero, para que una
  regresión así no vuelva a publicarse.

  Escenario: Instalación limpia, QR desde la galería y sesión que sobrevive al reinicio
    Dado que Mia tiene el código QR de acceso que su familia descargó en QA
    Cuando abre AstroKid recién instalado y elige ese QR desde la galería
    Entonces la app le da la bienvenida por su nombre
    Y entra a su mundo después de la introducción
    Cuando cierra la app y la vuelve a abrir
    Entonces sigue dentro de su sesión sin escanear de nuevo
