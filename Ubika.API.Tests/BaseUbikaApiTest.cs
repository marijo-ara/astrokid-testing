using System.Net;
using System.Text.Json;
using NUnit.Framework;
using RestSharp;

namespace Ubika.API.Tests;

[TestFixture]
public abstract class BaseUbikaApiTest
{
    protected UbikaApiClient Client { get; private set; } = null!;

    [OneTimeSetUp]
    public void RequireDeployedApi()
    {
        var baseUrl = Environment.GetEnvironmentVariable("UBIKA_API_BASE_URL");
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            Assert.Ignore(
                "Definí UBIKA_API_BASE_URL (API desplegada). Las unitarias viven en ubika-backend.");
        }

        Client = new UbikaApiClient(baseUrl);
    }

    protected static JsonElement Json(RestResponse response)
    {
        Assert.That(response.Content, Is.Not.Null.And.Not.Empty);
        return JsonSerializer.Deserialize<JsonElement>(response.Content!);
    }
}
