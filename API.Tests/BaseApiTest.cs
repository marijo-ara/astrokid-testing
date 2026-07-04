using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Core.Clients;
using Core.Config;
using Core.Helpers;
using NUnit.Framework;
using RestSharp;

namespace API.Tests
{
    /// <summary>
    /// Clase base para todos los tests de API.
    /// Proporciona configuración común y helpers para los tests.
    /// </summary>
    [TestFixture]
    public abstract class BaseApiTest
    {
        protected AstroKidClient Client { get; private set; } = null!;
        protected string? ParentToken { get; private set; }
        protected string? FirebaseToken { get; private set; }
        protected string TestParentEmail { get; } = "test-parent@example.com";
        protected string TestParentName { get; } = "Test Parent";

        // Lista de recursos creados durante los tests para cleanup
        private readonly List<TestResource> _createdResources = new List<TestResource>();

        [OneTimeSetUp]
        public virtual void OneTimeSetUp()
        {
            // Verificar que la URL base esté configurada
            var baseUrl = Environment.GetEnvironmentVariable("ASTROKID_BASE_URL");
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                Assert.Ignore("ASTROKID_BASE_URL no está configurada. Configura esta variable de entorno para ejecutar los tests.");
            }
        }

        [SetUp]
        public virtual async Task SetUp()
        {
            Client = new AstroKidClient();
            _createdResources.Clear();
            
            // Obtener token de autenticación para los tests que lo requieran
            try
            {
                ParentToken = await GetParentTokenAsync();
            }
            catch (Exception ex)
            {
                // Si no se puede obtener el token, algunos tests pueden fallar
                // pero no detenemos todos los tests
                Console.WriteLine($"Warning: No se pudo obtener token de autenticación: {ex.Message}");
            }

            // Generar token de Firebase de prueba para endpoints que lo requieran
            // Nota: Requiere que el backend tenga ALLOW_UNVERIFIED_FIREBASE=true
            FirebaseToken = FirebaseTokenHelper.GenerateTestFirebaseToken(
                userId: $"test-user-{Guid.NewGuid()}",
                email: TestParentEmail
            );
        }

        [TearDown]
        public virtual async Task TearDown()
        {
            // Cleanup de recursos creados durante los tests
            foreach (var resource in _createdResources)
            {
                try
                {
                    switch (resource.Type)
                    {
                        case ResourceType.Child:
                            await Client.DeleteAsync($"/children/{resource.Id}", ParentToken ?? "");
                            break;
                        case ResourceType.FamilyProfile:
                            await Client.DeleteAsync($"/family-profiles/{resource.Id}", ParentToken ?? "");
                            break;
                        case ResourceType.ParentProfile:
                            await Client.DeleteAsync($"/parent-profiles/{resource.Id}", ParentToken ?? "");
                            break;
                        case ResourceType.Wallet:
                            await Client.DeleteAsync($"/wallet/{resource.Id}", ParentToken ?? "");
                            break;
                    }
                }
                catch (Exception ex)
                {
                    // No fallar el test si el cleanup falla, solo loguear
                    Console.WriteLine($"Warning: No se pudo eliminar recurso {resource.Type}:{resource.Id} - {ex.Message}");
                }
            }
            _createdResources.Clear();
        }

        /// <summary>
        /// Obtiene un token de autenticación para el padre de prueba.
        /// </summary>
        protected async Task<string> GetParentTokenAsync()
        {
            var loginRequest = new
            {
                email = TestParentEmail,
                name = TestParentName
            };

            var response = await Client.PostAsync("/auth/dev-login", loginRequest);
            
            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                if (jsonResponse.TryGetProperty("access_token", out var tokenElement))
                {
                    return tokenElement.GetString() ?? throw new Exception("Token vacío en respuesta");
                }
            }

