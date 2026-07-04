using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.ResilienceAssessments
{
  /// <summary>
  /// Tests for daily mission results — sync path used by the mobile app after finishMission.
  /// </summary>
  [TestFixture]
  public class ResilienceAssessmentsTests : BaseApiTest
  {
    private static string NewChildId() => $"resilience-test-{Guid.NewGuid():N}";

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

    [Test]
    public async Task PostAssessment_Should_Store_Result_And_Return_Streak()
    {
      var childId = NewChildId();

      var response = await Client.PostAsync($"/resilience-assessments/{childId}", SampleAssessment(childId));

      AssertSuccessStatusCode(response);
      var json = AssertValidJsonResponse(response.Content, "history", "currentStreak");

      Assert.That(json.GetProperty("currentStreak").GetInt32(), Is.GreaterThanOrEqualTo(1));
      Assert.That(json.GetProperty("history").GetProperty("results").GetArrayLength(), Is.EqualTo(1));
    }

    [Test]
    public async Task GetChildState_Should_Report_Daily_Locked_After_Completion()
    {
      var childId = NewChildId();

      await Client.PostAsync($"/resilience-assessments/{childId}", SampleAssessment(childId));

      var stateResponse = await Client.GetAsync($"/resilience-assessments/{childId}/state");
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
      var childId = NewChildId();

      var first = await Client.PostAsync($"/resilience-assessments/{childId}", SampleAssessment(childId));
      AssertSuccessStatusCode(first);

      var second = await Client.PostAsync($"/resilience-assessments/{childId}", SampleAssessment(childId));

      Assert.That(second.StatusCode, Is.EqualTo(HttpStatusCode.Conflict));
      AssertErrorResponse(second.Content, HttpStatusCode.Conflict);
    }

    [Test]
    public async Task PostAssessment_Should_Return_400_On_Child_Id_Mismatch()
    {
      var childId = NewChildId();
      var otherChildId = NewChildId();

      var response = await Client.PostAsync(
        $"/resilience-assessments/{childId}",
        SampleAssessment(otherChildId)
      );

      Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest));
    }

    [Test]
    public async Task SessionDraft_Should_Persist_And_Clear()
    {
      var childId = NewChildId();
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

      var putResponse = await Client.PutAsync($"/resilience-assessments/{childId}/session", updateBody);
      AssertSuccessStatusCode(putResponse);

      var stateAfterDraft = await Client.GetAsync($"/resilience-assessments/{childId}/state");
      AssertSuccessStatusCode(stateAfterDraft);
      var draftState = JsonSerializer.Deserialize<JsonElement>(stateAfterDraft.Content!);
      Assert.That(
        JsonTestHelpers.TryGetProperty(draftState, "sessionDraft", out var draft)
          && draft.ValueKind != JsonValueKind.Null,
        Is.True
      );

      var clearResponse = await Client.DeleteAsync($"/resilience-assessments/{childId}/session");
      AssertSuccessStatusCode(clearResponse);

      var stateAfterClear = await Client.GetAsync($"/resilience-assessments/{childId}/state");
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
      var childId = NewChildId();

      var response = await Client.GetAsync($"/resilience-assessments/{childId}");
      AssertSuccessStatusCode(response);

      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);
      Assert.That(JsonTestHelpers.GetProperty(json, "results").GetArrayLength(), Is.EqualTo(0));
      Assert.That(JsonTestHelpers.GetProperty(json, "childId").GetString(), Is.EqualTo(childId));
    }
  }
}
