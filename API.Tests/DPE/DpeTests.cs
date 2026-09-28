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
    private async Task<(string ChildId, string Token)> CreateOwnedChildAsync()
    {
      Assume.That(ParentToken, Is.Not.Null, "Requires /auth/dev-login");

      var email = $"dpe-{Guid.NewGuid():N}@example.com";
      var login = await Client.PostAsync("/auth/dev-login", new { email, name = "DPE Parent" });
      AssumeBackendAvailable(login);
      AssertSuccessStatusCode(login);
      var token = JsonSerializer.Deserialize<JsonElement>(login.Content!)
        .GetProperty("access_token")
        .GetString()!;

      var familyProfile = new
      {
        parent = new { parent_name = "DPE Parent", parent_email = email },
        child = new
        {
          name = "Luna",
          birthdate = DateTime.UtcNow.AddYears(-8).ToString("yyyy-MM-dd"),
          age = 8,
          interests = new[] { "music", "space" },
          avatarId = "nova",
          parental_consent_acknowledged = true,
          selectedAdjectives = new[]
          {
            new { id = "adj1", word = "curious", category = "personalidad", emoji = "🔍" },
            new { id = "adj2", word = "brave", category = "personalidad", emoji = "🦁" },
            new { id = "adj3", word = "kind", category = "personalidad", emoji = "💝" },
          },
        },
      };

      var familyResponse = await Client.PostAsync("/family-profiles/", familyProfile, token);
      AssumeBackendAvailable(familyResponse);
      AssertSuccessStatusCode(familyResponse, "Family create for DPE");
      var familyJson = JsonSerializer.Deserialize<JsonElement>(familyResponse.Content!);
      RegisterResourceForCleanup(ResourceType.FamilyProfile, familyJson.GetProperty("id").GetString()!);
      var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;
      return (childId, token);
    }

    private static void AssertCompiledFourD(JsonElement json)
    {
      var compiler = json.GetProperty("compiler");
      Assert.That(compiler.GetProperty("pipeline").GetString(), Is.EqualTo("mission_compiler"));
      Assert.That(
        compiler.GetProperty("templateKind").GetString(),
        Is.EqualTo("daily").Or.EqualTo("free_arc")
      );

      var arch = json.GetProperty("contract").GetProperty("pedagogicalArchitecture");
      Assert.That(arch.GetProperty("what").GetProperty("role").GetString(), Is.EqualTo("what"));
      Assert.That(arch.GetProperty("what").GetProperty("framework").GetString(), Is.EqualTo("casel"));
      Assert.That(arch.GetProperty("how").GetProperty("role").GetString(), Is.EqualTo("how"));
      Assert.That(arch.GetProperty("how").GetProperty("framework").GetString(), Is.EqualTo("growth_mindset"));
      Assert.That(arch.GetProperty("why").GetProperty("role").GetString(), Is.EqualTo("why"));
      Assert.That(arch.GetProperty("why").GetProperty("framework").GetString(), Is.EqualTo("sdt"));
      Assert.That(arch.GetProperty("think").GetProperty("role").GetString(), Is.EqualTo("think"));
      Assert.That(arch.GetProperty("think").GetProperty("framework").GetString(), Is.EqualTo("metacognition"));

      var arc = json.GetProperty("experienceArc");
      Assert.That(arc.GetArrayLength(), Is.EqualTo(7));
      string[] expected =
      {
        "situation",
        "interpret",
        "thought",
        "decision",
        "adaptive_feedback",
        "transfer",
        "reflection",
      };
      for (var i = 0; i < expected.Length; i++)
      {
        Assert.That(arc[i].GetString(), Is.EqualTo(expected[i]));
      }
    }

    [Test]
    [Category("Smoke")]
    public async Task Generate_Without_Token_Should_Be_Unauthorized()
    {
      var response = await Client.PostAsync(
        $"/dpe/daily-mission/{Guid.NewGuid()}/generate",
        new { locale = "es" }
      );
      AssumeBackendAvailable(response);
      Assert.That((int)response.StatusCode, Is.EqualTo(401));
    }

    [Test]
    [Category("Smoke")]
    public async Task GenerateMission_Should_Expose_Compiler_4D_And_ExperienceArc()
    {
      var (childId, token) = await CreateOwnedChildAsync();
      var response = await Client.PostAsync(
        $"/dpe/daily-mission/{childId}/generate",
        new
        {
          locale = "es",
          profile = new
          {
            name = "Luna",
            age = 8,
            interests = new[] { "music", "space" },
            adjectives = new[] { "curious", "brave" },
          },
        },
        token
      );

      AssertSuccessStatusCode(response, "DPE generate should return 200");
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);
      Assert.That(json.GetProperty("childId").GetString(), Is.EqualTo(childId));
      AssertCompiledFourD(json);
    }

    [Test]
    public async Task GenerateMission_Should_Return_Template_Mission_With_Profile()
    {
      var (childId, token) = await CreateOwnedChildAsync();
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

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body, token);

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
      Assert.That(
        json.GetProperty("generatedBy").GetString(),
        Is.EqualTo("template").Or.EqualTo("free_arc_curated")
      );
      Assert.That(json.GetProperty("reflectionQuestions").GetArrayLength(), Is.GreaterThanOrEqualTo(2));
      Assert.That(json.GetProperty("rewardPlan").GetProperty("coins").GetInt32(), Is.GreaterThanOrEqualTo(10));
      AssertCompiledFourD(json);
    }

    [Test]
    public async Task TodayMission_Should_Be_Idempotent_For_Same_Child()
    {
      var (childId, token) = await CreateOwnedChildAsync();

      var first = await Client.GetAsync($"/dpe/daily-mission/{childId}/today?locale=en", token);
      var second = await Client.GetAsync($"/dpe/daily-mission/{childId}/today?locale=en", token);

      AssertSuccessStatusCode(first);
      AssertSuccessStatusCode(second);

      var firstJson = JsonSerializer.Deserialize<JsonElement>(first.Content!);
      var secondJson = JsonSerializer.Deserialize<JsonElement>(second.Content!);

      Assert.That(
        firstJson.GetProperty("missionId").GetString(),
        Is.EqualTo(secondJson.GetProperty("missionId").GetString()),
        "Same child/day should return the same cached mission"
      );
      AssertCompiledFourD(firstJson);
    }

    [Test]
    public async Task GenerateMission_Should_Use_Recommended_Dpe_Theme_From_Curriculum()
    {
      var (childId, token) = await CreateOwnedChildAsync();
      var body = new
      {
        locale = "es",
        profile = new { name = "Sol", age = 7 },
        recommendedDpeTheme = "growth_mindset",
      };

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body, token);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      AssertCompiledFourD(json);
      if (json.TryGetProperty("freeArc", out var freeArc) && freeArc.ValueKind != JsonValueKind.Null)
      {
        Assert.That(json.GetProperty("generatedBy").GetString(), Is.EqualTo("free_arc_curated"));
      }
      else
      {
        Assert.That(json.GetProperty("theme").GetString(), Is.EqualTo("growth_mindset"));
        if (json.TryGetProperty("themeSource", out var source))
        {
          Assert.That(source.GetString(), Is.EqualTo("curriculum_theme"));
        }
      }
    }

    [Test]
    public async Task GenerateMission_Should_Map_Focus_Competency_To_Theme()
    {
      var (childId, token) = await CreateOwnedChildAsync();
      var body = new
      {
        locale = "es",
        focusCompetency = "relationshipSkills",
      };

      var response = await Client.PostAsync($"/dpe/daily-mission/{childId}/generate", body, token);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      AssertCompiledFourD(json);
      if (json.TryGetProperty("freeArc", out var freeArc) && freeArc.ValueKind != JsonValueKind.Null)
      {
        Assert.That(json.GetProperty("generatedBy").GetString(), Is.EqualTo("free_arc_curated"));
      }
      else
      {
        Assert.That(json.GetProperty("theme").GetString(), Is.EqualTo("empathy"));
        if (json.TryGetProperty("focusCompetency", out var focus))
        {
          Assert.That(focus.GetString(), Is.EqualTo("relationshipSkills"));
        }
      }
    }
  }
}
