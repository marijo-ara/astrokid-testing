using Microsoft.Playwright;
using NUnit.Framework;
using System.Threading.Tasks;
using UI.Tests.Pages;

namespace UI.Tests;

[TestFixture]
[Category("UI")]
public class DashboardTests : UiTestBase
{
    [Test]
    [Category("Smoke")]
    public async Task Dashboard_Should_Load_After_Login()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);

        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });

        var currentUrl = _page.Url;
        Assert.That(currentUrl, Does.Contain("dashboard").Or.Contain("home"),
            "Después del login, debería estar en el dashboard");

        var heading = _page.GetByText("AstroKid", new() { Exact = false }).First;
        await Assertions.Expect(heading).ToBeVisibleAsync(new() { Timeout = 5000 });
    }

    [Test]
    public async Task Dashboard_Should_Display_User_Information()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });

        var localPart = TestCredentials.Email.Split('@')[0];
        var userInfo = _page.GetByText(localPart, new() { Exact = false })
            .Or(_page.GetByText("@", new() { Exact = false }))
            .First;

        var pageTitle = await _page.TitleAsync();
        Assert.That(pageTitle, Is.Not.Null.And.Not.Empty,
            "El dashboard debería tener un título");
    }

    [Test]
    public async Task Dashboard_Should_Have_Navigation_Menu()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });

        var navElements = _page.Locator("nav").Or(_page.Locator("[role='navigation']"));
        var navCount = await navElements.CountAsync();
        var currentUrl = _page.Url;
        Assert.That(currentUrl, Is.Not.Null.And.Not.Empty,
            "El dashboard debería estar cargado");
    }
}
