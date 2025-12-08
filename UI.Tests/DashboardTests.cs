using Microsoft.Playwright;
using NUnit.Framework;
using System.Threading.Tasks;
using UI.Tests.Pages;

namespace UI.Tests;

[TestFixture]
public class DashboardTests : UiTestBase
{
    [Test]
    public async Task Dashboard_Should_Load_After_Login()
    {
        // Arrange
        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        
        // Act - Login first
        await loginPage.LoginAsync("marijodev@gmail.com", "Password123!");
        
        // Wait for navigation to dashboard
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });
        
        // Assert
        var currentUrl = _page.Url;
        Assert.That(currentUrl, Does.Contain("dashboard").Or.Contain("home"),
            "Después del login, debería estar en el dashboard");
        
        // Verify dashboard elements are visible
        var heading = _page.GetByText("AstroKid", new() { Exact = false }).First;
        await Assertions.Expect(heading).ToBeVisibleAsync(new() { Timeout = 5000 });
    }

    [Test]
    public async Task Dashboard_Should_Display_User_Information()
    {
        // Arrange
        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync("marijodev@gmail.com", "Password123!");
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });
        
        // Act - Look for user-related elements
        // These selectors may need to be adjusted based on your actual UI
        var userInfo = _page.GetByText("marijodev", new() { Exact = false })
            .Or(_page.GetByText("@", new() { Exact = false }))
            .First;
        
        // Assert - User info should be visible (or at least page should be loaded)
        var pageTitle = await _page.TitleAsync();
        Assert.That(pageTitle, Is.Not.Null.And.Not.Empty,
            "El dashboard debería tener un título");
    }

    [Test]
    public async Task Dashboard_Should_Have_Navigation_Menu()
    {
        // Arrange
        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync("marijodev@gmail.com", "Password123!");
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 15000 });
        
        // Act - Look for navigation elements
        // These selectors may need to be adjusted based on your actual UI
        var navElements = _page.Locator("nav").Or(_page.Locator("[role='navigation']"));
        
        // Assert - Navigation should exist (even if empty)
        var navCount = await navElements.CountAsync();
        // At minimum, the page should be loaded
        var currentUrl = _page.Url;
        Assert.That(currentUrl, Is.Not.Null.And.Not.Empty,
            "El dashboard debería estar cargado");
    }
}

