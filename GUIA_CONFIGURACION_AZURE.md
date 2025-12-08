# Guía Paso a Paso: Configurar Variables en Azure DevOps

Esta guía te mostrará cómo configurar las variables de entorno necesarias para que el pipeline de Azure DevOps funcione correctamente.

## Opción 1: Configurar Variables en el Pipeline (Recomendado)

### Paso 1: Acceder al Pipeline

1. Ve a **Azure DevOps** (https://dev.azure.com)
2. Selecciona tu **Organización**
3. Selecciona tu **Proyecto**
4. En el menú lateral, haz clic en **Pipelines**
5. Selecciona tu pipeline (o crea uno nuevo si no existe)

### Paso 2: Editar el Pipeline

1. Haz clic en el botón **Edit** (Editar) en la parte superior derecha
2. O si es la primera vez, haz clic en **Create Pipeline** (Crear Pipeline)

### Paso 3: Agregar Variables

1. En la parte superior del editor de pipeline, busca y haz clic en **Variables** (junto a "Save" y "Run")
2. Haz clic en **+ New variable** (Nueva variable)

### Paso 4: Configurar Cada Variable

Agrega las siguientes variables una por una:

#### Variable 1: ASTROKID_BASE_URL (OBLIGATORIA)

```
Nombre: ASTROKID_BASE_URL
Valor: https://astrokid-480117.uc.r.appspot.com
```

**Opciones adicionales:**
- ☐ **Keep this value secret** - Marca esta opción si el valor contiene información sensible
- ☐ **Let users override this value when running this pipeline** - Permite sobrescribir al ejecutar manualmente

Haz clic en **OK**

#### Variable 2: BASE_URL (OPCIONAL - Solo para tests de UI)

```
Nombre: BASE_URL
Valor: https://astro-kid-web-dev.vercel.app
```

**Opciones adicionales:**
- ☐ **Keep this value secret** - Opcional
- ☐ **Let users override this value when running this pipeline** - Opcional

Haz clic en **OK**

#### Variable 3: ASTROKID_ENV (OPCIONAL)

```
Nombre: ASTROKID_ENV
Valor: QA
```

**Opciones adicionales:**
- ☐ **Keep this value secret** - No necesario
- ☐ **Let users override this value when running this pipeline** - Opcional

Haz clic en **OK**

### Paso 5: Guardar el Pipeline

1. Haz clic en **Save** (Guardar) en la parte superior
2. Ingresa un mensaje de commit (opcional)
3. Haz clic en **Save** nuevamente

## Opción 2: Configurar Variables a Nivel de Proyecto (Recomendado para Múltiples Pipelines)

Si tienes múltiples pipelines que usan las mismas variables, es mejor configurarlas a nivel de proyecto:

### Paso 1: Acceder a Library

1. Ve a **Azure DevOps** > Tu **Proyecto**
2. En el menú lateral, haz clic en **Pipelines**
3. Selecciona **Library** (Biblioteca)

### Paso 2: Crear Variable Group (Opcional pero Recomendado)

1. Haz clic en **+ Variable group** (Grupo de variables)
2. Nombre: `AstroKid Test Variables`
3. Descripción: `Variables para tests de AstroKid`

### Paso 3: Agregar Variables al Grupo

Haz clic en **+ Add** para cada variable:

1. **ASTROKID_BASE_URL**
   - Value: `https://astrokid-480117.uc.r.appspot.com`
   - ☑ Keep this value secret (si es necesario)

2. **BASE_URL**
   - Value: `https://astro-kid-web-dev.vercel.app`
   - ☐ Keep this value secret

3. **ASTROKID_ENV**
   - Value: `QA`
   - ☐ Keep this value secret

### Paso 4: Guardar el Grupo

Haz clic en **Save**

### Paso 5: Referenciar el Grupo en el Pipeline

1. Edita tu pipeline (`azure-pipelines.yml`)
2. Agrega al inicio del archivo (después de `variables:`):

```yaml
variables:
- group: 'AstroKid Test Variables'  # Nombre del grupo que creaste
```

O si prefieres variables individuales:

```yaml
variables:
  ASTROKID_BASE_URL: '$(ASTROKID_BASE_URL)'
  BASE_URL: '$(BASE_URL)'
  ASTROKID_ENV: '$(ASTROKID_ENV)'
```

## Opción 3: Configurar Variables en el YAML Directamente (No Recomendado para Valores Sensibles)

Puedes definir valores por defecto directamente en el YAML, pero no es recomendado para valores que cambian entre entornos:

```yaml
variables:
  ASTROKID_BASE_URL: 'https://astrokid-480117.uc.r.appspot.com'
  BASE_URL: 'https://astro-kid-web-dev.vercel.app'
  ASTROKID_ENV: 'QA'
```

**Nota**: Los valores en Azure DevOps sobrescribirán estos valores por defecto.

## Verificar que las Variables Están Configuradas

### Método 1: Desde la Interfaz

1. Ve a **Pipelines** > Tu pipeline > **Edit**
2. Haz clic en **Variables**
3. Deberías ver todas las variables listadas

### Método 2: Ejecutar el Pipeline

1. Ejecuta el pipeline manualmente
2. En los logs, busca la sección de variables (pueden estar ocultas si están marcadas como secretas)
3. Verifica que los valores sean correctos

## Valores Recomendados por Entorno

### Desarrollo/QA
```
ASTROKID_BASE_URL = https://astrokid-480117.uc.r.appspot.com
BASE_URL = https://astro-kid-web-dev.vercel.app
ASTROKID_ENV = QA
```

### Producción (si aplica)
```
ASTROKID_BASE_URL = https://api.astrokid.com
BASE_URL = https://astrokid.com
ASTROKID_ENV = PROD
```

## Troubleshooting

### Error: "Variable not found"

**Causa**: La variable no está configurada o tiene un nombre diferente.

**Solución**:
1. Verifica el nombre exacto de la variable (case-sensitive)
2. Asegúrate de que esté configurada en el pipeline o en el grupo de variables
3. Si usas un grupo de variables, verifica que el pipeline tenga acceso a él

### Error: "ASTROKID_BASE_URL no está configurada"

**Causa**: La variable no se está pasando correctamente a los tests.

**Solución**:
1. Verifica que la variable esté en la sección `env:` del paso de tests
2. Verifica que el nombre sea exactamente `ASTROKID_BASE_URL` (sin espacios)
3. Ejecuta el pipeline y revisa los logs para ver qué valor tiene la variable

### Variables Secretas No Se Muestran

**Causa**: Las variables marcadas como "secret" están ocultas por seguridad.

**Solución**: Esto es normal. Las variables secretas se muestran como `***` en los logs. Solo verifica que el pipeline funcione correctamente.

## Ejemplo Visual

```
Azure DevOps
├── Pipelines
│   ├── Edit Pipeline
│   │   └── Variables (botón en la parte superior)
│   │       ├── + New variable
│   │       │   ├── Name: ASTROKID_BASE_URL
│   │       │   ├── Value: https://...
│   │       │   └── [ ] Keep this value secret
│   │       └── + New variable
│   │           └── ...
│   └── Library
│       └── Variable Groups
│           └── + Variable group
│               └── Variables
│                   └── + Add
```

## Próximos Pasos

Una vez configuradas las variables:

1. ✅ Guarda el pipeline
2. ✅ Ejecuta el pipeline manualmente para probar
3. ✅ Verifica que los tests se ejecuten correctamente
4. ✅ Revisa los resultados en la pestaña "Tests"

## Notas Importantes

- ⚠️ **Variables Secretas**: Si marcas una variable como "secret", no podrás ver su valor después de guardarla. Asegúrate de tener una copia del valor.
- ⚠️ **Case Sensitivity**: Los nombres de variables son case-sensitive. Usa exactamente `ASTROKID_BASE_URL` (no `AstroKid_Base_Url`).
- ⚠️ **Scope**: Las variables configuradas en el pipeline solo están disponibles en ese pipeline. Si necesitas compartirlas, usa Variable Groups.

## Referencias

- [Documentación oficial de Azure DevOps Variables](https://docs.microsoft.com/en-us/azure/devops/pipelines/process/variables)
- [Variable Groups en Azure DevOps](https://docs.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups)

