using System;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.MissionFlow
{
  /// <summary>
  /// API flow mirroring the mobile daily mission after login:
  /// DPE mission → complete → MCP evaluate → parent-visible state.
  /// Child token / QR login is covered in ChildTokensTests.
  /// </summary>
  [TestFixture]
  public class MissionFlowTests : BaseApiTest
  {
    private static string NewChildId() => $"mission-flow-{Guid.NewGuid():N}";

    [Test]
    public async Task Daily_Mission_API_Flow_Should_Work_For_Child()
    {
      await RunDailyMissionFlowAsync(NewChildId());
    }

    [Test]
    public async Task Full_Mobile_Login_Plus_Mission_Should_Work_When_Parent_Auth_Available()
    {
      Assume.That(ParentToken, Is.Not.Null, "Requires /auth/dev-login on the target backend");

      var uniqueEmail = $"mission-flow-{Guid.NewGuid():N}@example.com";
      var familyProfile = new
      {
        parent = new
        {
          parent_name = TestParentName,
          parent_email = uniqueEmail,
        },
        child = new
        {
          name = "Mission Flow Child",
          birthdate = DateTime.UtcNow.AddYears(-8).ToString("yyyy-MM-dd"),
          age = 8,
          interests = new[] { "space" },
          avatarId = "avatar-001",
          selectedAdjectives = new[]
          {
            new { id = "adj1", word = "curious", category = "personalidad", emoji = "🔍" },
            new { id = "adj2", word = "brave", category = "personalidad", emoji = "🦁" },
            new { id = "adj3", word = "kind", category = "personalidad", emoji = "💝" },
          },
        },
      };

      var familyResponse = await Client.PostAsync("/family-profiles", familyProfile, ParentToken!);
      Assume.That(
        familyResponse.IsSuccessStatusCode,
        Is.True,
        $"Family profile requires DB-backed parent auth. Status: {familyResponse.StatusCode}, body: {familyResponse.Content}"
      );

      var familyJson = JsonSerializer.Deserialize<JsonElement>(familyResponse.Content!);
      var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;
      var childToken = familyJson.GetProperty("children")[0].GetProperty("token").GetString();
      RegisterResourceForCleanup(ResourceType.FamilyProfile, familyJson.GetProperty("id").GetString()!);

      var validateResponse = await Client.PostAsync(
        "/child-tokens/validate",
        new { child_id = childId, token = childToken }
      );
      AssertSuccessStatusCode(validateResponse);
      Assert.That(
        JsonSerializer.Deserialize<JsonElement>(validateResponse.Content!).GetProperty("valid").GetBoolean(),
        Is.True
      );

      await RunDailyMissionFlowAsync(childId);
    }

    private async Task RunDailyMissionFlowAsync(string childId)
    {
      var dpeBody = new
      {
        locale = "es",
        profile = new
        {
          name = "Mission Flow Child",
          age = 8,
          interests = new[] { "space" },
          adjectives = new[] { "curious" },
        },
        focusCompetency = "selfManagement",
        recommendedDpeTheme = "emotional_regulation",
      };
      var dpeResponse = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", dpeBody);
      AssertSuccessStatusCode(dpeResponse);
      var mission = JsonSerializer.Deserialize<JsonElement>(dpeResponse.Content!);
      var missionId = mission.GetProperty("missionId").GetString();
      Assert.That(missionId, Is.Not.Null.And.Not.Empty);

      var assessmentBody = new
      {
        date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
        child_id = childId,
        resilience_score = 78,
        emotions = new[] { "frustrated", "calm" },
        reflection_answers = new[] { "breathe", "mistakes" },
        parent_recommendation = mission.GetProperty("parentActivity").GetString(),
        completed_at = DateTime.UtcNow.ToString("o"),
        duration_ms = 150_000,
        attempt_number = 1,
        mission_id = missionId,
        mission_title = mission.GetProperty("title").GetString(),
        theme = mission.GetProperty("theme").GetString(),
        agent = mission.GetProperty("agent").GetString(),
        reward_coins = mission.GetProperty("rewardPlan").GetProperty("coins").GetInt32(),
      };
      var postResponse = await Client.PostAsync($"/resilience-assessments/{childId}", assessmentBody);
      AssertSuccessStatusCode(postResponse);

      var mcpBody = new
      {
        child_id = childId,
        emotions = new[] { "frustrated", "calm" },
        reflection_answers = new[] { "breathe", "mistakes" },
        resilience_score = 78,
        duration_ms = 150_000,
      };
      var mcpResponse = await Client.PostAsync("/mcp/evaluate", mcpBody);
      AssertSuccessStatusCode(mcpResponse);

      var stateResponse = await Client.GetAsync($"/resilience-assessments/{childId}/state");
      AssertSuccessStatusCode(stateResponse);
      var state = JsonSerializer.Deserialize<JsonElement>(stateResponse.Content!);
      Assert.That(JsonTestHelpers.GetProperty(state, "dailyLocked").GetBoolean(), Is.True);
      Assert.That(
        JsonTestHelpers.GetProperty(JsonTestHelpers.GetProperty(state, "latest"), "missionId").GetString(),
        Is.EqualTo(missionId)
      );
    }
  }
}
