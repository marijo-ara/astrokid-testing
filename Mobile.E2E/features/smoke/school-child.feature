# language: es
@mobile @smoke @school
Característica: El niño de una familia con licencia escolar entra

  El padre de esta cuenta debe ser el de la licencia escolar (ASTROKID_PARENT_TOKEN)
  y el backend va en ASTROKID_BASE_URL. Sin esas dos variables el escenario se omite.
  Crea un niño solo para el QR y lo borra al terminar. No crea una escuela ni cambia la licencia.

  Escenario: Instalación limpia y entrada con el QR de esa familia
    Dado que Vega tiene el código QR de acceso que su familia descargó en QA
    Cuando abre AstroKid recién instalado y elige ese QR desde la galería
    Entonces la app le da la bienvenida por su nombre
    Y entra a su mundo después de la introducción
