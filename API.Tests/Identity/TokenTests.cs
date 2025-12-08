using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Identity
{
    [TestFixture]
    public class TokenTests : BaseApiTest
    {
        [Test]
        public async Task GetToken_Should_Return_Token_With_Valid_Credentials()
        {
            // Arrange
            var body = new
            {
                email = TestParentEmail,
                password = "Password123!"
            };

            // Act
            var response = await Client.PostAsync("/auth/token", body);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK con credenciales válidas");
            
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
        }

        [Test]
        public async Task GetToken_Should_Return_401_With_Invalid_Credentials()
        {
            // Arrange
            var body = new
            {
                email = TestParentEmail,
                password = "WrongPassword123!"
            };

            // Act
            var response = await Client.PostAsync("/auth/token", body);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized),
                "Debería retornar 401 Unauthorized con credenciales inválidas");
        }

        [Test]
        public async Task GetToken_Should_Return_400_With_Invalid_Email()
        {
            // Arrange
            var body = new
            {
                email = "invalid-email-format",
                password = "Password123!"
            };

            // Act
            var response = await Client.PostAsync("/auth/token", body);

            // Assert
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.BadRequest).Or.EqualTo(HttpStatusCode.UnprocessableEntity),
                "Debería retornar 400 o 422 para email inválido");
        }

        [Test]
        public async Task GetToken_Should_Return_400_With_Missing_Fields()
        {
            // Arrange - Missing password
            var body = new
            {
                email = TestParentEmail
            };

            // Act
            var response = await Client.PostAsync("/auth/token", body);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request cuando faltan campos requeridos");
        }
    }
}
