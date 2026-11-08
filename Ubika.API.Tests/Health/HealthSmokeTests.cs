using System.Net;
using System.Text.Json;
using NUnit.Framework;

namespace Ubika.API.Tests.Health;

/// <summary>
/// The Next.js app exposes GET /api/health. It answers 200 only when Postgres
/// answers, and 503 when it does not. The body never includes the connection string.
/// </summary>
[TestFixture]
[Category("Ubika")]
[Category("Smoke")]
[Category("Health")]
public class HealthSmokeTests : BaseUbikaApiTest
{
    [Test]
    public async Task Health_Is_Closed_And_Does_Not_Leak_The_Database_Url()
    {
        var response = await Client.GetAsync("/api/health");
        Assert.That(
            response.StatusCode,
            Is.EqualTo(HttpStatusCode.OK).Or.EqualTo(HttpStatusCode.ServiceUnavailable),
            response.Content);

        var json = Json(response);
        var ok = json.GetProperty("ok").GetBoolean();
        if (response.StatusCode == HttpStatusCode.OK)
            Assert.That(ok, Is.True);
        else
            Assert.That(ok, Is.False);

        var body = response.Content ?? "";
        Assert.That(body, Does.Not.Contain("postgresql://").IgnoreCase);
        Assert.That(body, Does.Not.Contain("DATABASE_URL"));
    }

    [Test]
    public async Task OpenApi_Docs_Are_Not_Served()
    {
        var response = await Client.GetAsync("/docs");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.NotFound), response.Content);
        var body = response.Content ?? "";
        Assert.That(body, Does.Not.Contain("\"openapi\"").IgnoreCase);
        Assert.That(body, Does.Not.Contain("swagger").IgnoreCase);
    }
}
