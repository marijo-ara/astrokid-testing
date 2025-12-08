# API Tests para AstroKid Backend

Este proyecto contiene tests de integración para los endpoints de la API de AstroKid Backend.

## Estructura de Tests

Los tests están organizados por módulos de la API:

- **Auth**: Tests para autenticación (`/auth/dev-login`)
- **ChildTokens**: Tests para gestión de tokens de niños (`/child-tokens/*`)
- **Children**: Tests para gestión de perfiles de niños (`/children/*`)
- **Empathy**: Tests para el agente de empatía (`/empathy/*`)
- **Resilience**: Tests para el agente de resiliencia (`/resilience/*`)
- **FamilyProfiles**: Tests para perfiles de familia (`/family-profiles/*`)
- **Parents**: Tests para perfiles de padres (`/parent-profiles/*`)
- **Wallet**: Tests para gestión de wallets y recompensas (`/wallet/*`)
- **MCP**: Tests para el sistema de orquestación MCP (`/mcp/*`)

## Configuración

### Variables de Entorno Requeridas

Antes de ejecutar los tests, configura la siguiente variable de entorno:

```powershell
# Windows PowerShell
# Para desarrollo local
$env:ASTROKID_BASE_URL = "http://localhost:8000"

# Para producción (backend desplegado)
$env:ASTROKID_BASE_URL = "https://astrokid-480117.uc.r.appspot.com"
```

### Opcional

```powershell
$env:ASTROKID_ENV = "QA"  # Por defecto es "QA"
```

## Ejecutar Tests

### Opción 1: Usando el Script PowerShell

```powershell
cd "C:\Users\Test\Documents\Gitlab\AstroKid.Tests"
.\run_backend_tests.ps1
```

### Opción 2: Usando dotnet test directamente

```powershell
cd "C:\Users\Test\Documents\Gitlab\AstroKid.Tests"
dotnet test AstroKid.Tests.sln --verbosity normal
```

### Opción 3: Ejecutar tests específicos

```powershell
# Solo tests de autenticación
dotnet test --filter "FullyQualifiedName~AuthTests"

# Solo tests de child tokens
dotnet test --filter "FullyQualifiedName~ChildTokensTests"

# Solo tests de family profiles
dotnet test --filter "FullyQualifiedName~FamilyProfilesTests"

# Solo tests de children
dotnet test --filter "FullyQualifiedName~ChildrenTests"

# Solo tests de parent profiles
dotnet test --filter "FullyQualifiedName~ParentProfilesTests"

# Solo tests de wallet
dotnet test --filter "FullyQualifiedName~WalletTests"

# Solo tests de MCP
dotnet test --filter "FullyQualifiedName~MCPTests"
```

## Tests Implementados

### Auth Tests (`AuthTests.cs`)
- ✅ `DevLogin_Should_Return_Token_With_Valid_Email`
- ✅ `DevLogin_Should_Create_New_Parent_If_Not_Exists`
- ✅ `DevLogin_Should_Return_400_With_Invalid_Email`
- ✅ `DevLogin_Should_Use_Email_As_Name_If_Name_Not_Provided`

### Child Tokens Tests (`ChildTokensTests.cs`)
- ✅ `GenerateToken_Should_Return_Token_With_Valid_Request`
- ✅ `GenerateToken_Should_Return_403_Without_Authentication`
- ✅ `GenerateToken_Should_Return_400_With_Invalid_ChildId`
- ✅ `ValidateToken_Should_Return_Valid_With_Correct_Token`
- ✅ `ValidateToken_Should_Return_Invalid_With_Wrong_Token`
- ✅ `GetChildren_Should_Return_List_With_Valid_Email`
- ✅ `GetChildren_Should_Return_403_Without_Authentication`
- ✅ `RevokeToken_Should_Return_Success_With_Valid_ChildId`
- ✅ `RevokeToken_Should_Return_404_With_Invalid_ChildId`
- ✅ `HealthCheck_Should_Return_Service_Status`

### Empathy Tests (`EmpathyTests.cs`)
- ✅ `Status_Should_Return_Ok_With_Valid_Token` (Usa token de Firebase de prueba)
- ✅ `Status_Should_Return_401_Without_Token`
- ✅ `ProcessInput_Should_Process_Audio_And_Detect_Emotion` (Usa token de Firebase de prueba)
- ✅ `ProcessInput_Should_Return_400_With_Invalid_Base64`
- ✅ `SendFeedback_Should_Accept_Feedback` (Usa token de Firebase de prueba)