            throw new Exception($"No se pudo obtener token. Status: {response.StatusCode}, Content: {response.Content}");
        }

        /// <summary>
        /// Helper para crear un perfil de familia de prueba.
        /// </summary>
        protected object CreateTestFamilyProfile(string? childName = null, int? childAge = null)
        {
            return new
            {
                parent = new
                {
                    parent_name = TestParentName,
                    parent_email = TestParentEmail
                },
                child = new
                {
                    name = childName ?? "Test Child",
                    birthdate = DateTime.Now.AddYears(-(childAge ?? 7)).ToString("yyyy-MM-dd"),
                    age = childAge ?? 7,
                    interests = new[] { "ciencia", "espacio", "aventuras" },
                    avatarId = "avatar-001",
                    selectedAdjectives = new[]
                    {
                        new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" },
                        new { id = "adj2", word = "curioso", category = "personalidad", emoji = "🔍" },
                        new { id = "adj3", word = "creativo", category = "personalidad", emoji = "🎨" }
                    }
                }
            };
        }

        /// <summary>
        /// Helper para crear un request de token de niño.
        /// </summary>
        protected object CreateChildTokenRequest(string childId, string? parentEmail = null, string? childName = null, int? age = null)
        {
            return new
            {
                child_id = childId,
                parent_email = parentEmail ?? TestParentEmail,
                child_name = childName ?? "Test Child",
                age = age ?? 7
            };
        }

        /// <summary>
        /// Registra un recurso creado durante el test para cleanup automático.
        /// </summary>
        protected void RegisterResourceForCleanup(ResourceType type, string id)
        {
            _createdResources.Add(new TestResource { Type = type, Id = id });
        }

        /// <summary>
        /// Skip test when backend returns 503 (database not configured or cold start on Render).
        /// </summary>
        protected static void AssumeBackendAvailable(RestResponse response)
        {
            Assume.That(
                response.StatusCode,
                Is.Not.EqualTo(HttpStatusCode.ServiceUnavailable),
                "Backend returned 503. Verify DATABASE_URL and PostgreSQL on Render."
            );
        }

        /// <summary>
        /// Valida que una respuesta HTTP tenga el código de estado esperado.
        /// </summary>
        protected void AssertStatusCode(RestResponse response, HttpStatusCode expectedStatusCode, string? message = null)
        {
            Assert.That(response.StatusCode, Is.EqualTo(expectedStatusCode),
                message ?? $"Se esperaba {expectedStatusCode} pero se obtuvo {response.StatusCode}");
        }

        /// <summary>
        /// Valida que una respuesta HTTP sea exitosa (2xx).
        /// </summary>
        protected void AssertSuccessStatusCode(RestResponse response, string? message = null)
        {
            Assert.That(response.IsSuccessStatusCode, Is.True,
                message ?? $"Se esperaba un código 2xx pero se obtuvo {response.StatusCode}");
        }

        /// <summary>
        /// Valida que el contenido de la respuesta sea JSON válido y contenga las propiedades especificadas.
        /// </summary>
        protected JsonElement AssertValidJsonResponse(string? content, params string[] requiredProperties)
        {
            Assert.That(content, Is.Not.Null.And.Not.Empty,
                "La respuesta debería contener contenido JSON");

            JsonElement jsonResponse;
            try
            {
                jsonResponse = JsonSerializer.Deserialize<JsonElement>(content!);
            }
            catch (JsonException ex)
            {
                Assert.Fail($"La respuesta no es JSON válido: {ex.Message}. Contenido: {content}");
                throw; // Nunca se ejecutará, pero satisface al compilador
            }

            foreach (var property in requiredProperties)
            {
                Assert.That(jsonResponse.TryGetProperty(property, out _), Is.True,
                    $"La respuesta JSON debería contener la propiedad '{property}'");
            }

            return jsonResponse;
        }

        /// <summary>
        /// Valida que una respuesta de error contenga un mensaje de error.
        /// </summary>
        protected void AssertErrorResponse(string? content, HttpStatusCode statusCode)
        {
            Assert.That(content, Is.Not.Null.And.Not.Empty,
                $"La respuesta de error ({statusCode}) debería contener un mensaje");

            // Intentar parsear como JSON para verificar estructura
            try
            {
                var jsonResponse = JsonSerializer.Deserialize<JsonElement>(content!);
                // Verificar que tenga al menos una propiedad común en errores
                var hasErrorField = jsonResponse.TryGetProperty("error", out _) ||
                                   jsonResponse.TryGetProperty("message", out _) ||
                                   jsonResponse.TryGetProperty("detail", out _);
                
                if (!hasErrorField)
                {
                    Console.WriteLine($"Warning: La respuesta de error no contiene campos estándar de error. Contenido: {content}");
                }
            }
            catch (JsonException)
            {
                // Si no es JSON, está bien, puede ser texto plano
                Console.WriteLine($"La respuesta de error no es JSON, es texto plano: {content}");
            }
        }
    }

    /// <summary>
    /// Tipos de recursos que pueden ser creados durante los tests.
    /// </summary>
    public enum ResourceType
    {
        Child,
        FamilyProfile,
        ParentProfile,
        Wallet
    }

    /// <summary>
    /// Representa un recurso creado durante un test para cleanup.
    /// </summary>
    internal class TestResource
    {
        public ResourceType Type { get; set; }
        public string Id { get; set; } = string.Empty;
    }
}

