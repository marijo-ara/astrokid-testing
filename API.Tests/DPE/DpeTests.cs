using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.DPE
{
  /// <summary>
  /// Tests for Development Personalization Engine — daily mission generation.
  /// Covers the same API the mobile app calls via fetchTodayDpeMission.
  /// </summary>
  [TestFixture]
  public class DpeTests : BaseApiTest
  {
    private static string NewChildId() => $"dpe-test-{Guid.NewGuid():N}";

    [Test]
    public async Task GenerateMission_Should_Return_Template_Mission_With_Profile()
    {
      var childId = NewChildId();
      var body = new
      {
        locale = "es",
        profile = new
        {
          name = "Luna",
          age = 8,
          interests = new[] { "music", "space" },
          adjectives = new[] { "curious", "brave" },
        },
      };

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body);

      AssertSuccessStatusCode(response, "DPE generate should return 200");
      var json = AssertValidJsonResponse(
        response.Content,
        "missionId",
        "childId",
        "title",
        "scenario",
        "theme",
        "agent",
        "welcomeMessage",
        "reflectionQuestions",
        "activitySteps",
        "parentActivity",
        "rewardPlan",
        "generatedBy"
      );

      Assert.That(json.GetProperty("childId").GetString(), Is.EqualTo(childId));
      Assert.That(json.GetProperty("generatedBy").GetString(), Is.EqualTo("template"));
      Assert.That(json.GetProperty("reflectionQuestions").GetArrayLength(), Is.EqualTo(2));
      Assert.That(json.GetProperty("rewardPlan").GetProperty("coins").GetInt32(), Is.GreaterThanOrEqualTo(10));
    }

    [Test]
    public async Task TodayMission_Should_Be_Idempotent_For_Same_Child()
    {
      var childId = NewChildId();

      var first = await Client.GetAsync($"/dpe/daily-mission/{childId}/today?locale=en");
      var second = await Client.GetAsync($"/dpe/daily-mission/{childId}/today?locale=en");

      AssertSuccessStatusCode(first);
      AssertSuccessStatusCode(second);

      var firstJson = JsonSerializer.Deserialize<JsonElement>(first.Content!);
      var secondJson = JsonSerializer.Deserialize<JsonElement>(second.Content!);

      Assert.That(
        firstJson.GetProperty("missionId").GetString(),
        Is.EqualTo(secondJson.GetProperty("missionId").GetString()),
        "Same child/day should return the same cached mission"
      );
    }

    [Test]
    public async Task GenerateMission_Should_Use_Recommended_Dpe_Theme_From_Curriculum()
    {
      var childId = NewChildId();
      var body = new
      {
        locale = "es",
        profile = new { name = "Sol", age = 7 },
        recommendedDpeTheme = "growth_mindset",
      };

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      Assert.That(json.GetProperty("theme").GetString(), Is.EqualTo("growth_mindset"));
      if (json.TryGetProperty("themeSource", out var source))
      {
        Assert.That(source.GetString(), Is.EqualTo("curriculum_theme"));
      }
    }

    [Test]
    public async Task GenerateMission_Should_Map_Focus_Competency_To_Theme()
    {
      var childId = NewChildId();
      var body = new
      {
        locale = "es",
        focusCompetency = "relationshipSkills",
      };

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      Assert.That(json.GetProperty("theme").GetString(), Is.EqualTo("empathy"));
      if (json.TryGetProperty("focusCompetency", out var focus))
      {
        Assert.That(focus.GetString(), Is.EqualTo("relationshipSkills"));
      }
    }
  }
}
