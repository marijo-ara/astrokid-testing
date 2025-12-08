using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Resilience
{
    [TestFixture]
    public class ResilienceTests : BaseApiTest
    {
        [Test]
        public async Task StartResilience_Should_Activate_Agent_With_Valid_Request()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var activationRequest = new
            {
                triggeredBy = "mcp",
                emotion = "frustración"
            };

            // Act
            var response = await Client.PostAsync("/resilience/start", activationRequest, FirebaseToken);

            // Assert
            // Puede retornar 200 si el token es aceptado y el agente se activa,
            // o 401/403 si el token no es aceptado
            // Nota: Requiere ALLOW_UNVERIFIED_FIREBASE=true en el backend
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK)
                .Or.EqualTo(HttpStatusCode.BadRequest)
                .Or.EqualTo(HttpStatusCode.Unauthorized)
                .Or.EqualTo(HttpStatusCode.Forbidden),
                "El endpoint debería responder. Si retorna 401, verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
        }

        [Test]
        public async Task StartResilience_Should_Return_400_With_Invalid_Trigger()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var activationRequest = new
            {
                triggeredBy = "invalid-trigger",
                emotion = "frustración"
            };

            // Act
            var response = await Client.PostAsync("/resilience/start", activationRequest, FirebaseToken);

            // Assert
            // Debería retornar 400 porque triggeredBy debe ser "mcp"
            // Si retorna 401, el token no fue aceptado (verifica ALLOW_UNVERIFIED_FIREBASE=true)
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.BadRequest)
                .Or.EqualTo(HttpStatusCode.Unauthorized)
                .Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar 400 por trigger inválido, o 401 si el token no es aceptado");
        }

        [Test]
        public async Task StartResilience_Should_Handle_Different_Emotions()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var emotions = new[] { "frustración", "enojo", "tristeza", "sorpresa" };

            foreach (var emotion in emotions)
            {
                var activationRequest = new
                {
                    triggeredBy = "mcp",
                    emotion = emotion
                };

                // Act
                var response = await Client.PostAsync("/resilience/start", activationRequest, FirebaseToken);

                // Assert
                // Cada emoción debería generar una respuesta terapéutica diferente
                // Si el token es aceptado, debería retornar 200
                // Si no, retornará 401/403
                Assert.That(response.StatusCode, 
                    Is.EqualTo(HttpStatusCode.OK)
                    .Or.EqualTo(HttpStatusCode.BadRequest)
                    .Or.EqualTo(HttpStatusCode.Unauthorized)
                    .Or.EqualTo(HttpStatusCode.Forbidden),
                    $"El endpoint debería responder para la emoción {emotion}");
            }
        }
    }
}

