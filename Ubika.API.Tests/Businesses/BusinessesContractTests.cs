using System.Net;
using System.Text.Json;
using NUnit.Framework;

namespace Ubika.API.Tests.Businesses;

[TestFixture]
[Category("Ubika")]
[Category("Smoke")]
public class BusinessesContractTests : BaseUbikaApiTest
{
    private static readonly string[] HiddenFields =
    {
        "email", "userId", "user_id", "cedula_juridica", "cedulaJuridica",
        "cedulaPhotoUrl", "verificationAdminNote", "phone", "whatsapp", "address"
    };

    [Test]
    public async Task Categories_Returns_A_Json_Array()
    {
        var response = await Client.GetAsync("/api/categories");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), response.Content);
        var json = Json(response);
        Assert.That(json.ValueKind, Is.EqualTo(JsonValueKind.Array));
        Assert.That(json.GetArrayLength(), Is.GreaterThan(0));
        Assert.That(json[0].TryGetProperty("slug", out _), Is.True);
    }

    [Test]
    public async Task Public_Business_List_Omits_Pii()
    {
        var response = await Client.GetAsync("/api/businesses");
        Assert.That(response.StatusCode, Is.EqualTo(HttpStatusCode.OK), response.Content);
        var json = Json(response);
        Assert.That(json.ValueKind, Is.EqualTo(JsonValueKind.Array));

        foreach (var item in json.EnumerateArray())
        {
            foreach (var field in HiddenFields)
            {
                Assert.That(
                    item.TryGetProperty(field, out _),
                    Is.False,
                    $"{field} no va en el listado público");
            }
        }
    }
}
