using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.FamilyProfiles
{
    [TestFixture]
    public class FamilyProfilesTests : BaseApiTest
    {
        private string? _testFamilyId;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
        }

        [Test]
        public async Task CreateFamilyProfile_Should_Create_New_Family_With_Valid_Data()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            
            var uniqueEmail = $"test-{Guid.NewGuid()}@example.com";
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
                    selectedAdjectives = new[]
                    {
                        new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" },
                        new { id = "adj2", word = "curioso", category = "personalidad", emoji = "🔍" },
                        new { id = "adj3", word = "creativo", category = "personalidad", emoji = "🎨" }
                    }
                }
            };

            // Act
            var response = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created).Or.EqualTo(HttpStatusCode.OK),
                "Debería retornar 201 Created o 200 OK");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("id", out var idElement), Is.True,
                    "La respuesta debería contener id de familia");
                
                _testFamilyId = idElement.GetString();

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
                    birthdate = DateTime.Now.AddYears(-12).ToString("yyyy-MM-dd"),
                    age = 12, // Edad fuera del rango permitido (5-9)
                    interests = new[] { "ciencia" },
                    avatarId = "avatar-001",
                    selectedAdjectives = new[]
                    {
                        new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" },
                        new { id = "adj2", word = "curioso", category = "personalidad", emoji = "🔍" },
                        new { id = "adj3", word = "creativo", category = "personalidad", emoji = "🎨" }
                    }
                }
            };

            // Act
            var response = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);

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
                    selectedAdjectives = new[]
                    {
                        new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" }
                        // Solo 1 adjetivo en lugar de 3
                    }
                }
            };

            // Act
            var response = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request para número incorrecto de adjetivos");
        }

        [Test]
        public async Task GetFamilyProfile_Should_Return_Family_With_Valid_Id()
        {
            // Arrange
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            
            // Primero crear una familia
            var familyProfile = CreateTestFamilyProfile();
            var createResponse = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);
            
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear la familia primero");
            
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    _testFamilyId = idElement.GetString();
                }
            }

            Assume.That(_testFamilyId, Is.Not.Null, "Se requiere un family_id válido");

            // Act
            var response = await Client.GetAsync($"/family-profiles/{_testFamilyId}", ParentToken);

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
            var response = await Client.GetAsync("/family-profiles", ParentToken);

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
            Assume.That(ParentToken, Is.Not.Null, "Se requiere token de autenticación");
            
            // Primero crear una familia
            var familyProfile = CreateTestFamilyProfile();
            var createResponse = await Client.PostAsync("/family-profiles", familyProfile, ParentToken);
            
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear la familia primero");
            
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    _testFamilyId = idElement.GetString();
                }
            }

            Assume.That(_testFamilyId, Is.Not.Null, "Se requiere un family_id válido");

            var newChild = new
            {
                name = "Second Child",
                birthdate = DateTime.Now.AddYears(-6).ToString("yyyy-MM-dd"),
                age = 6,
                interests = new[] { "música", "arte" },
                avatarId = "avatar-002",
                selectedAdjectives = new[]
                {
                    new { id = "adj1", word = "artístico", category = "personalidad", emoji = "🎨" },
                    new { id = "adj2", word = "tranquilo", category = "personalidad", emoji = "😌" },
                    new { id = "adj3", word = "imaginativo", category = "personalidad", emoji = "✨" }
                }
            };

            // Act
            var response = await Client.PostAsync($"/family-profiles/{_testFamilyId}/children", newChild, ParentToken);

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

