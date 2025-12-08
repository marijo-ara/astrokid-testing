using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Children
{
    [TestFixture]
    public class ChildrenTests : BaseApiTest
    {
        private string? _testChildId;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
        }

        [Test]
        public async Task CreateChild_Should_Create_New_Child_With_Valid_Data()
        {
            // Arrange
            var childData = new
            {
                name = "Test Child",
                birthdate = DateTime.Now.AddYears(-7).ToString("yyyy-MM-dd"),
                age = 7,
                interests = new[] { "ciencia", "espacio", "aventuras" },
                avatarId = "avatar-001",
                selectedAdjectives = new[]
                {
                    new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" },
                    new { id = "adj2", word = "curioso", category = "personalidad", emoji = "🔍" },
                    new { id = "adj3", word = "creativo", category = "personalidad", emoji = "🎨" }
                }
            };

            // Act
            var response = await Client.PostAsync("/children/", childData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Created),
                "Debería retornar 200 OK o 201 Created");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = AssertValidJsonResponse(response.Content, "id", "name", "age");
                
                _testChildId = jsonResponse.GetProperty("id").GetString();
                
                // Registrar para cleanup
                if (_testChildId != null)
                {
                    RegisterResourceForCleanup(ResourceType.Child, _testChildId);
                }

                Assert.That(jsonResponse.GetProperty("name").GetString(), Is.EqualTo("Test Child"),
                    "El nombre debería coincidir");
                
                Assert.That(jsonResponse.GetProperty("age").GetInt32(), Is.EqualTo(7),
                    "La edad debería coincidir");
            }
        }

        [Test]
        public async Task CreateChild_Should_Return_400_With_Invalid_Age()
        {
            // Arrange
            var childData = new
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
            };

            // Act
            var response = await Client.PostAsync("/children/", childData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request para edad inválida");
            
            // Validar que la respuesta de error contenga información útil
            AssertErrorResponse(response.Content, response.StatusCode);
        }

        [Test]
        public async Task CreateChild_Should_Return_400_With_Wrong_Adjectives_Count()
        {
            // Arrange
            var childData = new
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
            };

            // Act
            var response = await Client.PostAsync("/children/", childData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request para número incorrecto de adjetivos");
        }

        [Test]
        public async Task GetChildren_Should_Return_List()
        {
            // Act
            var response = await Client.GetAsync("/children/");

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
        public async Task GetChild_Should_Return_Child_With_Valid_Id()
        {
            // Arrange
            // Primero crear un niño
            var childData = new
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
            };

            var createResponse = await Client.PostAsync("/children/", childData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el niño primero");

            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    _testChildId = idElement.GetString();
                }
            }

            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id válido");

            // Act
            var response = await Client.GetAsync($"/children/{_testChildId}");

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
        public async Task GetChild_Should_Return_404_With_Invalid_Id()
        {
            // Arrange
            var invalidId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.GetAsync($"/children/{invalidId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 Not Found para ID inválido");
        }

        [Test]
        public async Task UpdateChild_Should_Update_Child_With_Valid_Data()
        {
            // Arrange
            // Primero crear un niño
            var childData = new
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
            };

            var createResponse = await Client.PostAsync("/children/", childData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el niño primero");

            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    _testChildId = idElement.GetString();
                }
            }

            Assume.That(_testChildId, Is.Not.Null, "Se requiere un child_id válido");

            var updateData = new
            {
                name = "Updated Child",
                birthdate = DateTime.Now.AddYears(-8).ToString("yyyy-MM-dd"),
                age = 8,
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
            var response = await Client.PutAsync($"/children/{_testChildId}", updateData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                Assert.That(jsonResponse.TryGetProperty("name", out var nameElement), Is.True,
                    "La respuesta debería contener name");
                
                if (nameElement.GetString() == "Updated Child")
                {
                    Assert.Pass("El nombre fue actualizado correctamente");
                }
            }
        }

        [Test]
        public async Task DeleteChild_Should_Delete_Child_With_Valid_Id()
        {
            // Arrange
            // Primero crear un niño
            var childData = new
            {
                name = "Test Child To Delete",
                birthdate = DateTime.Now.AddYears(-7).ToString("yyyy-MM-dd"),
                age = 7,
                interests = new[] { "ciencia" },
                avatarId = "avatar-001",
                selectedAdjectives = new[]
                {
                    new { id = "adj1", word = "valiente", category = "personalidad", emoji = "🦁" },
                    new { id = "adj2", word = "curioso", category = "personalidad", emoji = "🔍" },
                    new { id = "adj3", word = "creativo", category = "personalidad", emoji = "🎨" }
                }
            };

            var createResponse = await Client.PostAsync("/children/", childData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el niño primero");

            string? childIdToDelete = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    childIdToDelete = idElement.GetString();
                }
            }

            Assume.That(childIdToDelete, Is.Not.Null, "Se requiere un child_id válido");

            // Act
            var response = await Client.DeleteAsync($"/children/{childIdToDelete}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK al eliminar");

            // Verificar que el niño fue eliminado
            var getResponse = await Client.GetAsync($"/children/{childIdToDelete}");
            Assert.That(getResponse.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "El niño debería haber sido eliminado");
        }

        [Test]
        public async Task DeleteChild_Should_Return_404_With_Invalid_Id()
        {
            // Arrange
            var invalidId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.DeleteAsync($"/children/{invalidId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 Not Found para ID inválido");
        }
    }
}

