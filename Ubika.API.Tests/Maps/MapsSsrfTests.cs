using System.Net;
using NUnit.Framework;

namespace Ubika.API.Tests.Maps;

[TestFixture]
[Category("Ubika")]
[Category("Security")]
public class MapsSsrfTests : BaseUbikaApiTest
{
    [TestCase("https://example.com")]
    [TestCase("https://google.evil.com/maps")]
    [TestCase("http://maps.google.com/maps?q=9.9,-84.1")]
    [TestCase("http://127.0.0.1/")]
    [TestCase("http://169.254.169.254/latest/meta-data/")]
    [TestCase("https://169.254.169.254/")]
    public async Task Resolve_Rejects_A_Url_That_Is_Not_Https_Google(string rawUrl)
    {
        var response = await Client.GetAsync(
            "/api/maps/resolve?url=" + Uri.EscapeDataString(rawUrl),
            headers: FreshIp());
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.BadRequest), response.Content);
    }

    [Test]
    public async Task Resolve_Returns_429_After_The_Per_Ip_Limit()
    {
        var headers = FreshIp();
        HttpStatusCode last = 0;
        for (var i = 0; i < 31; i++)
        {
            var response = await Client.GetAsync(
                "/api/maps/resolve?url=" + Uri.EscapeDataString("https://example.com"),
                headers: headers);
            last = response.StatusCode;
        }

        Assert.That(last, Is.EqualTo(HttpStatusCode.TooManyRequests));
    }

    /// <summary>
    /// One address per test so a previous run does not already sit at the limit.
    /// The app keys the bucket on the first X-Forwarded-For hop.
    /// </summary>
    private static Dictionary<string, string> FreshIp() =>
        new() { ["X-Forwarded-For"] = $"203.0.113.{Random.Shared.Next(1, 255)}" };
}