### Resilience Tests (`ResilienceTests.cs`)
- ✅ `StartResilience_Should_Activate_Agent_With_Valid_Request` (Usa token de Firebase de prueba)
- ✅ `StartResilience_Should_Return_400_With_Invalid_Trigger` (Usa token de Firebase de prueba)
- ✅ `StartResilience_Should_Handle_Different_Emotions` (Usa token de Firebase de prueba)

### Family Profiles Tests (`FamilyProfilesTests.cs`)
- ✅ `CreateFamilyProfile_Should_Create_New_Family_With_Valid_Data`
- ✅ `CreateFamilyProfile_Should_Return_400_With_Invalid_Age`
- ✅ `CreateFamilyProfile_Should_Return_400_With_Wrong_Adjectives_Count`
- ✅ `GetFamilyProfile_Should_Return_Family_With_Valid_Id`
- ✅ `GetFamilyProfile_Should_Return_404_With_Invalid_Id`
- ✅ `GetFamilyProfileByEmail_Should_Return_Family`
- ✅ `GetAllFamilyProfiles_Should_Return_List`
- ✅ `AddChildToFamily_Should_Create_New_Child`

### Children Tests (`ChildrenTests.cs`)
- ✅ `CreateChild_Should_Create_New_Child_With_Valid_Data`
- ✅ `CreateChild_Should_Return_400_With_Invalid_Age`
- ✅ `CreateChild_Should_Return_400_With_Wrong_Adjectives_Count`
- ✅ `GetChildren_Should_Return_List`
- ✅ `GetChild_Should_Return_Child_With_Valid_Id`
- ✅ `GetChild_Should_Return_404_With_Invalid_Id`
- ✅ `UpdateChild_Should_Update_Child_With_Valid_Data`
- ✅ `DeleteChild_Should_Delete_Child_With_Valid_Id`
- ✅ `DeleteChild_Should_Return_404_With_Invalid_Id`

### Parent Profiles Tests (`ParentProfilesTests.cs`)
- ✅ `CreateParentProfile_Should_Create_New_Profile_With_Valid_Data`
- ✅ `GetParentProfile_Should_Return_Profile_With_Valid_Id`
- ✅ `GetParentProfile_Should_Return_404_With_Invalid_Id`
- ✅ `GetAllParentProfiles_Should_Return_List`
- ✅ `UpdateParentProfile_Should_Update_Profile_With_Valid_Data`
- ✅ `DeleteParentProfile_Should_Delete_Profile_With_Valid_Id`
- ✅ `GetParentChildren_Should_Return_Children_Ids`
- ✅ `AddChildToParent_Should_Add_Child_To_Profile`
- ✅ `RemoveChildFromParent_Should_Remove_Child_From_Profile`

### Wallet Tests (`WalletTests.cs`)
- ✅ `CreateActivity_Should_Create_Activity_And_Add_Reward`
- ✅ `CreateActivity_Should_Return_400_With_ChildId_Mismatch`
- ✅ `GetWallet_Should_Return_Wallet_After_Creating_Activity`
- ✅ `GetWallet_Should_Return_404_With_Invalid_ChildId`
- ✅ `GetWalletSummary_Should_Return_Summary`
- ✅ `GetChildActivities_Should_Return_Activities_List`
- ✅ `GetChildActivities_Should_Filter_By_Activity_Type`
- ✅ `GetActivity_Should_Return_Specific_Activity`
- ✅ `UpdateWallet_Should_Update_Counters`
- ✅ `GetWalletStats_Should_Return_Statistics`
- ✅ `GetAllWallets_Should_Return_List`
- ✅ `DeleteWallet_Should_Delete_Wallet`
- ✅ `CreateActivity_Should_Update_Coins_Counter`
- ✅ `CreateActivity_Should_Update_Achievements_Counter`

### MCP Tests (`MCPTests.cs`)
- ✅ `MCPListener_Should_Process_Emotion_Event` (Usa token de Firebase de prueba)
- ✅ `MCPListener_Should_Return_401_Without_Token`
- ✅ `MCPListener_Should_Trigger_Resilience_Agent_After_3_Negative_Emotions` (Usa token de Firebase de prueba)
- ✅ `MCPListener_Should_Ignore_Unsupported_Event_Type` (Usa token de Firebase de prueba)
- ✅ `MCPListener_Should_Continue_Monitoring_For_Neutral_Emotions` (Usa token de Firebase de prueba)

