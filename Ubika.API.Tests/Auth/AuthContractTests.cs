using System.Net;
using NUnit.Framework;

namespace Ubika.API.Tests.Auth;

/// <summary>
/// Session gates on the Next.js API. Login itself is a server action on /login;
/// the browser suite checks that a missing account and a bad password look the same.
/// </summary>
[TestFixture]
[Category("Ubika")]
[Category("Auth")]
public class AuthContractTests : BaseUbikaApiTest
{
    [Test]
    [Category("Smoke")]
    public async Task MyBusiness_Without_A_Session_Is_401()
    {
        var response = await Client.GetAsync("/api/my-business");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), response.Content);
        Assert.That(response.Content ?? "", Does.Not.Contain("cedula").IgnoreCase);
    }

    [Test]
    [Category("Smoke")]
    public async Task AdminStats_Without_A_Session_Is_401()
    {
        var response = await Client.GetAsync("/api/admin/stats");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), response.Content);
    }

    [Test]
    public async Task ServiceRequests_Without_A_Session_Is_401()
    {
        var response = await Client.GetAsync("/api/service-requests");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), response.Content);
    }

    [Test]
    public async Task Upgrade_Without_A_Session_Is_401()
    {
        var response = await Client.PostAsync("/api/my-business/upgrade", new { });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), response.Content);
    }

    [Test]
    public async Task Phone_Without_A_Session_Is_401_And_Does_Not_Return_A_Number()
    {
        var response = await Client.PostAsync("/api/businesses/worker_test_1/phone", new { });
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.Unauthorized), response.Content);
        Assert.That(response.Content ?? "", Does.Not.Contain("506"));
        Assert.That(response.Content ?? "", Does.Not.Contain("email").IgnoreCase);
    }
}
