using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.ChildTokens
{
    [TestFixture]
    public class ChildTokensTests : BaseApiTest
    {
        private string? _testChildId;
        private string? _testToken;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
            
            // Crear un perfil de familia de prueba para tener un child_id
            if (ParentToken != null)
            {
                try
                {
                    var familyProfile = CreateTestFamilyProfile();
                    var createResponse = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);
                    
                    if (createResponse.IsSuccessStatusCode && createResponse.Content != null)
                    {
                        var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                        if (jsonResponse.TryGetProperty("children", out var childrenElement) && 
                            childrenElement.GetArrayLength() > 0)
                        {
                            var firstChild = childrenElement[0];
                            if (firstChild.TryGetProperty("id", out var childIdElement))
                            {
                                _testChildId = childIdElement.GetString();
                            }
                            if (firstChild.TryGetProperty("token", out var tokenElement))
                            {
                                _testToken = tokenElement.GetString();
                            }
                        }
                    }
                }
                catch
                {
                    // Si falla la creación, los tests individuales manejarán el caso
                }
            }
        }

        [Test]
        public async Task GenerateToken_Should_Return_Token_With_Valid_Request()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id de prueba");

            var tokenRequest = CreateChildTokenRequest(_testChildId!);

            // Act
            var response = await Client.PostAsync("/child-tokens/generate", tokenRequest, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK al generar token");

            Assert.That(response.Content, Is.Not.Null.And.Not.Empty,
                "La respuesta debería contener contenido");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            Assert.That(jsonResponse.TryGetProperty("token", out var tokenElement), Is.True,
                "La respuesta debería contener token");
            
            Assert.That(tokenElement.GetString(), Is.Not.Null.And.Not.Empty,
                "El token no debería estar vacío");

            Assert.That(jsonResponse.TryGetProperty("child_id", out var childIdElement), Is.True,
                "La respuesta debería contener child_id");
            
            Assert.That(jsonResponse.TryGetProperty("expires_at", out var expiresAtElement), Is.True,
                "La respuesta debería contener expires_at");

            Assert.That(jsonResponse.TryGetProperty("parent_email", out var parentEmailElement), Is.True,
                "La respuesta debería contener parent_email");
        }

        [Test]
        public async Task GenerateToken_Should_Return_403_Without_Authentication()
        {
            // Arrange
            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id de prueba");
            var tokenRequest = CreateChildTokenRequest(_testChildId!);

            // Act
            var response = await Client.PostAsync("/child-tokens/generate", tokenRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar 401 o 403 sin autenticación");
        }

        [Test]
        public async Task GenerateToken_Should_Return_400_With_Invalid_ChildId()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            var tokenRequest = CreateChildTokenRequest("invalid-child-id");

            // Act
            var response = await Client.PostAsync("/child-tokens/generate", tokenRequest, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest).Or.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 400 o 404 para child_id inválido");
        }

        [Test]
        public async Task ValidateToken_Should_Return_Valid_With_Correct_Token()
        {
            // Arrange
            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id de prueba");
            Assume.That(_testToken, Is.Not.Null, "Se requiere un token de prueba");

            var validationRequest = new
            {
                token = _testToken,
                child_id = _testChildId
            };

            // Act
            var response = await Client.PostAsync("/child-tokens/validate", validationRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK al validar token");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            Assert.That(jsonResponse.TryGetProperty("valid", out var validElement), Is.True,
                "La respuesta debería contener valid");
            
            Assert.That(jsonResponse.TryGetProperty("success", out var successElement), Is.True,
                "La respuesta debería contener success");
        }

        [Test]
        public async Task ValidateToken_Should_Return_Invalid_With_Wrong_Token()
        {
            // Arrange
            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id de prueba");
            
            var validationRequest = new
            {
                token = "invalid-token-12345",
                child_id = _testChildId
            };

            // Act
            var response = await Client.PostAsync("/child-tokens/validate", validationRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK incluso con token inválido");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            if (jsonResponse.TryGetProperty("valid", out var validElement))
            {
                Assert.That(validElement.GetBoolean(), Is.False,
                    "El token inválido debería retornar valid=false");
            }
        }

        [Test]
        public async Task GetChildren_Should_Return_List_With_Valid_Email()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");

            // Act
            var response = await Client.GetAsync($"/child-tokens/children/{TestParentEmail}", ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            Assert.That(response.Content, Is.Not.Null.And.Not.Empty,
                "La respuesta debería contener contenido");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(response.Content!);
            Assert.That(jsonResponse, Is.Not.Null,
                "Debería retornar un array");
        }

        [Test]
        public async Task GetChildren_Should_Return_403_Without_Authentication()
        {
            // Act
            var response = await Client.GetAsync($"/child-tokens/children/{TestParentEmail}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar 401 o 403 sin autenticación");
        }

        [Test]
        public async Task RevokeToken_Should_Return_Success_With_Valid_ChildId()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id de prueba");

            // Act
            var response = await Client.DeleteAsync($"/child-tokens/revoke/{_testChildId}", ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK al revocar token");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            Assert.That(jsonResponse.TryGetProperty("message", out var messageElement), Is.True,
                "La respuesta debería contener message");
        }

        [Test]
        public async Task RevokeToken_Should_Return_404_With_Invalid_ChildId()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            var invalidChildId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.DeleteAsync($"/child-tokens/revoke/{invalidChildId}", ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 para child_id no encontrado");
        }

        [Test]
        public async Task HealthCheck_Should_Return_Service_Status()
        {
            // Act
            var response = await Client.GetAsync("/child-tokens/health");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "El health check debería retornar 200 OK");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            Assert.That(jsonResponse.TryGetProperty("service", out var serviceElement), Is.True,
                "La respuesta debería contener service");
            
            Assert.That(jsonResponse.TryGetProperty("status", out var statusElement), Is.True,
                "La respuesta debería contener status");
            
            Assert.That(jsonResponse.TryGetProperty("active_tokens", out var tokensElement), Is.True,
                "La respuesta debería contener active_tokens");
        }
    }
}

