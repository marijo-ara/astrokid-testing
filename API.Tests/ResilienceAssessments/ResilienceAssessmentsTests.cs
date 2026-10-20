using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;
using RestSharp;

namespace API.Tests.ResilienceAssessments
{
  /// <summary>
  /// Tests for daily mission results — sync path used by the mobile app after finishMission.
  /// Each test uses a consented family and the child session headers the app sends.
  /// </summary>
  [TestFixture]
  public class ResilienceAssessmentsTests : BaseApiTest
  {
    private static object SampleAssessment(string childId, string? completedAt = null) => new
    {
      date = DateTime.UtcNow.ToString("yyyy-MM-dd"),
      child_id = childId,
      resilience_score = 72,
      emotions = new[] { "frustrated", "calm" },
      reflection_answers = new[] { "breathe", "mistakes" },
      parent_recommendation = "Pregúntale qué aprendió hoy.",
      completed_at = completedAt ?? DateTime.UtcNow.ToString("o"),
      duration_ms = 120_000,
      attempt_number = 1,
      mission_id = $"mission-{Guid.NewGuid():N}",
      mission_title = "Misión diaria de prueba",
      theme = "resilience",
      agent = "resilience",
      reward_coins = 10,
    };

    private Task<ConsentedFamily> FamilyAsync() => CreateConsentedFamilyAsync("resilience");

    private Task<RestResponse> AsChild(ConsentedFamily family, Method method, string path, object? body = null) =>
      Client.SendAsync(method, path, body, headers: family.ChildHeaders);

    [Test]
    public async Task PostAssessment_Should_Store_Result_And_Return_Streak()
    {
      var family = await FamilyAsync();

      var response = await AsChild(family, Method.Post, $"/resilience-assessments/{family.ChildId}", SampleAssessment(family.ChildId));

      AssertSuccessStatusCode(response, $"{response.StatusCode} {response.Content}");
      var json = AssertValidJsonResponse(response.Content, "history", "currentStreak");

      Assert.That(json.GetProperty("currentStreak").GetInt32(), Is.GreaterThanOrEqualTo(1));
      Assert.That(json.GetProperty("history").GetProperty("results").GetArrayLength(), Is.EqualTo(1));
    }

    [Test]
    public async Task GetChildState_Should_Report_Daily_Locked_After_Completion()
    {
      var family = await FamilyAsync();

      await AsChild(family, Method.Post, $"/resilience-assessments/{family.ChildId}", SampleAssessment(family.ChildId));

      var stateResponse = await AsChild(family, Method.Get, $"/resilience-assessments/{family.ChildId}/state");
      AssertSuccessStatusCode(stateResponse);

      var state = JsonSerializer.Deserialize<JsonElement>(stateResponse.Content!);
      Assert.That(JsonTestHelpers.GetProperty(state, "dailyLocked").GetBoolean(), Is.True);
      Assert.That(
        JsonTestHelpers.GetProperty(JsonTestHelpers.GetProperty(state, "latest"), "resilienceScore").GetInt32(),
        Is.EqualTo(72)
      );
    }

    [Test]
    public async Task PostAssessment_Should_Return_409_When_Daily_Mission_Already_Completed()
    {
      var family = await FamilyAsync();
      var path = $"/resilience-assessments/{family.ChildId}";

      var first = await AsChild(family, Method.Post, path, SampleAssessment(family.ChildId));
      AssertSuccessStatusCode(first);

      var second = await AsChild(family, Method.Post, path, SampleAssessment(family.ChildId));

      Assert.That(second.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
      AssertErrorResponse(second.Content, HttpStatusCode.Conflict);
    }

    [Test]
    public async Task PostAssessment_Should_Return_400_On_Child_Id_Mismatch()
    {
      var family = await FamilyAsync();

      var response = await AsChild(
        family,
        Method.Post,
        $"/resilience-assessments/{family.ChildId}",
        SampleAssessment($"other-{Guid.NewGuid():N}")
      );

      Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task SessionDraft_Should_Persist_And_Clear()
    {
      var family = await FamilyAsync();
      var path = $"/resilience-assessments/{family.ChildId}";
      var now = DateTime.UtcNow.ToString("o");

      var updateBody = new
      {
        new_attempt = true,
        step = "intro",
        step_visit = true,
        draft = new
        {
          step_index = 0,
          step = "intro",
          selected_emotions = Array.Empty<string>(),
          reflection1 = (string?)null,
          reflection2 = (string?)null,
          game_round_index = 0,
          game_choice_id = (string?)null,
          game_stars_earned = 0,
          activity_index = 0,
          started_at = now,
          updated_at = now,
          attempt_number = 1,
        },
      };

      var putResponse = await AsChild(family, Method.Put, $"{path}/session", updateBody);
      AssertSuccessStatusCode(putResponse);

      var stateAfterDraft = await AsChild(family, Method.Get, $"{path}/state");
      AssertSuccessStatusCode(stateAfterDraft);
      var draftState = JsonSerializer.Deserialize<JsonElement>(stateAfterDraft.Content!);
      Assert.That(
        JsonTestHelpers.TryGetProperty(draftState, "sessionDraft", out var draft)
          && draft.ValueKind != JsonValueKind.Null,
        Is.True
      );

      var clearResponse = await AsChild(family, Method.Delete, $"{path}/session");
      AssertSuccessStatusCode(clearResponse);

      var stateAfterClear = await AsChild(family, Method.Get, $"{path}/state");
      var cleared = JsonSerializer.Deserialize<JsonElement>(stateAfterClear.Content!);
      Assert.That(
        !JsonTestHelpers.TryGetProperty(cleared, "sessionDraft", out var clearedDraft)
          || clearedDraft.ValueKind == JsonValueKind.Null,
        Is.True
      );
    }

    [Test]
    public async Task GetHistory_Should_Return_Empty_For_New_Child()
    {
      var family = await FamilyAsync();

      var response = await AsChild(family, Method.Get, $"/resilience-assessments/{family.ChildId}");
      AssertSuccessStatusCode(response);

      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);
      Assert.That(JsonTestHelpers.GetProperty(json, "results").GetArrayLength(), Is.EqualTo(0));
      Assert.That(JsonTestHelpers.GetProperty(json, "childId").GetString(), Is.EqualTo(family.ChildId));
    }

    [Test]
    [Category("Smoke")]
    public async Task Results_Require_Credentials()
    {
      var response = await Client.GetAsync($"/resilience-assessments/resilience-test-{Guid.NewGuid():N}");
      AssumeBackendAvailable(response);

      Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized));
    }

    [Test]
    public async Task Child_Session_Cannot_Read_Another_Childs_Results()
    {
      var family = await FamilyAsync();
      var other = await FamilyAsync();

      var response = await AsChild(family, Method.Get, $"/resilience-assessments/{other.ChildId}");

      Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Forbidden));
    }
  }
}
