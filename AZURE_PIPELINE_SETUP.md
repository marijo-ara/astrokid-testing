# Configuración del Pipeline de Azure DevOps

Este documento describe cómo configurar el pipeline de Azure DevOps para ejecutar los tests de AstroKid.

## Variables de Entorno Requeridas

Configura las siguientes variables en Azure DevOps (Pipeline > Variables):

### Variables Obligatorias

1. **`ASTROKID_BASE_URL`**
   - Descripción: URL del backend de AstroKid
   - Ejemplo: `https://astrokid-480117.uc.r.appspot.com`
   - Para desarrollo local: `http://localhost:8000`
   - **Importante**: Esta variable es obligatoria para los tests de API

2. **`BASE_URL`** (Opcional para tests de UI)
   - Descripción: URL del frontend de AstroKid
   - Ejemplo: `https://astro-kid-web-dev.vercel.app`
   - Solo necesario si ejecutas tests de UI

### Variables Opcionales

3. **`ASTROKID_ENV`**
   - Descripción: Entorno de ejecución
   - Valor por defecto: `QA`
   - Opciones: `QA`, `DEV`, `PROD`

## Configuración en Azure DevOps

### Paso 1: Agregar Variables al Pipeline

1. Ve a **Pipelines** > Tu pipeline > **Edit**
2. Haz clic en **Variables** en la parte superior
3. Agrega las variables necesarias:
   - `ASTROKID_BASE_URL` (obligatoria)
   - `BASE_URL` (opcional, solo para UI tests)
   - `ASTROKID_ENV` (opcional)

### Paso 2: Configurar el Pool

El pipeline está configurado para usar `windows-latest`. Si tu organización usa un pool personalizado:

```yaml
pool:
  name: 'YourPoolName'  # Cambiar esto
```

O si usas un pool con una imagen específica:

```yaml
pool:
  vmImage: 'windows-latest'  # o 'ubuntu-latest', 'macOS-latest'
```

### Paso 3: Configurar Permisos

Asegúrate de que el agente tenga permisos para:
- Instalar .NET SDK
- Instalar Playwright browsers
- Ejecutar tests
- Publicar resultados

## Estructura del Pipeline

El pipeline ejecuta los siguientes pasos:

1. **Checkout código** - Descarga el código fuente
2. **Instalar .NET SDK 9.0** - Instala el SDK necesario
3. **Restaurar paquetes** - Restaura dependencias de NuGet
4. **Compilar solución** - Compila todos los proyectos
5. **Instalar Playwright Browsers** - Instala Chromium para tests de UI
6. **Ejecutar tests de API** - Ejecuta tests de API (obligatorio)
7. **Ejecutar tests de UI** - Ejecuta tests de UI (opcional, continúa aunque falle)
8. **Publicar cobertura** - Publica resultados de cobertura de código

## Tests que Pueden Fallar

### Tests de UI
Los tests de UI pueden fallar si:
- El frontend no está disponible en `BASE_URL`
- Playwright no puede instalar los browsers
- El backend no está disponible

**Solución**: El pipeline continúa aunque los tests de UI fallen (`continueOnError: true`)

### Tests de API con Firebase
Los tests que requieren Firebase pueden fallar si:
- El backend no tiene `ALLOW_UNVERIFIED_FIREBASE=true`
- El backend no está disponible

**Solución**: Configura `ALLOW_UNVERIFIED_FIREBASE=true` en el backend o marca estos tests como opcionales

## Ejecución Condicional de Tests

### Ejecutar solo tests de API

Si quieres ejecutar solo tests de API, comenta o elimina el paso de tests de UI:

```yaml
# - task: DotNetCoreCLI@2
#   displayName: 'Ejecutar tests de UI'
#   ...
```

### Ejecutar solo tests de UI

Si quieres ejecutar solo tests de UI, comenta el paso de tests de API:

```yaml
# - task: DotNetCoreCLI@2
#   displayName: 'Ejecutar tests de API'
#   ...
```

### Filtrar tests específicos

Puedes agregar filtros para ejecutar solo ciertos tests:

```yaml
arguments: |
  --configuration $(buildConfiguration)
  --filter "FullyQualifiedName~AuthTests"
  --no-build
```

## Troubleshooting

### Error: "ASTROKID_BASE_URL no está configurada"

**Causa**: La variable de entorno no está configurada en Azure DevOps.

**Solución**:
1. Ve a Pipeline > Variables
2. Agrega `ASTROKID_BASE_URL` con el valor correcto
3. Asegúrate de que esté marcada como disponible durante la ejecución

### Error: "Playwright browsers not installed"

**Causa**: Playwright no pudo instalar los browsers.

**Solución**:
1. Verifica que el agente tenga permisos de escritura
2. El paso de instalación de Playwright tiene `continueOnError: true`, así que el pipeline continuará
3. Los tests de UI pueden fallar, pero el pipeline no se detendrá

### Error: "Tests timeout"

**Causa**: Los tests están tardando demasiado o el backend no responde.

**Solución**:
1. Verifica que `ASTROKID_BASE_URL` apunte a un backend disponible
2. Aumenta el timeout en los tests si es necesario
3. Considera usar un backend de prueba dedicado

### Error: "401 Unauthorized" en tests de Firebase

**Causa**: El backend no tiene `ALLOW_UNVERIFIED_FIREBASE=true` configurado.

**Solución**:
1. Configura `ALLOW_UNVERIFIED_FIREBASE=true` en el backend
2. O marca los tests de Firebase como opcionales usando `[Category("Firebase")]` y filtrando

## Mejoras Futuras

- [ ] Agregar health check del backend antes de ejecutar tests
- [ ] Implementar retry logic para tests que fallan intermitentemente
- [ ] Agregar notificaciones cuando los tests fallen
- [ ] Separar tests en diferentes jobs para mejor paralelización
- [ ] Agregar tests de smoke que se ejecuten primero

## Ejemplo de Configuración Completa

### Variables en Azure DevOps

```
ASTROKID_BASE_URL = https://astrokid-480117.uc.r.appspot.com
BASE_URL = https://astro-kid-web-dev.vercel.app
ASTROKID_ENV = QA
```

### Pipeline YAML

El archivo `azure-pipelines.yml` ya está configurado con todos los pasos necesarios. Solo necesitas:

1. Configurar las variables en Azure DevOps
2. Asegurarte de que el pool esté disponible
3. Ejecutar el pipeline

## Validación Local

Antes de hacer commit, valida el pipeline localmente:

```powershell
# Configurar variables de entorno
$env:ASTROKID_BASE_URL = "https://astrokid-480117.uc.r.appspot.com"
$env:ASTROKID_ENV = "QA"

# Ejecutar tests
.\run_backend_tests.ps1
```

Si los tests pasan localmente, deberían pasar en el pipeline también.

