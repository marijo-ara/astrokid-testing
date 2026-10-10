using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Safety
{
  /// <summary>
  /// Parent-facing safety-events API (Risk-by-Design dashboard).
  /// Complements backend unit Guardian tests with live HTTP contracts.
  /// </summary>
  [TestFixture]
  [Category("API")]
  [Category("Safety")]
  public class SafetyEventsTests : BaseApiTest
  {
    private async Task<(string ChildId, string Token)> CreateChildAsync()
    {
      Assume.That(ParentToken, Is.Not.Null, "Requires /auth/dev-login");

      var email = QaEmail("safety");
      var token = await LoginParentWithConsentAsync(email, "Safety Parent");

      var familyProfile = new
      {
        parent = new { parent_name = "Safety Parent", parent_email = email },
        child = new
        {
          name = "Safety Child",
          birthdate = DateTime.UtcNow.AddYears(-7).ToString("yyyy-MM-dd"),
          age = 7,
          interests = new[] { "space" },
          avatarId = "nova",
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

      var familyResponse = await Client.PostAsync("/family-profiles/", familyProfile, token);
      AssumeBackendAvailable(familyResponse);
      Assume.That(
        familyResponse.IsSuccessStatusCode,
        Is.True,
        $"Family create failed: {familyResponse.StatusCode} {familyResponse.Content}"
      );

      var familyJson = JsonSerializer.Deserialize<JsonElement>(familyResponse.Content!);
      var familyId = JsonTestHelpers.GetProperty(familyJson, "id").GetString()!;
      var childId = familyJson.GetProperty("children")[0].GetProperty("id").GetString()!;
      RegisterResourceForCleanup(ResourceType.FamilyProfile, familyId);
      return (childId, token);
    }

    [Test]
    [Category("Smoke")]
    public async Task Get_Safety_Events_Should_Return_Empty_List_For_New_Child()
    {
      var (childId, token) = await CreateChildAsync();

      var response = await Client.GetAsync($"/safety-events/{childId}", token);
      AssumeBackendAvailable(response);
      AssertSuccessStatusCode(response);

      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);
      // Shape: { child_id, events: [] } or camelCase
      if (JsonTestHelpers.TryGetProperty(json, "events", out var events))
      {
        Assert.That(events.GetArrayLength(), Is.EqualTo(0));
      }
      else if (json.ValueKind == JsonValueKind.Array)
      {
        Assert.That(json.GetArrayLength(), Is.EqualTo(0));
      }
      else
      {
        Assert.Fail($"Unexpected safety-events payload: {response.Content}");
      }
    }

    [Test]
    [Category("Smoke")]
    public async Task Get_Active_Lock_Should_Be_Unlocked_For_New_Child()
    {
      var (childId, token) = await CreateChildAsync();

      var response = await Client.GetAsync(
        $"/safety-events/{childId}/active-lock",
        token
      );
      AssumeBackendAvailable(response);
      AssertSuccessStatusCode(response);

      var json = AssertValidJsonResponse(response.Content!, "locked");
      Assert.That(json.GetProperty("locked").GetBoolean(), Is.False,
        "New child should not have an active safety lock");
    }

    [Test]
    public async Task Get_Safety_Events_Should_Require_Auth()
    {
      var response = await Client.GetAsync($"/safety-events/{Guid.NewGuid()}");
      Assert.That(
        response.StatusCode,
        Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
      );
    }

    [Test]
    public async Task Acknowledge_Unknown_Event_Should_Fail()
    {
      var (childId, token) = await CreateChildAsync();

      var response = await Client.PostAsync(
        $"/safety-events/{childId}/acknowledge",
        new { eventId = Guid.NewGuid().ToString() },
        token
      );
      AssumeBackendAvailable(response);

      Assert.That(
        response.StatusCode,
        Is.EqualTo(HttpStatusCode.NotFound)
          .Or.EqualTo(HttpStatusCode.BadRequest)
          .Or.EqualTo(HttpStatusCode.UnprocessableEntity),
        $"Acknowledge unknown event should not succeed. Got {response.StatusCode}: {response.Content}"
      );
    }
  }
}
