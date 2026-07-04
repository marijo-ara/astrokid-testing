using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using NUnit.Framework;

namespace API.Tests.MCP
{
  /// <summary>
  /// Tests for POST /mcp/evaluate — post-mission MCP coaching used by the mobile app.
  /// </summary>
  [TestFixture]
  public class McpEvaluateTests : BaseApiTest
  {
    private static string NewChildId() => $"mcp-eval-{Guid.NewGuid():N}";

    [Test]
    public async Task Evaluate_Should_Return_Monitoring_For_Strong_Mission()
    {
      var body = new
      {
        child_id = NewChildId(),
        emotions = new[] { "calm", "hopeful" },
        reflection_answers = new[] { "breathe", "mistakes" },
        resilience_score = 85,
        duration_ms = 180_000,
      };

      var response = await Client.PostAsync("/mcp/evaluate", body);

      AssertSuccessStatusCode(response);
      var json = AssertValidJsonResponse(
        response.Content,
        "requiresIntervention",
        "confidenceLevel",
        "engagementLevel",
        "reason"
      );

      Assert.That(json.GetProperty("requiresIntervention").GetBoolean(), Is.False);
      Assert.That(json.GetProperty("confidenceLevel").GetString(), Is.EqualTo("high"));
    }

    [Test]
    public async Task Evaluate_Should_Recommend_Resilience_After_Low_Score()
    {
      var body = new
      {
        child_id = NewChildId(),
        emotions = new[] { "sad", "frustrated" },
        reflection_answers = new[] { "yell", "giveup" },
        resilience_score = 25,
        duration_ms = 45_000,
      };

      var response = await Client.PostAsync("/mcp/evaluate", body);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      Assert.That(json.GetProperty("requiresIntervention").GetBoolean(), Is.True);
      Assert.That(json.GetProperty("interventionAgent").GetString(), Is.EqualTo("resilience"));
      Assert.That(json.GetProperty("message").GetString(), Is.Not.Null.And.Not.Empty);
    }

    [Test]
    public async Task Evaluate_Should_Recommend_Empathy_For_Mixed_Emotions()
    {
      var body = new
      {
        child_id = NewChildId(),
        emotions = new[] { "frustrated" },
        reflection_answers = new[] { "talk" },
        resilience_score = 55,
        duration_ms = 90_000,
      };

      var response = await Client.PostAsync("/mcp/evaluate", body);

      AssertSuccessStatusCode(response);
      var json = JsonSerializer.Deserialize<JsonElement>(response.Content!);

      Assert.That(json.GetProperty("requiresIntervention").GetBoolean(), Is.True);
      Assert.That(json.GetProperty("interventionAgent").GetString(), Is.EqualTo("empathy"));
    }
  }
}
