using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Parents
{
    [TestFixture]
    public class ParentProfilesTests : BaseApiTest
    {
        private string? _testParentProfileId;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
        }

        [Test]
        public async Task CreateParentProfile_Should_Create_New_Profile_With_Valid_Data()
        {
            // Arrange
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new string[] { },
                preferences = new { notifications = true }
            };

            // Act
            var response = await Client.PostAsync("/parent-profiles/", profileData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Created).Or.EqualTo(HttpStatusCode.OK),
                "Debería retornar 201 Created o 200 OK");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("id", out var idElement), Is.True,
                    "La respuesta debería contener id");
                
                _testParentProfileId = idElement.GetString();

                Assert.That(jsonResponse.TryGetProperty("parent_name", out var nameElement), Is.True,
                    "La respuesta debería contener parent_name");
                
                Assert.That(jsonResponse.TryGetProperty("parent_email", out var emailElement), Is.True,
                    "La respuesta debería contener parent_email");
            }
        }

        [Test]
        public async Task GetParentProfile_Should_Return_Profile_With_Valid_Id()
        {
            // Arrange
            // Primero crear un perfil
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new string[] { }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    _testParentProfileId = idElement.GetString();
                }
            }

            Assume.That(_testParentProfileId, Is.Not.Null, "Se requiere un parent_id válido");

            // Act
            var response = await Client.GetAsync($"/parent-profiles/{_testParentProfileId}");

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
        public async Task GetParentProfile_Should_Return_404_With_Invalid_Id()
        {
            // Arrange
            var invalidId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.GetAsync($"/parent-profiles/{invalidId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 Not Found para ID inválido");
        }

        [Test]
        public async Task GetAllParentProfiles_Should_Return_List()
        {
            // Act
            var response = await Client.GetAsync("/parent-profiles/");

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
        public async Task UpdateParentProfile_Should_Update_Profile_With_Valid_Data()
        {
            // Arrange
            // Primero crear un perfil
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new string[] { }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            string? parentIdToUpdate = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    parentIdToUpdate = idElement.GetString();
                }
            }

            Assume.That(parentIdToUpdate, Is.Not.Null, "Se requiere un parent_id válido");

            var updateData = new
            {
                parent_name = "Updated Parent Name",
                preferences = new { notifications = false, theme = "dark" }
            };

            // Act
            var response = await Client.PutAsync($"/parent-profiles/{parentIdToUpdate}", updateData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                Assert.That(jsonResponse.TryGetProperty("parent_name", out var nameElement), Is.True,
                    "La respuesta debería contener parent_name");
            }
        }

        [Test]
        public async Task DeleteParentProfile_Should_Delete_Profile_With_Valid_Id()
        {
            // Arrange
            // Primero crear un perfil
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var profileData = new
            {
                parent_name = "Test Parent To Delete",
                parent_email = uniqueEmail,
                children_ids = new string[] { }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            string? parentIdToDelete = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    parentIdToDelete = idElement.GetString();
                }
            }

            Assume.That(parentIdToDelete, Is.Not.Null, "Se requiere un parent_id válido");

            // Act
            var response = await Client.DeleteAsync($"/parent-profiles/{parentIdToDelete}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent).Or.EqualTo(HttpStatusCode.OK),
                "Debería retornar 204 No Content o 200 OK");

            // Verificar que el perfil fue eliminado
            var getResponse = await Client.GetAsync($"/parent-profiles/{parentIdToDelete}");
            Assert.That(getResponse.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "El perfil debería haber sido eliminado");
        }

        [Test]
        public async Task GetParentChildren_Should_Return_Children_Ids()
        {
            // Arrange
            // Primero crear un perfil con hijos
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var childId1 = Guid.NewGuid().ToString();
            var childId2 = Guid.NewGuid().ToString();
            
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new[] { childId1, childId2 }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            string? parentId = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    parentId = idElement.GetString();
                }
            }

            Assume.That(parentId, Is.Not.Null, "Se requiere un parent_id válido");

            // Act
            var response = await Client.GetAsync($"/parent-profiles/{parentId}/children");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<string[]>(response.Content);
                Assert.That(jsonResponse, Is.Not.Null,
                    "Debería retornar un array de IDs");
            }
        }

        [Test]
        public async Task AddChildToParent_Should_Add_Child_To_Profile()
        {
            // Arrange
            // Primero crear un perfil
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new string[] { }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            string? parentId = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    parentId = idElement.GetString();
                }
            }

            Assume.That(parentId, Is.Not.Null, "Se requiere un parent_id válido");

            var childId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.PostAsync<object>($"/parent-profiles/{parentId}/children/{childId}", null);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Created),
                "Debería retornar 200 OK o 201 Created");

            // Verificar que el hijo fue agregado
            var getResponse = await Client.GetAsync($"/parent-profiles/{parentId}/children");
            if (getResponse.IsSuccessStatusCode && getResponse.Content != null)
            {
                var childrenIds = System.Text.Json.JsonSerializer.Deserialize<string[]>(getResponse.Content);
                Assert.That(childrenIds, Contains.Item(childId),
                    "El child_id debería estar en la lista de hijos");
            }
        }

        [Test]
        public async Task RemoveChildFromParent_Should_Remove_Child_From_Profile()
        {
            // Arrange
            // Primero crear un perfil con un hijo
            var uniqueEmail = $"test-parent-{Guid.NewGuid()}@example.com";
            var childId = Guid.NewGuid().ToString();
            
            var profileData = new
            {
                parent_name = "Test Parent",
                parent_email = uniqueEmail,
                children_ids = new[] { childId }
            };

            var createResponse = await Client.PostAsync("/parent-profiles/", profileData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear el perfil primero");

            string? parentId = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    parentId = idElement.GetString();
                }
            }

            Assume.That(parentId, Is.Not.Null, "Se requiere un parent_id válido");

            // Act
            var response = await Client.DeleteAsync($"/parent-profiles/{parentId}/children/{childId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            // Verificar que el hijo fue removido
            var getResponse = await Client.GetAsync($"/parent-profiles/{parentId}/children");
            if (getResponse.IsSuccessStatusCode && getResponse.Content != null)
            {
                var childrenIds = System.Text.Json.JsonSerializer.Deserialize<string[]>(getResponse.Content);
                Assert.That(childrenIds, Does.Not.Contain(childId),
                    "El child_id no debería estar en la lista de hijos");
            }
        }
    }
}

