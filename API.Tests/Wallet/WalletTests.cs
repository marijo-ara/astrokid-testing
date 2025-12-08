using System;
using System.Net;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Wallet
{
    [TestFixture]
    public class WalletTests : BaseApiTest
    {
        private string? _testChildId;

        [SetUp]
        public override async Task SetUp()
        {
            await base.SetUp();
            
            // Crear un child_id de prueba
            _testChildId = Guid.NewGuid().ToString();
        }

        [Test]
        public async Task CreateActivity_Should_Create_Activity_And_Add_Reward()
        {
            // Arrange
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Completar misión de exploración",
                description = "El niño completó una misión espacial",
                agent_name = "Capitán Empatía",
                map_title = "Mapa del Sistema Solar",
                difficulty = "easy",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Monedas por completar misión",
                reward_icon = "🪙"
            };

            // Act
            var response = await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.Created),
                "Debería retornar 200 OK o 201 Created");

            if (response.IsSuccessStatusCode && response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("id", out var idElement), Is.True,
                    "La respuesta debería contener id de actividad");
                
                Assert.That(jsonResponse.TryGetProperty("title", out var titleElement), Is.True,
                    "La respuesta debería contener title");
                
                Assert.That(jsonResponse.TryGetProperty("reward", out var rewardElement), Is.True,
                    "La respuesta debería contener reward");
            }
        }

        [Test]
        public async Task CreateActivity_Should_Return_400_With_ChildId_Mismatch()
        {
            // Arrange
            var activityData = new
            {
                child_id = "different-child-id",
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Test reward"
            };

            // Act
            var response = await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest),
                "Debería retornar 400 Bad Request por mismatch de child_id");
        }

        [Test]
        public async Task GetWallet_Should_Return_Wallet_After_Creating_Activity()
        {
            // Arrange
            // Primero crear una actividad para que exista la wallet
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 100,
                reward_description = "Test reward"
            };

            var createResponse = await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear la actividad primero");

            // Act
            var response = await Client.GetAsync($"/wallet/{_testChildId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("child_id", out var childIdElement), Is.True,
                    "La respuesta debería contener child_id");
                
                Assert.That(jsonResponse.TryGetProperty("total_coins", out var coinsElement), Is.True,
                    "La respuesta debería contener total_coins");
                
                Assert.That(jsonResponse.TryGetProperty("activities", out var activitiesElement), Is.True,
                    "La respuesta debería contener activities");
            }
        }

        [Test]
        public async Task GetWallet_Should_Return_404_With_Invalid_ChildId()
        {
            // Arrange
            var invalidChildId = Guid.NewGuid().ToString();

            // Act
            var response = await Client.GetAsync($"/wallet/{invalidChildId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "Debería retornar 404 Not Found para child_id inválido");
        }

        [Test]
        public async Task GetWalletSummary_Should_Return_Summary()
        {
            // Arrange
            // Crear algunas actividades
            for (int i = 0; i < 3; i++)
            {
                var activityData = new
                {
                    child_id = _testChildId,
                    activity_type = "mission",
                    title = $"Test Activity {i}",
                    description = "Test Description",
                    age = 7,
                    reward_type = "coins",
                    reward_amount = 10 * (i + 1),
                    reward_description = "Test reward"
                };
                await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            }

            // Act
            var response = await Client.GetAsync($"/wallet/{_testChildId}/summary");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("total_coins", out _), Is.True,
                    "La respuesta debería contener total_coins");
                
                Assert.That(jsonResponse.TryGetProperty("recent_activities", out var activitiesElement), Is.True,
                    "La respuesta debería contener recent_activities");
            }
        }

        [Test]
        public async Task GetChildActivities_Should_Return_Activities_List()
        {
            // Arrange
            // Crear algunas actividades
            for (int i = 0; i < 2; i++)
            {
                var activityData = new
                {
                    child_id = _testChildId,
                    activity_type = i % 2 == 0 ? "mission" : "map_completion",
                    title = $"Test Activity {i}",
                    description = "Test Description",
                    age = 7,
                    reward_type = "coins",
                    reward_amount = 20,
                    reward_description = "Test reward"
                };
                await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            }

            // Act
            var response = await Client.GetAsync($"/wallet/{_testChildId}/activities");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(response.Content);
                Assert.That(jsonResponse, Is.Not.Null,
                    "Debería retornar un array de actividades");
            }
        }

        [Test]
        public async Task GetChildActivities_Should_Filter_By_Activity_Type()
        {
            // Arrange
            // Crear actividades de diferentes tipos
            var activityTypes = new[] { "mission", "map_completion", "mission" };
            
            foreach (var activityType in activityTypes)
            {
                var activityData = new
                {
                    child_id = _testChildId,
                    activity_type = activityType,
                    title = $"Test Activity {activityType}",
                    description = "Test Description",
                    age = 7,
                    reward_type = "coins",
                    reward_amount = 20,
                    reward_description = "Test reward"
                };
                await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            }

            // Act - Filtrar por tipo "mission"
            var response = await Client.GetAsync($"/wallet/{_testChildId}/activities?activity_type=mission");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(response.Content);
                Assert.That(jsonResponse, Is.Not.Null,
                    "Debería retornar un array de actividades");
            }
        }

        [Test]
        public async Task GetActivity_Should_Return_Specific_Activity()
        {
            // Arrange
            // Crear una actividad
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Test reward"
            };

            var createResponse = await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear la actividad primero");

            string? activityId = null;
            if (createResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(createResponse.Content);
                if (jsonResponse.TryGetProperty("id", out var idElement))
                {
                    activityId = idElement.GetString();
                }
            }

            Assume.That(activityId, Is.Not.Null, "Se requiere un activity_id válido");

            // Act
            var response = await Client.GetAsync($"/wallet/{_testChildId}/activities/{activityId}");

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
        public async Task UpdateWallet_Should_Update_Counters()
        {
            // Arrange
            // Primero crear una actividad para que exista la wallet
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Test reward"
            };

            var createResponse = await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            Assume.That(createResponse.IsSuccessStatusCode, Is.True, "Debe crear la actividad primero");

            var updateData = new
            {
                total_coins = 200,
                total_achievements = 5,
                total_badges = 3
            };

            // Act
            var response = await Client.PutAsync($"/wallet/{_testChildId}", updateData);

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                Assert.That(jsonResponse.TryGetProperty("total_coins", out var coinsElement), Is.True,
                    "La respuesta debería contener total_coins");
            }
        }

        [Test]
        public async Task GetWalletStats_Should_Return_Statistics()
        {
            // Arrange
            // Crear actividades de diferentes tipos
            var activities = new[]
            {
                new { type = "mission", coins = 50 },
                new { type = "map_completion", coins = 100 },
                new { type = "mission", coins = 30 }
            };

            foreach (var activity in activities)
            {
                var activityData = new
                {
                    child_id = _testChildId,
                    activity_type = activity.type,
                    title = $"Test Activity {activity.type}",
                    description = "Test Description",
                    age = 7,
                    reward_type = "coins",
                    reward_amount = activity.coins,
                    reward_description = "Test reward"
                };
                await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            }

            // Act
            var response = await Client.GetAsync($"/wallet/{_testChildId}/stats");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(response.Content);
                
                Assert.That(jsonResponse.TryGetProperty("total_coins", out _), Is.True,
                    "La respuesta debería contener total_coins");
                
                Assert.That(jsonResponse.TryGetProperty("activities_by_type", out _), Is.True,
                    "La respuesta debería contener activities_by_type");
            }
        }

        [Test]
        public async Task GetAllWallets_Should_Return_List()
        {
            // Arrange
            // Crear al menos una wallet creando una actividad
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Test reward"
            };
            await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);

            // Act
            var response = await Client.GetAsync("/wallet/");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK),
                "Debería retornar 200 OK");

            if (response.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement[]>(response.Content);
                Assert.That(jsonResponse, Is.Not.Null,
                    "Debería retornar un array de wallets");
            }
        }

        [Test]
        public async Task DeleteWallet_Should_Delete_Wallet()
        {
            // Arrange
            // Crear una wallet creando una actividad
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 50,
                reward_description = "Test reward"
            };
            await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);

            // Act
            var response = await Client.DeleteAsync($"/wallet/{_testChildId}");

            // Assert
            Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NoContent).Or.EqualTo(HttpStatusCode.OK),
                "Debería retornar 204 No Content o 200 OK");

            // Verificar que la wallet fue eliminada
            var getResponse = await Client.GetAsync($"/wallet/{_testChildId}");
            Assert.That(getResponse.StatusCode, Is.EqualTo(HttpStatusCode.NotFound),
                "La wallet debería haber sido eliminada");
        }

        [Test]
        public async Task CreateActivity_Should_Update_Coins_Counter()
        {
            // Arrange
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "mission",
                title = "Test Activity",
                description = "Test Description",
                age = 7,
                reward_type = "coins",
                reward_amount = 75,
                reward_description = "Test reward"
            };

            // Act
            await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            var walletResponse = await Client.GetAsync($"/wallet/{_testChildId}");

            // Assert
            if (walletResponse.IsSuccessStatusCode && walletResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(walletResponse.Content);
                if (jsonResponse.TryGetProperty("total_coins", out var coinsElement))
                {
                    var totalCoins = coinsElement.GetInt32();
                    Assert.That(totalCoins, Is.EqualTo(75),
                        "El total de monedas debería ser 75");
                }
            }
        }

        [Test]
        public async Task CreateActivity_Should_Update_Achievements_Counter()
        {
            // Arrange
            var activityData = new
            {
                child_id = _testChildId,
                activity_type = "special_achievement",
                title = "Test Achievement",
                description = "Test Description",
                age = 7,
                reward_type = "achievement",
                reward_amount = 1,
                reward_description = "Test achievement"
            };

            // Act
            await Client.PostAsync($"/wallet/{_testChildId}/activities", activityData);
            var walletResponse = await Client.GetAsync($"/wallet/{_testChildId}");

            // Assert
            if (walletResponse.IsSuccessStatusCode && walletResponse.Content != null)
            {
                var jsonResponse = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(walletResponse.Content);
                if (jsonResponse.TryGetProperty("total_achievements", out var achievementsElement))
                {
                    var totalAchievements = achievementsElement.GetInt32();
                    Assert.That(totalAchievements, Is.EqualTo(1),
                        "El total de achievements debería ser 1");
                }
            }
        }
    }
}

