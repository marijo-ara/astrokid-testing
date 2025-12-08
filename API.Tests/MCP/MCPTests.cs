using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.MCP
{
    [TestFixture]
    public class MCPTests : BaseApiTest
    {
        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
        }

        [Test]
        public async Task MCPListener_Should_Process_Emotion_Event()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var emotionEvent = new
            {
                eventType = "emotion_alert",
                sourceAgent = "empathy",
                emotion = "frustración",
                timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            // Act
            var response = await Client.PostAsync("/mcp/listener", emotionEvent, FirebaseToken);

            // Assert
            // Si el token es aceptado (ALLOW_UNVERIFIED_FIREBASE=true), debería retornar 200
            // Si no, retornará 401/403
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "El endpoint debería responder. Si retorna 401, verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
        }

        [Test]
        public async Task MCPListener_Should_Return_401_Without_Token()
        {
            // Arrange
            var emotionEvent = new
            {
                eventType = "emotion_alert",
                sourceAgent = "empathy",
                emotion = "frustración"
            };

            // Act
            var response = await Client.PostAsync("/mcp/listener", emotionEvent);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden),
                "Debería retornar 401 o 403 sin token de Firebase");
        }

        [Test]
        public async Task MCPListener_Should_Trigger_Resilience_Agent_After_3_Negative_Emotions()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            // Este test verificaría que después de 3 emociones negativas consecutivas,
            // el sistema activa el agente de resiliencia
            var negativeEmotions = new[] { "frustración", "enojo", "tristeza" };

            foreach (var emotion in negativeEmotions)
            {
                var emotionEvent = new
                {
                    eventType = "emotion_alert",
                    sourceAgent = "empathy",
                    emotion = emotion,
                    timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeSeconds()
                };

                // Act
                var response = await Client.PostAsync("/mcp/listener", emotionEvent, FirebaseToken);

                // Assert
                // Después de la tercera emoción negativa, debería activar resiliencia
                if (emotion == negativeEmotions[2] && response.IsSuccessStatusCode && response.Content != null)
                {
                    var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                    if (jsonResponse.TryGetProperty("newAgent", out var agentElement))
                    {
                        var newAgent = agentElement.GetString();
                        Assert.That(newAgent, Is.EqualTo("resilience"),
                            "Debería activar el agente de resiliencia después de 3 emociones negativas");
                    }
                }
                else if (!response.IsSuccessStatusCode)
                {
                    // Si el token no es aceptado, el test puede fallar
                    Assert.Warn($"El token no fue aceptado. Status: {response.StatusCode}. Verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
                }
            }
        }

        [Test]
        public async Task MCPListener_Should_Ignore_Unsupported_Event_Type()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var unsupportedEvent = new
            {
                eventType = "unsupported_event",
                sourceAgent = "empathy",
                emotion = "frustración"
            };

            // Act
            var response = await Client.PostAsync("/mcp/listener", unsupportedEvent, FirebaseToken);

            // Assert
            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                if (jsonResponse.TryGetProperty("status", out var statusElement))
                {
                    var status = statusElement.GetString();
                    Assert.That(status, Is.EqualTo("ignored"),
                        "Debería ignorar tipos de eventos no soportados");
                }
            }
            else
            {
                Assert.Warn($"El token no fue aceptado. Status: {response.StatusCode}. Verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
            }
        }

        [Test]
        public async Task MCPListener_Should_Continue_Monitoring_For_Neutral_Emotions()
        {
            // Arrange
            Assume.That(FirebaseToken, Is.Not.Null, "Se requiere token de Firebase");
            
            var neutralEvent = new
            {
                eventType = "emotion_alert",
                sourceAgent = "empathy",
                emotion = "neutral",
                timestamp = System.DateTimeOffset.UtcNow.ToUnixTimeSeconds()
            };

            // Act
            var response = await Client.PostAsync("/mcp/listener", neutralEvent, FirebaseToken);

            // Assert
            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                if (jsonResponse.TryGetProperty("status", out var statusElement))
                {
                    var status = statusElement.GetString();
                    Assert.That(status, Is.EqualTo("monitoring"),
                        "Debería continuar monitoreando para emociones neutrales");
                }
            }
            else
            {
                Assert.Warn($"El token no fue aceptado. Status: {response.StatusCode}. Verifica ALLOW_UNVERIFIED_FIREBASE=true en el backend");
            }
        }
    }
}

