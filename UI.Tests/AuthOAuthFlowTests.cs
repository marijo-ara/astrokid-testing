using Microsoft.Playwright;
using NUnit.Framework;
using System;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;

namespace UI.Tests;

/// <summary>
/// Browser OAuth flow of the astrokid-auth server: authorize → login form → callback → token.
/// Ported from astrokid-auth tests/e2e/test_flows_playwright.py. Claims are checked through
/// /userinfo instead of importing the server's token code.
/// </summary>
[TestFixture]
[Category("UI")]
[Category("Auth")]
public class AuthOAuthFlowTests : UiTestBase
{
    private const string State = "playwright-state";
    private static string AuthBaseUrl =>
        (Environment.GetEnvironmentVariable("AUTH_BASE_URL") ?? "https://astrokid-auth.onrender.com").TrimEnd('/');
    private static string RedirectUri => $"{AuthBaseUrl}/test-callback";

    [OneTimeSetUp]
    public void RequireAuthServer()
    {
        if (string.IsNullOrWhiteSpace(AuthBaseUrl))
        {
            Assert.Ignore("AUTH_BASE_URL no está configurada (p. ej. http://localhost:8001).");
        }
    }

    private static string AuthorizeUrl(bool withScopeAndState) =>
        $"{AuthBaseUrl}/authorize?response_type=code&client_id=astro-kid-web"
        + $"&redirect_uri={Uri.EscapeDataString(RedirectUri)}"
        + (withScopeAndState ? $"&scope={Uri.EscapeDataString("openid profile email")}&state={State}" : "");

    private async Task OpenAuthorizeAsync(bool withScopeAndState)
    {
        await _page.GotoAsync(AuthorizeUrl(withScopeAndState), new() { WaitUntil = WaitUntilState.DOMContentLoaded });
        if ((await _page.ContentAsync()).Contains("invalid_redirect_uri"))
        {
            Assert.Inconclusive($"Añade {RedirectUri} a AUTH_ALLOWED_REDIRECT_URIS en el servidor auth de QA.");
        }
    }

    [Test]
    [Category("Smoke")]
    public async Task Full_OAuth_Flow_Issues_Tokens_With_The_Login_Claims()
    {
        const string email = "playwright@example.com";
        const string name = "Playwright User";

        await OpenAuthorizeAsync(withScopeAndState: true);
        await _page.Locator("input[name=\"email\"]").FillAsync(email);
        await _page.Locator("input[name=\"name\"]").FillAsync(name);
        await _page.GetByRole(AriaRole.Button, new() { Name = "Continuar" }).ClickAsync();
        await _page.WaitForURLAsync(url => url.Contains("test-callback"), new() { Timeout = 10_000 });

        var query = HttpUtility.ParseQueryString(new Uri(_page.Url).Query);
        Assert.That(query["state"], Is.EqualTo(State));
        var code = query["code"];
        Assert.That(code, Is.Not.Null.And.Not.Empty);

        await using var api = await _playwright.APIRequest.NewContextAsync(new() { BaseURL = AuthBaseUrl });
        var form = api.CreateFormData();
        form.Set("grant_type", "authorization_code");
        form.Set("code", code!);
        form.Set("redirect_uri", RedirectUri);
        var tokenResponse = await api.PostAsync("/token", new() { Form = form });
        Assert.That(tokenResponse.Status, Is.EqualTo(200), await tokenResponse.TextAsync());

        var tokens = JsonSerializer.Deserialize<JsonElement>(await tokenResponse.TextAsync());
        Assert.That(tokens.TryGetProperty("refresh_token", out _), Is.True);
        var accessToken = tokens.GetProperty("access_token").GetString();

        var userinfo = await api.GetAsync("/userinfo", new()
        {
            Headers = new System.Collections.Generic.Dictionary<string, string> { ["Authorization"] = $"Bearer {accessToken}" }
        });
        Assert.That(userinfo.Status, Is.EqualTo(200));
        var claims = JsonSerializer.Deserialize<JsonElement>(await userinfo.TextAsync());
        Assert.That(claims.GetProperty("sub").GetString(), Is.EqualTo(email));
        Assert.That(claims.GetProperty("email").GetString(), Is.EqualTo(email));
        Assert.That(claims.GetProperty("name").GetString(), Is.EqualTo(name));
    }

    [Test]
    public async Task Authorize_Page_Shows_The_Login_Form()
    {
        await OpenAuthorizeAsync(withScopeAndState: false);

        await Assertions.Expect(_page.Locator("input[name=\"email\"]")).ToBeVisibleAsync();
        await Assertions.Expect(_page.Locator("input[name=\"name\"]")).ToBeVisibleAsync();
        await Assertions.Expect(_page.GetByRole(AriaRole.Button, new() { Name = "Continuar" })).ToBeVisibleAsync();
    }

    [Test]
    public async Task Discovery_And_Docs_Are_Reachable()
    {
        await _page.GotoAsync($"{AuthBaseUrl}/.well-known/openid-configuration");
        var content = await _page.ContentAsync();
        Assert.That(content, Does.Contain("issuer").And.Contain("authorization_endpoint"));

        await _page.GotoAsync($"{AuthBaseUrl}/docs");
        await Assertions.Expect(_page.GetByRole(AriaRole.Heading, new() { Name = "AstroKid Auth" })).ToBeVisibleAsync();
    }
}
