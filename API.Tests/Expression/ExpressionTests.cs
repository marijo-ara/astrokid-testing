using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.Expression
{
  /// <summary>
  /// Contract tests for child expression + familyMapAnswers (parent family maps).
  /// Aligns with MANUAL_SMOKE_FAMILY_MAPS.md troubleshooting.
  /// </summary>
  [TestFixture]
  [Category("API")]
  [Category("Expression")]
  public class ExpressionTests : BaseApiTest
  {
    private async Task<(string ChildId, string Token)> CreateChildForExpressionAsync()
    {
      Assume.That(ParentToken, Is.Not.Null, "Requires /auth/dev-login");

      var email = $"expr-{Guid.NewGuid():N}@example.com";
      var login = await Client.PostAsync(
        "/auth/dev-login",
        new { email, name = "Expr Parent" }
      );
      AssumeBackendAvailable(login);
      AssertSuccessStatusCode(login);
      var token = JsonSerializer.Deserialize<JsonElement>(login.Content!)
        .GetProperty("access_token")
        .GetString()!;

      var familyProfile = new
      {
        parent = new { parent_name = "Expr Parent", parent_email = email },
        child = new
        {
          name = "Expr Child",
          birthdate = DateTime.UtcNow.AddYears(-7).ToString("yyyy-MM-dd"),
          age = 7,
          interests = new[] { "space" },
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
    public async Task Get_Expression_Should_Bootstrap_Profile()
    {
      var (childId, token) = await CreateChildForExpressionAsync();

      var response = await Client.GetAsync(
        $"/child-profiles/{childId}/expression",
        token
      );
      AssumeBackendAvailable(response);
      AssertSuccessStatusCode(response);

      var json = AssertValidJsonResponse(response.Content!, "expression", "source");
      var expr = json.GetProperty("expression");
      Assert.That(
        JsonTestHelpers.GetProperty(expr, "childId").GetString(),
        Is.EqualTo(childId)
      );
    }

    [Test]
    [Category("Smoke")]
    public async Task Put_FamilyMapAnswers_Should_Persist_And_Strip_Transcript()
    {
      var (childId, token) = await CreateChildForExpressionAsync();

      var putBody = new
      {
        childId,
        transcript = "child said something private",
        familyMapAnswers = new
        {
          empathy = new { fam_emp_home = "fam_emp_home_listen" },
          resilience = new { },
        },
        journeyHints = new[] { "family_map_empathy_listen" },
      };

      var put = await Client.PutAsync(
        $"/child-profiles/{childId}/expression",
        putBody,
        token
      );
      AssumeBackendAvailable(put);
      AssertSuccessStatusCode(put);

      var putJson = AssertValidJsonResponse(put.Content!, "expression");
      var expr = putJson.GetProperty("expression");
      Assert.That(expr.TryGetProperty("transcript", out _), Is.False,
        "COPPA: transcript must not persist on expression");

      var answers = JsonTestHelpers.GetProperty(expr, "familyMapAnswers");
      var empathy = answers.GetProperty("empathy");
      Assert.That(
        empathy.GetProperty("fam_emp_home").GetString(),
        Is.EqualTo("fam_emp_home_listen")
      );

      var get = await Client.GetAsync(
        $"/child-profiles/{childId}/expression",
        token
      );
      AssertSuccessStatusCode(get);
      var getExpr = JsonSerializer.Deserialize<JsonElement>(get.Content!)
        .GetProperty("expression");
      Assert.That(getExpr.TryGetProperty("transcript", out _), Is.False);
      Assert.That(
        JsonTestHelpers.GetProperty(getExpr, "familyMapAnswers")
          .GetProperty("empathy")
          .GetProperty("fam_emp_home")
          .GetString(),
        Is.EqualTo("fam_emp_home_listen")
      );
    }

    [Test]
    public async Task Get_Expression_Should_Require_Auth()
    {
      var response = await Client.GetAsync(
        $"/child-profiles/{Guid.NewGuid()}/expression"
      );
      Assert.That(
        response.StatusCode,
        Is.EqualTo(HttpStatusCode.Unauthorized).Or.EqualTo(HttpStatusCode.Forbidden)
      );
    }
  }
}
