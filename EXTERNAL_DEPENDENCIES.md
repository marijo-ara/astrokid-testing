# Dependencias Externas en Tests

Este documento describe las dependencias externas que requieren los tests y cómo manejarlas.

## Dependencias Identificadas

### 1. Firebase Authentication

**Uso**: Tests de Empathy, Resilience y MCP requieren tokens de Firebase.

**Estado Actual**: 
- ✅ Se generan tokens de prueba automáticamente
- ✅ Requiere `ALLOW_UNVERIFIED_FIREBASE=true` en el backend
- ⚠️ No hay mocks implementados

**Solución Actual**:
- Los tests usan `FirebaseTokenHelper.GenerateTestFirebaseToken()` para generar tokens de prueba
- Estos tokens tienen la estructura correcta pero no están verificados por Firebase
- El backend debe tener `ALLOW_UNVERIFIED_FIREBASE=true` para aceptarlos

**Mejoras Futuras**:
- [ ] Implementar mocks para Firebase Authentication
- [ ] Crear un servicio de mock que simule la validación de tokens
- [ ] Permitir inyección de dependencias para facilitar testing

**Documentación Relacionada**: Ver [FIREBASE_TESTS_SETUP.md](./FIREBASE_TESTS_SETUP.md)

### 2. Azure Speech Services

**Uso**: Tests de Empathy que procesan audio para detectar emociones.

**Estado Actual**:
- ⚠️ No hay mocks implementados
- ⚠️ Los tests usan datos de audio de prueba mínimos
- ⚠️ Requiere configuración de Azure Speech Services en el backend

**Solución Actual**:
- Los tests envían audio base64 mínimo válido (solo header WAV)
- El backend debe tener configurado Azure Speech Services
- Si el servicio no está disponible, los tests pueden fallar

**Mejoras Futuras**:
- [ ] Implementar mocks para Azure Speech Services
- [ ] Crear respuestas de prueba predefinidas para diferentes emociones
- [ ] Permitir deshabilitar llamadas reales a Azure en tests

**Ejemplo de Test Actual**:
```csharp
var audioRequest = new
{
    audioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="
};
```

### 3. Base de Datos

**Uso**: Todos los tests de API requieren acceso a la base de datos.

**Estado Actual**:
- ✅ Los tests crean datos de prueba automáticamente
- ✅ Se implementó cleanup automático de recursos creados
- ⚠️ No hay base de datos de prueba aislada

**Solución Actual**:
- Los tests usan la misma base de datos configurada en `ASTROKID_BASE_URL`
- `BaseApiTest` registra recursos creados y los limpia en `TearDown()`
- Los tests intentan ser independientes pero pueden tener conflictos si se ejecutan en paralelo

**Mejoras Futuras**:
- [ ] Implementar base de datos de prueba aislada por test
- [ ] Usar transacciones que se revierten después de cada test
- [ ] Configurar base de datos en memoria para tests unitarios

**Cleanup Implementado**:
```csharp
// En BaseApiTest.TearDown()
foreach (var resource in _createdResources)
{
    await Client.DeleteAsync($"/children/{resource.Id}", ParentToken ?? "");
}
```

### 4. Servicios de Backend

**Uso**: Todos los tests requieren que el backend esté corriendo.

**Estado Actual**:
- ✅ Los tests verifican que `ASTROKID_BASE_URL` esté configurada
- ⚠️ No hay verificación de que el backend esté disponible
- ⚠️ No hay health check antes de ejecutar tests

**Mejoras Futuras**:
- [ ] Agregar health check antes de ejecutar tests
- [ ] Implementar retry logic para requests fallidos
- [ ] Agregar timeout configurable para requests

## Estrategia de Mocking

### Opción 1: Mocks en el Cliente HTTP

Crear un `MockAstroKidClient` que simule respuestas sin hacer requests reales:

```csharp
public class MockAstroKidClient : AstroKidClient
{
    private readonly Dictionary<string, RestResponse> _mockResponses;
    
    public override async Task<RestResponse> PostAsync<T>(string endpoint, T? body, string token = "")
    {
        var key = $"{endpoint}:{JsonSerializer.Serialize(body)}";
        if (_mockResponses.ContainsKey(key))
        {
            return _mockResponses[key];
        }
        return await base.PostAsync(endpoint, body, token);
    }
}
```

### Opción 2: Servidor Mock

Crear un servidor HTTP mock que responda con datos predefinidos:

```csharp
public class MockBackendServer
{
    public void Start()
    {
        // Iniciar servidor HTTP simple que responde con JSON predefinido
    }
    
    public void Stop()
    {
        // Detener servidor
    }
}
```

### Opción 3: Interceptores HTTP

Usar bibliotecas como `WireMock` o `MockHttp` para interceptar requests:

```csharp
var mockHttp = new MockHttpMessageHandler();
mockHttp.When("http://localhost:8000/auth/dev-login")
    .Respond("application/json", "{ \"access_token\": \"test-token\" }");
```

## Recomendaciones

### Para Desarrollo Local

1. **Usar tokens de prueba de Firebase** (ya implementado)
2. **Configurar `ALLOW_UNVERIFIED_FIREBASE=true`** en el backend
3. **Usar base de datos de desarrollo separada**
4. **Configurar Azure Speech Services** o usar mocks

### Para CI/CD

1. **Configurar variables de entorno** para todos los servicios
2. **Usar servicios mock** cuando sea posible
3. **Configurar base de datos de prueba aislada**
4. **Agregar health checks** antes de ejecutar tests

### Para Producción

1. **NUNCA usar `ALLOW_UNVERIFIED_FIREBASE=true`** en producción
2. **Usar tokens reales de Firebase** si es necesario
3. **Usar servicios reales** con configuración adecuada
4. **Implementar rate limiting** y timeouts

## Configuración Recomendada

### Variables de Entorno para Tests

```powershell
# Backend URL
$env:ASTROKID_BASE_URL = "http://localhost:8000"

# Environment
$env:ASTROKID_ENV = "QA"

# Firebase (solo para desarrollo/testing)
$env:ALLOW_UNVERIFIED_FIREBASE = "true"

# Azure (opcional, si se usan mocks)
$env:USE_MOCK_AZURE_SPEECH = "true"
```

### Archivo de Configuración de Tests

```json
{
  "TestSettings": {
    "BaseUrl": "http://localhost:8000",
    "Environment": "QA",
    "UseMocks": true,
    "Firebase": {
      "UseTestTokens": true,
      "AllowUnverified": true
    },
    "Azure": {
      "UseMocks": true
    }
  }
}
```

## Próximos Pasos

1. [ ] Implementar mocks para Azure Speech Services
2. [ ] Crear base de datos de prueba aislada
3. [ ] Agregar health checks antes de ejecutar tests
4. [ ] Implementar retry logic para requests
5. [ ] Crear documentación de configuración por entorno
6. [ ] Agregar tests de integración con servicios mock

