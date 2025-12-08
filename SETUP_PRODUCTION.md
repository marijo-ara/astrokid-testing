# Configuración para Ejecutar Tests contra Producción

Este documento explica cómo configurar y ejecutar las pruebas contra el backend en producción.

## Backend en Producción

El backend está desplegado en:
**https://astrokid-480117.uc.r.appspot.com**

## Configuración Rápida

### Windows PowerShell

```powershell
# Configurar la URL del backend de producción
$env:ASTROKID_BASE_URL = "https://astrokid-480117.uc.r.appspot.com"

# Opcional: Configurar el entorno
$env:ASTROKID_ENV = "PROD"

# Verificar que la variable esté configurada
echo $env:ASTROKID_BASE_URL
```

### Windows CMD

```cmd
set ASTROKID_BASE_URL=https://astrokid-480117.uc.r.appspot.com
set ASTROKID_ENV=PROD
```

### Linux/Mac (Bash)

```bash
export ASTROKID_BASE_URL="https://astrokid-480117.uc.r.appspot.com"
export ASTROKID_ENV="PROD"
```

## Ejecutar Tests

Una vez configurada la variable de entorno, ejecuta los tests:

```powershell
# Ejecutar todos los tests
.\run_backend_tests.ps1

# O usando dotnet directamente
dotnet test AstroKid.Tests.sln --verbosity normal
```

## Tests Disponibles

### Tests Completos (sin Firebase)
- ✅ **Auth**: Autenticación y login
- ✅ **ChildTokens**: Gestión de tokens de niños
- ✅ **Children**: CRUD de perfiles de niños
- ✅ **FamilyProfiles**: Gestión de perfiles familiares
- ✅ **ParentProfiles**: CRUD de perfiles de padres
- ✅ **Wallet**: Gestión de wallets, actividades y recompensas

### Tests Parciales (requieren Firebase)
- ⚠️ **Empathy**: Algunos tests requieren token de Firebase
- ⚠️ **Resilience**: Algunos tests requieren token de Firebase
- ⚠️ **MCP**: La mayoría de tests requieren token de Firebase

## Notas Importantes

1. **Datos de Prueba**: Los tests crean datos de prueba automáticamente. En producción, estos datos se crearán en la base de datos real.

2. **Limpieza**: Los tests están diseñados para ser independientes, pero algunos datos pueden persistir en la base de datos de producción.

3. **Firebase**: Los tests que requieren Firebase están marcados con `[Ignore]` y no se ejecutarán automáticamente. Para ejecutarlos, necesitarás:
   - Configurar Firebase Authentication
   - Obtener un token de Firebase válido
   - Remover el atributo `[Ignore]` de los tests

4. **Rate Limiting**: Si ejecutas muchos tests contra producción, ten en cuenta posibles límites de tasa.

## Ejecutar Tests Específicos

```powershell
# Solo tests de autenticación
dotnet test --filter "FullyQualifiedName~AuthTests"

# Solo tests de wallet
dotnet test --filter "FullyQualifiedName~WalletTests"

# Solo tests de children
dotnet test --filter "FullyQualifiedName~ChildrenTests"
```

## Verificar Conexión

Antes de ejecutar los tests, puedes verificar que el backend esté disponible:

```powershell
# Verificar health check
Invoke-WebRequest -Uri "https://astrokid-480117.uc.r.appspot.com/" -Method GET

# Debería retornar: {"status":"ok"}
```

## Troubleshooting

### Error: "ASTROKID_BASE_URL no está configurada"
- Asegúrate de haber configurado la variable de entorno antes de ejecutar los tests
- Verifica que estés en la misma sesión de PowerShell donde configuraste la variable

### Error: "Connection refused" o timeout
- Verifica que el backend esté disponible en la URL especificada
- Verifica tu conexión a internet
- Verifica que no haya problemas de firewall

### Tests fallan con 401/403
- Algunos endpoints requieren autenticación
- Los tests intentan obtener un token automáticamente usando `/auth/dev-login`
- Si esto falla, verifica que el endpoint de autenticación esté disponible

