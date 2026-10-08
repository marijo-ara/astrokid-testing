using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.FamilyProfiles
{
    [TestFixture]
    public class FamilyProfilesTests : BaseApiTest
    {
        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
        }

        /// <summary>
        /// Fresh parent per test: the backend adds children to an existing family by email,
        /// so reusing the shared parent hits the child limit on reruns.
        /// </summary>
        private async Task<(string Token, string FamilyId)> CreateOwnFamilyAsync(string label)
        {
            var email = QaEmail(label);
            var token = await LoginParentWithConsentAsync(email, TestParentName);
            var family = new
            {
                parent = new { parent_name = TestParentName, parent_email = email },
                child = new
                {
                    name = "Test Child",
                    birthdate = DateTime.Now.AddYears(-7).ToString("yyyy-MM-dd"),
                    age = 7,
                    interests = new[] { "ciencia", "espacio" },
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
            var response = await Client.PostAsync("/family-profiles/", family, token);
            AssumeBackendAvailable(response);
            AssertSuccessStatusCode(response, $"family-profiles: {response.StatusCode} {response.Content}");
            return (token, ReadString(response.Content, "id")!);
        }

        [Test]
        public async Task CreateFamilyProfile_Should_Create_New_Family_With_Valid_Data()
        {
            // Arrange
            var uniqueEmail = QaEmail("family");
            var token = await LoginParentWithConsentAsync(uniqueEmail, "Test Parent");
            var familyProfile = new
            {
                parent = new
                {
                    parent_name = "Test Parent",
                    parent_email = uniqueEmail
                },
                child = new
                {
                    name = "Test Child",
                    birthdate = DateTime.Now.AddYears(-7).ToString("yyyy-MM-dd"),
                    age = 7,
                    interests = new[] { "ciencia", "espacio" },
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

            // Act
            var response = await Client.PostAsync("/family-profiles/", familyProfile, token);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created).Or.EqualTo(HttpStatusCode.OK),
                $"Debería retornar 201 Created o 200 OK: {response.Content}");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("id", out _), Is.True,
                    "La respuesta debería contener id de familia");

                Assert.That(jsonResponse.TryGetProperty("parent", out var parentElement), Is.True,
                    "La respuesta debería contener parent");

                Assert.That(jsonResponse.TryGetProperty("children", out var childrenElement), Is.True,
                    "La respuesta debería contener children");
            }
        }

        [Test]
        public async Task CreateFamilyProfile_Should_Return_400_With_Invalid_Age()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            
            var familyProfile = new
            {
                parent = new
                {
                    parent_name = TestParentName,
                    parent_email = TestParentEmail
                },
                child = new
                {
                    name = "Test Child",
                    birthdate = DateTime.Now.AddYears(-14).ToString("yyyy-MM-dd"),
                    age = 14, // Edad fuera del rango permitido (6-12)
                    interests = new[] { "ciencia" },
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

            // Act
            var response = await Client.PostAsync("/family-profiles/", familyProfile, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request para edad inválida");
        }

        [Test]
        public async Task CreateFamilyProfile_Should_Return_400_With_Wrong_Adjectives_Count()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            
            var familyProfile = new
            {
                parent = new
                {
                    parent_name = TestParentName,
                    parent_email = TestParentEmail
                },
                child = new
                {
                    name = "Test Child",
                    birthdate = DateTime.Now.AddYears(-7).ToString("yyyy-MM-dd"),
                    age = 7,
                    interests = new[] { "ciencia" },
                    avatarId = "avatar-001",
                    parental_consent_acknowledged = true,
                    selectedAdjectives = new[]
                    {
                        new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" }
                        // Solo 1 adjetivo en lugar de 3
                    }
                }
            };

            // Act
            var response = await Client.PostAsync("/family-profiles/", familyProfile, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request para número incorrecto de adjetivos");
        }

        [Test]
        public async Task GetFamilyProfile_Should_Return_Family_With_Valid_Id()
        {
            // Arrange
            var (token, familyId) = await CreateOwnFamilyAsync("family-get");

            // Act
            var response = await Client.GetAsync($"/family-profiles/{familyId}", token);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                Assert.That(jsonResponse.TryGetProperty("id", out _), Is.True,
                    "La respuesta debería contener id");
            }
        }

        [Test]
        public async Task GetFamilyProfile_Should_Return_404_With_Invalid_Id()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            var invalidId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.GetAsync($"/family-profiles/{invalidId}", ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 Not Found para ID inválido");
        }

        [Test]
        public async Task GetFamilyProfileByEmail_Should_Return_Family()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");

            // Act
            var response = await Client.GetAsync($"/family-profiles/by-email/{TestParentEmail}", ParentToken);

            // Assert
            // Puede retornar 200 si existe, o 404 si no
            Assert.That(response.StatusCode, 
                Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 200 si existe o 404 si no");
        }

        [Test]
        public async Task GetAllFamilyProfiles_Should_Return_List()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");

            // Act
            var response = await Client.GetAsync("/family-profiles/", ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(response.Content);
                Assert.That(jsonResponse, Is.Not.Null,
                    "Debería retornar un array");
            }
        }

        [Test]
        public async Task AddChildToFamily_Should_Create_New_Child()
        {
            // Arrange
            var (token, familyId) = await CreateOwnFamilyAsync("family-add-child");

            var newChild = new
            {
                name = "Second Child",
                birthdate = DateTime.Now.AddYears(-6).ToString("yyyy-MM-dd"),
                age = 6,
                interests = new[] { "música", "arte" },
                avatarId = "avatar-002",
                parental_consent_acknowledged = true,
                selectedAdjectives = new[]
                {
                    new { id = "adj1", word = "artístico", category = "personalidad", emoji = "🎨" },
                    new { id = "adj2", word = "tranquilo", category = "personalidad", emoji = "😌" },
                    new { id = "adj3", word = "imaginativo", category = "personalidad", emoji = "✨" }
                }
            };

            // Each child needs its own email-plus consent (COPPA).
            var withoutConsent = await Client.PostAsync($"/family-profiles/{familyId}/children", newChild, token);
            Assert.That(withoutConsent.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden), withoutConsent.Content);
            Assert.That(withoutConsent.Content, Does.Contain("EMAIL_PLUS_REQUIRED"));

            var problem = await CompleteEmailPlusAsync(token);
            if (problem != null)
            {
                Assert.Inconclusive($"COPPA email-plus no completado: {problem}");
            }

            // Act
            var response = await Client.PostAsync($"/family-profiles/{familyId}/children", newChild, token);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Created),
                "Debería retornar 200 OK o 201 Created");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                Assert.That(jsonResponse.TryGetProperty("children", out var childrenElement), Is.True,
                    "La respuesta debería contener children");
            }
        }
    }
}