## Notas Importantes

### Tests con Firebase

Los tests que requieren Firebase ahora usan **tokens de prueba generados automáticamente**. Estos tokens:
- ✅ Se generan automáticamente en `BaseApiTest.SetUp()`
- ✅ Tienen la estructura correcta de tokens de Firebase
- ✅ Funcionan cuando el backend tiene `ALLOW_UNVERIFIED_FIREBASE=true`

**Para que funcionen correctamente:**
1. Configura `ALLOW_UNVERIFIED_FIREBASE=true` en el backend (solo para desarrollo/testing)
2. Los tokens se generan automáticamente, no necesitas configuración adicional

**⚠️ IMPORTANTE**: `ALLOW_UNVERIFIED_FIREBASE=true` solo debe usarse en desarrollo/testing, nunca en producción.

Ver documentación completa en: [FIREBASE_TESTS_SETUP.md](../FIREBASE_TESTS_SETUP.md)

### Tests que Requieren Datos Previos

Algunos tests crean datos de prueba automáticamente, pero otros pueden requerir que existan ciertos datos en la base de datos. Los tests están diseñados para ser independientes cuando es posible.

## Clase Base

Todos los tests heredan de `BaseApiTest` que proporciona:
- Configuración común del cliente HTTP
- Obtención automática de token de autenticación
- Helpers para crear datos de prueba
- Verificación de variables de entorno

## Troubleshooting

### Error: "ASTROKID_BASE_URL no está configurada"

Configura la variable de entorno antes de ejecutar los tests:
```powershell
$env:ASTROKID_BASE_URL = "http://localhost:8000"
```

### Error: "401 Unauthorized" o "403 Forbidden"

Algunos endpoints requieren autenticación. Los tests intentan obtener un token automáticamente usando `/auth/dev-login`. Si esto falla, verifica que:
1. El backend esté corriendo
2. El endpoint `/auth/dev-login` esté disponible
3. La base de datos esté configurada correctamente

### Tests que fallan intermitentemente

Algunos tests pueden fallar si hay datos en conflicto en la base de datos. Considera usar una base de datos de pruebas separada o limpiar los datos antes de ejecutar los tests.

## Mejoras Implementadas

- [x] Agregar tests para endpoints de wallet
- [x] Agregar tests para endpoints de parent profiles
- [x] Agregar tests para endpoints de children
- [x] Agregar tests para endpoints de MCP
- [x] Eliminar archivos placeholder (UnitTest1.cs)
- [x] Completar tests incompletos (Parents.cs, TokenTests.cs)
- [x] Implementar cleanup automático de datos de prueba
- [x] Agregar validaciones robustas de errores y JSON
- [x] Mejorar manejo de dependencias externas con documentación
- [x] Agregar más tests de UI

## Mejoras Futuras

- [ ] Implementar mocks para servicios externos (Firebase, Azure)
- [ ] Agregar tests de rendimiento
- [ ] Agregar tests de seguridad
- [ ] Implementar tests de carga
- [ ] Agregar tests de integración end-to-end completos
- [ ] Implementar base de datos de prueba aislada
- [ ] Agregar health checks antes de ejecutar tests
- [ ] Implementar retry logic para requests fallidos

## Mejoras Recientes

### Cleanup Automático de Datos

Los tests ahora registran automáticamente los recursos creados y los limpian después de cada test:

```csharp
// Registrar recurso para cleanup
RegisterResourceForCleanup(ResourceType.Child, childId);
```

### Validaciones Robustas

Se agregaron helpers para validaciones más robustas:

```csharp
// Validar JSON con propiedades requeridas
var jsonResponse = AssertValidJsonResponse(response.Content, "id", "name", "age");

// Validar respuestas de error
AssertErrorResponse(response.Content, response.StatusCode);
```

### Tests de UI Mejorados

Se agregaron nuevos tests de UI:
- `DashboardTests.cs` - Tests para el dashboard después del login
- `LandingPageTests.cs` - Tests para la página de inicio
- `ParentsTests.cs` - Tests completos de login de padres

Ver documentación completa en: [EXTERNAL_DEPENDENCIES.md](../EXTERNAL_DEPENDENCIES.md)

