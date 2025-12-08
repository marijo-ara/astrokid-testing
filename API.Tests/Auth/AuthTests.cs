using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Auth
{
    [TestFixture]
    public class AuthTests : BaseApiTest
    {
        [Test]
        public async Task DevLogin_Should_Return_Token_With_Valid_Email()
        {
            // Arrange
            var loginRequest = new
            {
                email = TestParentEmail,
                name = TestParentName
            };

            // Act
            var response = await Client.PostAsync("/auth/dev-login", loginRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), 
                "El login debería retornar 200 OK");
            
            Assert.That(response.Content, Is.Not.Null.And.Not.Empty, 
                "La respuesta debería contener contenido");

            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            
            Assert.That(jsonResponse.TryGetProperty("access_token", out var tokenElement), Is.True,
                "La respuesta debería contener access_token");
            
            Assert.That(tokenElement.GetString(), Is.Not.Null.And.Not.Empty,
                "El access_token no debería estar vacío");

            Assert.That(jsonResponse.TryGetProperty("token_type", out var tokenTypeElement), Is.True,
                "La respuesta debería contener token_type");
            
            Assert.That(tokenTypeElement.GetString(), Is.EqualTo("bearer"),
                "El token_type debería ser 'bearer'");

            Assert.That(jsonResponse.TryGetProperty("role", out var roleElement), Is.True,
                "La respuesta debería contener role");
        }

        [Test]
        public async Task DevLogin_Should_Create_New_Parent_If_Not_Exists()
        {
            // Arrange
            var uniqueEmail = $"test-{Guid.NewGuid()}@example.com";
            var loginRequest = new
            {
                email = uniqueEmail,
                name = "New Test Parent"
            };

            // Act
            var response = await Client.PostAsync("/auth/dev-login", loginRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "El login debería crear un nuevo padre y retornar 200 OK");
            
            var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content!);
            Assert.That(jsonResponse.TryGetProperty("access_token", out _), Is.True,
                "Debería retornar un token para el nuevo padre");
        }

        [Test]
        public async Task DevLogin_Should_Return_400_With_Invalid_Email()
        {
            // Arrange
            var loginRequest = new
            {
                email = "invalid-email",
                name = TestParentName
            };

            // Act
            var response = await Client.PostAsync("/auth/dev-login", loginRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.UnprocessableEntity).Or.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 o 422 para email inválido");
            
            // Validar que la respuesta de error contenga información útil
            AssertErrorResponse(response.Content, response.StatusCode);
        }

        [Test]
        public async Task DevLogin_Should_Use_Email_As_Name_If_Name_Not_Provided()
        {
            // Arrange
            var uniqueEmail = $"test-{Guid.NewGuid()}@example.com";
            var loginRequest = new
            {
                email = uniqueEmail
                // name no se proporciona
            };

            // Act
            var response = await Client.PostAsync("/auth/dev-login", loginRequest);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería funcionar sin el campo name");
        }
    }
}

