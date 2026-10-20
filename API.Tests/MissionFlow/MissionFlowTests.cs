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
  [Category("API")]
  [Category("MissionFlow")]
  public class MissionFlowTests : BaseApiTest
  {
    [Test]
    [Category("Smoke")]
    public async Task Daily_Mission_API_Flow_Should_Work_For_Child()
    {
      var (token, familyJson) = await CreateFamilyAsync("mission-flow-smoke", "Smoke Child");
      var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;

      await RunDailyMissionFlowAsync(childId, token);
    }

    [Test]
    public async Task Full_Mobile_Login_Plus_Mission_Should_Work_When_Parent_Auth_Available()
    {
      var (token, familyJson) = await CreateFamilyAsync("mission-flow", "Mission Flow Child");
      var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;
      var childToken = familyJson.GetProperty("children")[0].GetProperty("token").GetString();

      var validateResponse = await Client.PostAsync(
        "/child-tokens/validate",
        new { child_id = childId, token = childToken }
      );
      AssertSuccessStatusCode(validateResponse);
      Assert.That(
        JsonSerializer.Deserialize<JsonElement>(validateResponse.Content!).GetProperty("valid").GetBoolean(),
        Is.True
      );

      await RunDailyMissionFlowAsync(childId, token);
    }

    private async Task<(string Token, JsonElement Family)> CreateFamilyAsync(string label, string childName)
    {
      var email = QaEmail(label);
      var token = await LoginParentWithConsentAsync(email, TestParentName);
      var familyResponse = await Client.PostAsync("/family-profiles/", FamilyProfile(email, childName), token);
      AssumeBackendAvailable(familyResponse);
      AssertSuccessStatusCode(familyResponse, $"family-profiles: {familyResponse.StatusCode} {familyResponse.Content}");
      return (token, JsonSerializer.Deserialize<JsonElement>(familyResponse.Content!));
    }

    private object FamilyProfile(string email, string childName) => new
    {
      parent = new
      {
        parent_name = TestParentName,
        parent_email = email,
      },
      child = new
      {
        name = childName,
        birthdate = DateTime.UtcNow.AddYears(-8).ToString("yyyy-MM-dd"),
        age = 8,
        interests = new[] { "space" },
        avatarId = "avatar-001",
        parental_consent_acknowledged = true,
        household_country = "CR",
        selectedAdjectives = new[]
        {
          new { id = "adj1", word = "curious", category = "personalidad", emoji = "🔍" },
          new { id = "adj2", word = "brave", category = "personalidad", emoji = "🦁" },
          new { id = "adj3", word = "kind", category = "personalidad", emoji = "💝" },
        },
      },
    };

    private static void AssertCompiledFourD(JsonElement mission)
    {
      var compiler = mission.GetProperty("compiler");
      Assert.That(compiler.GetProperty("pipeline").GetString(), Is.EqualTo("mission_compiler"));
      Assert.That(
        compiler.GetProperty("templateKind").GetString(),
        Is.EqualTo("daily").Or.EqualTo("free_arc")
      );
      var arch = mission.GetProperty("contract").GetProperty("pedagogicalArchitecture");
      Assert.That(arch.GetProperty("what").GetProperty("framework").GetString(), Is.EqualTo("casel"));
      Assert.That(arch.GetProperty("how").GetProperty("framework").GetString(), Is.EqualTo("growth_mindset"));
      Assert.That(arch.GetProperty("why").GetProperty("framework").GetString(), Is.EqualTo("sdt"));
      Assert.That(arch.GetProperty("think").GetProperty("framework").GetString(), Is.EqualTo("metacognition"));
      var arc = mission.GetProperty("experienceArc");
      Assert.That(arc.GetArrayLength(), Is.EqualTo(7));
      Assert.That(arc[0].GetString(), Is.EqualTo("situation"));
      Assert.That(arc[6].GetString(), Is.EqualTo("reflection"));
    }

    private async Task RunDailyMissionFlowAsync(string childId, string token)
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
      var dpeResponse = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", dpeBody, token);
      AssertSuccessStatusCode(dpeResponse);
      var mission = JsonSerializer.Deserialize<JsonElement>(dpeResponse.Content!);
      var missionId = mission.GetProperty("missionId").GetString();
      Assert.That(missionId, Is.Not.Null.And.Not.Empty);
      AssertCompiledFourD(mission);

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
      var postResponse = await Client.PostAsync($"/resilience-assessments/{childId}", assessmentBody, token);
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

      var stateResponse = await Client.GetAsync($"/resilience-assessments/{childId}/state", token);
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
