# Configuración de Tests con Firebase

## ¿Por qué estaban marcados con `[Ignore]`?

Los tests estaban marcados con `[Ignore]` porque requerían tokens de Firebase reales y verificados. Ahora hemos implementado una solución que permite ejecutar estos tests sin necesidad de tokens reales de Firebase.

## Solución Implementada

Hemos creado un **helper que genera tokens de prueba** compatibles con la estructura de Firebase. Estos tokens:

- ✅ Tienen la estructura correcta de JWT de Firebase
- ✅ Incluyen todos los claims necesarios (`sub`, `user_id`, `email`, etc.)
- ✅ No están firmados por Firebase (son tokens de prueba)
- ✅ Funcionan cuando el backend tiene `ALLOW_UNVERIFIED_FIREBASE=true`

## Configuración del Backend

Para que los tests funcionen, el backend debe tener habilitada la opción de aceptar tokens no verificados en desarrollo:

### Opción 1: Variable de Entorno (Recomendado para desarrollo)

```bash
# En el backend, configura:
export ALLOW_UNVERIFIED_FIREBASE=true
```

O en Windows:
```powershell
$env:ALLOW_UNVERIFIED_FIREBASE = "true"
```

### Opción 2: Archivo .env

Agrega al archivo `.env` del backend:

```env
ALLOW_UNVERIFIED_FIREBASE=true
```

### Opción 3: En App Engine / Producción

**⚠️ IMPORTANTE**: NO habilites `ALLOW_UNVERIFIED_FIREBASE=true` en producción. Esta opción es solo para desarrollo y testing.

Para producción, usa tokens reales de Firebase.

## Cómo Funciona

1. **BaseApiTest** genera automáticamente un token de Firebase de prueba en el `SetUp()`
2. El token se almacena en la propiedad `FirebaseToken`
3. Los tests usan `FirebaseToken` en lugar de `ParentToken` para endpoints que requieren Firebase
4. El backend, con `ALLOW_UNVERIFIED_FIREBASE=true`, acepta estos tokens si tienen la estructura correcta

## Tests Actualizados

Los siguientes tests ahora se ejecutan automáticamente (ya no tienen `[Ignore]`):

### Empathy Tests
- ✅ `Status_Should_Return_Ok_With_Valid_Token`
- ✅ `ProcessInput_Should_Process_Audio_And_Detect_Emotion`
- ✅ `SendFeedback_Should_Accept_Feedback`

### Resilience Tests
- ✅ `StartResilience_Should_Activate_Agent_With_Valid_Request`
- ✅ `StartResilience_Should_Return_400_With_Invalid_Trigger`
- ✅ `StartResilience_Should_Handle_Different_Emotions`

### MCP Tests
- ✅ `MCPListener_Should_Process_Emotion_Event`
- ✅ `MCPListener_Should_Trigger_Resilience_Agent_After_3_Negative_Emotions`
- ✅ `MCPListener_Should_Ignore_Unsupported_Event_Type`
- ✅ `MCPListener_Should_Continue_Monitoring_For_Neutral_Emotions`

## Ejecutar los Tests

Una vez configurado el backend con `ALLOW_UNVERIFIED_FIREBASE=true`:

```powershell
# Configurar URL del backend
$env:ASTROKID_BASE_URL = "https://astrokid-480117.uc.r.appspot.com"

# Ejecutar todos los tests
.\run_backend_tests.ps1

# O ejecutar tests específicos de Firebase
dotnet test --filter "FullyQualifiedName~EmpathyTests"
dotnet test --filter "FullyQualifiedName~ResilienceTests"
dotnet test --filter "FullyQualifiedName~MCPTests"
```

## Troubleshooting

### Error: Tests retornan 401 Unauthorized

**Causa**: El backend no tiene `ALLOW_UNVERIFIED_FIREBASE=true` configurado.

**Solución**: 
1. Verifica que la variable de entorno esté configurada en el backend
2. Reinicia el backend si es necesario
3. Verifica que el backend esté leyendo las variables de entorno correctamente

### Error: Tests fallan con "Invalid token"

**Causa**: El token generado no tiene la estructura correcta o el backend está rechazando tokens no verificados.

**Solución**:
1. Verifica que `ALLOW_UNVERIFIED_FIREBASE=true` esté configurado
2. Verifica que el backend tenga la lógica para aceptar tokens no verificados (ver `services/auth.py`)

### Error: Tests funcionan localmente pero no en CI/CD

**Causa**: La variable de entorno no está configurada en el entorno de CI/CD.

**Solución**:
1. Configura `ALLOW_UNVERIFIED_FIREBASE=true` en las variables de entorno de CI/CD
2. O usa un entorno de testing separado con esta configuración

## Seguridad

⚠️ **IMPORTANTE**: 

- `ALLOW_UNVERIFIED_FIREBASE=true` **SOLO** debe usarse en:
  - Desarrollo local
  - Entornos de testing
  - CI/CD con datos de prueba

- **NUNCA** uses `ALLOW_UNVERIFIED_FIREBASE=true` en:
  - Producción
  - Entornos con datos reales
  - Cualquier entorno accesible públicamente sin autenticación real

## Alternativa: Usar Tokens Reales de Firebase

Si prefieres usar tokens reales de Firebase en lugar de tokens de prueba:

1. Configura Firebase Authentication en tu proyecto
2. Obtén un token real usando el SDK de Firebase
3. Pasa el token como variable de entorno o en un archivo de configuración
4. Modifica `BaseApiTest` para usar el token real en lugar del generado

Ejemplo:

```csharp
// En BaseApiTest.cs
FirebaseToken = Environment.GetEnvironmentVariable("FIREBASE_TEST_TOKEN") 
    ?? FirebaseTokenHelper.GenerateTestFirebaseToken(...);
```

## Archivos Modificados

- ✅ `Core/Helpers/FirebaseTokenHelper.cs` - Helper para generar tokens de prueba
- ✅ `API.Tests/BaseApiTest.cs` - Genera automáticamente `FirebaseToken`
- ✅ `API.Tests/Empathy/EmpathyTests.cs` - Usa `FirebaseToken` en lugar de `[Ignore]`
- ✅ `API.Tests/Resilience/ResilienceTests.cs` - Usa `FirebaseToken` en lugar de `[Ignore]`
- ✅ `API.Tests/MCP/MCPTests.cs` - Usa `FirebaseToken` en lugar de `[Ignore]`

