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
        // Resend test address: accepted and "delivered" without reaching a real inbox or bouncing.
        protected string TestParentEmail { get; } = "delivered+astrokid-qa-parent@resend.dev";
        protected string TestParentName { get; } = "Test Parent";

        /// <summary>
        /// Why the shared parent could not complete COPPA email-plus consent, or null when it did
        /// (or the backend predates the gate).
        /// </summary>
        protected string? ParentConsentProblem { get; private set; }

        protected const string EmailPlusPath = "/family-profiles/parental-consent/email-plus";

        // Lista de recursos creados durante los tests para cleanup
        private readonly List<TestResource> _createdResources = new List<TestResource>();

        [OneTimeSetUp]
        public virtual void OneTimeSetUp()
        {
            // Verificar que la URL base esté configurada
            var baseUrl = Environment.GetEnvironmentVariable("ASTROKID_BASE_URL");
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                baseUrl = "https://astro-kid-backend-1.onrender.com";
                Environment.SetEnvironmentVariable("ASTROKID_BASE_URL", baseUrl);
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
                ParentConsentProblem = await CompleteEmailPlusAsync(ParentToken);
                if (ParentConsentProblem != null)
                {
                    Console.WriteLine($"Warning: COPPA email-plus incompleto para el padre de prueba: {ParentConsentProblem}");
                }
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
        /// Unique Resend test address for a fresh parent.
        /// </summary>
        protected static string QaEmail(string label) => $"delivered+{label}-{Guid.NewGuid():N}@resend.dev";

        /// <summary>
        /// Dev-login for an arbitrary parent. Skips when the backend is unavailable.
        /// </summary>
        protected async Task<string> LoginParentAsync(string email, string name)
        {
            var login = await Client.PostAsync("/auth/dev-login", new { email, name });
            AssumeBackendAvailable(login);
            AssertSuccessStatusCode(login, $"dev-login falló: {login.StatusCode} {login.Content}");
            return JsonSerializer.Deserialize<JsonElement>(login.Content!)
                .GetProperty("access_token")
                .GetString()!;
        }

        /// <summary>
        /// Dev-login plus COPPA email-plus consent, so the parent may create child profiles.
        /// </summary>
        protected async Task<string> LoginParentWithConsentAsync(string email, string name)
        {
            var token = await LoginParentAsync(email, name);
            var problem = await CompleteEmailPlusAsync(token);
            if (problem != null)
            {
                Assert.Inconclusive($"COPPA email-plus no completado: {problem}");
            }
            return token;
        }

        protected void AssumeParentConsent()
        {
            Assume.That(ParentToken, Is.Not.Null, "Requires /auth/dev-login on the target backend");
            if (ParentConsentProblem != null)
            {
                Assert.Inconclusive($"COPPA email-plus no completado: {ParentConsentProblem}");
            }
        }

        /// <summary>
        /// Walks the email-plus flow (notice link, then confirmation link) through the API.
        /// Needs COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true and working Resend on the QA backend;
        /// that flag must never be set in production.
        /// Returns null when consent is in place or the backend has no gate.
        /// </summary>
        protected async Task<string?> CompleteEmailPlusAsync(string token)
        {
            var status = await Client.GetAsync(EmailPlusPath, token);
            if (status.StatusCode == HttpStatusCode.NotFound || status.StatusCode == HttpStatusCode.MethodNotAllowed)
            {
                return null;
            }
            if (!status.IsSuccessStatusCode)
            {
                return $"GET {EmailPlusPath} devolvió {(int)status.StatusCode}";
            }
            if (ReadString(status.Content, "status") == "confirmed")
            {
                return null;
            }

            var start = await Client.PostAsync($"{EmailPlusPath}/start", new { locale = "es" }, token);
            if (!start.IsSuccessStatusCode)
            {
                return $"start devolvió {(int)start.StatusCode} {start.Content}. Revisa RESEND_API_KEY en el backend QA.";
            }
            if (ReadString(start.Content, "status") == "confirmed")
            {
                return null;
            }

            var link = ReadString(start.Content, "token");
            for (var step = 0; step < 2; step++)
            {
                if (link == null)
                {
                    return "El backend no expone el token. Activa COPPA_EMAIL_PLUS_EXPOSE_TOKEN=true solo en QA.";
                }
                var consume = await Client.PostAsync($"{EmailPlusPath}/consume", new { token = link, locale = "es" });
                if (!consume.IsSuccessStatusCode)
                {
                    return $"consume devolvió {(int)consume.StatusCode} {consume.Content}";
                }
                if (ReadString(consume.Content, "status") == "confirmed")
                {
                    return null;
                }
                link = ReadString(consume.Content, "token");
            }
            return "El flujo email-plus no llegó a 'confirmed'.";
        }

        /// <summary>
        /// Parent with email-plus consent, one child and a child session, as the apps set it up.
        /// </summary>
        protected async Task<ConsentedFamily> CreateConsentedFamilyAsync(string label, int age = 8)
        {
            var email = QaEmail(label);
            var parentToken = await LoginParentWithConsentAsync(email, "QA Parent");

            var family = await Client.PostAsync("/family-profiles/", new
            {
                parent = new { parent_name = "QA Parent", parent_email = email },
                child = new
                {
                    name = "QA Child",
                    birthdate = DateTime.UtcNow.AddYears(-age).ToString("yyyy-MM-dd"),
                    age,
                    interests = new[] { "space" },
                    avatarId = "nova",
                    parental_consent_acknowledged = true,
                    selectedAdjectives = new[]
                    {
                        new { id = "1", word = "curious", category = "personality", emoji = "🤔" },
                        new { id = "2", word = "brave", category = "personality", emoji = "🦁" },
                        new { id = "3", word = "creative", category = "personality", emoji = "🎨" }
                    }
                }
            }, parentToken);
            AssumeBackendAvailable(family);
            AssertSuccessStatusCode(family, $"family-profiles: {family.StatusCode} {family.Content}");

            var familyJson = JsonSerializer.Deserialize<JsonElement>(family.Content!);
            var familyId = familyJson.GetProperty("id").GetString()!;
            var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;

            var session = await Client.PostAsync("/child-tokens/generate", new
            {
                child_id = childId,
                parent_email = email,
                child_name = "QA Child",
                age
            }, parentToken);
            AssertSuccessStatusCode(session, $"child-tokens/generate: {session.StatusCode} {session.Content}");
            var childToken = ReadString(session.Content, "token")!;

            return new ConsentedFamily(
                email,
                parentToken,
                familyId,
                childId,
                new Dictionary<string, string> { ["X-Child-Id"] = childId, ["X-Child-Token"] = childToken });
        }

        protected static string? ReadString(string? content, string property)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return null;
            }
            try
            {
                var json = JsonSerializer.Deserialize<JsonElement>(content);
                return json.ValueKind == JsonValueKind.Object
                    && json.TryGetProperty(property, out var value)
                    && value.ValueKind == JsonValueKind.String
                    ? value.GetString()
                    : null;
            }
            catch (JsonException)
            {
                return null;
            }
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
                    parental_consent_acknowledged = true,
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

    public sealed record ConsentedFamily(
        string ParentEmail,
        string ParentToken,
        string FamilyId,
        string ChildId,
        IDictionary<string, string> ChildHeaders);

    /// <summary>
    /// Representa un recurso creado durante un test para cleanup.
    /// </summary>
    internal class TestResource
    {
        public ResourceType Type { get; set; }
        public string Id { get; set; } = string.Empty;
    }
}

