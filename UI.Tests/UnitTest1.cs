using Microsoft.Playwright.NUnit;
using UI.Tests.Pages;

namespace UI.Tests;

public class Tests : PageTest
{
    [SetUp]
    public void Setup()
    {
    }

    [Test]
    public void Test1()
    {
        Assert.Pass();
    }

    [Test]
    public async Task Parent_Should_Login_Successfully()
    {
        var loginPage = new LoginPage(Page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync("parent@test.com", "Password123!");
    }
}
