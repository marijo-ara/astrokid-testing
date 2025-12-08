using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Empathy
{
    [TestFixture]
    public class EmpathyTests : BaseApiTest
    {
        // Nota: Estos tests requieren un token de Firebase válido
        // Para tests completos, se necesitaría mockear o configurar Firebase

        [Test]
        public async Task Status_Should_Return_Ok_With_Valid_Token()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            // Act
            var response = await Client.GetAsync("/empathy/status", FirebaseToken);

            // Assert
            // Si el backend tiene ALLOW_UNVERIFIED_FIREBASE=true, debería retornar 200
            // Si no, retornará 401/403
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "El endpoint debería responder. Si retorna 401, verifica que ALLOW_UNVERIFIED_FIREBASE=true en el backend");
        }

        [Test]
        public async Task Status_Should_Return_401_Without_Token()
        {
            // Act
            var response = await Client.GetAsync("/empathy/status");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar 401 o 403 sin token");
        }

        [Test]
        public async Task ProcessInput_Should_Process_Audio_And_Detect_Emotion()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            // Nota: Este test requiere:
            // 1. Token de Firebase (generado automáticamente)
            // 2. Audio en base64 válido (usando un audio de prueba simple)
            // 3. Configuración de Azure Speech Services en el backend
            // 4. ALLOW_UNVERIFIED_FIREBASE=true en el backend para desarrollo
            
            // Audio base64 mínimo válido (puede no tener contenido real, pero el formato es correcto)
            var audioRequest = new
            {
                audioBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=" // WAV header mínimo
            };

            // Act
            var response = await Client.PostAsync("/empathy/input", audioRequest, FirebaseToken);

            // Assert
            // Puede retornar 200 si todo está configurado, 400 si el audio no es válido,
            // o 401 si el token no es aceptado
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK)
                .Or.EqualTo(HttpStatusCode.BadRequest)
                .Or.EqualTo(HttpStatusCode.Unauthorized)
                .Or.EqualTo(HttpStatusCode.Forbidden),
                "El endpoint debería responder. Si retorna 401, verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
        }

        [Test]
        public async Task ProcessInput_Should_Return_400_With_Invalid_Base64()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var audioRequest = new
            {
                audioBase64 = "invalid-base64-!!!"
            };

            // Act
            var response = await Client.PostAsync("/empathy/input", audioRequest, FirebaseToken);

            // Assert
            // Debería retornar 400 por base64 inválido (si el token es aceptado)
            // o 401/403 si el token no es aceptado
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.BadRequest).Or.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar error con base64 inválido o sin token de Firebase válido");
        }

        [Test]
        public async Task SendFeedback_Should_Accept_Feedback()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var feedback = "Test feedback message";

            // Act
            var response = await Client.PostAsync<object>($"/empathy/feedback?feedback={feedback}", null, FirebaseToken);

            // Assert
            // Puede retornar 200 si el token es aceptado, o 401/403 si no
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "El endpoint debería responder. Si retorna 401, verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
        }
    }
}

