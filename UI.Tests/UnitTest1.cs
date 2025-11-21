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
        // Arrange
        var loginPage = new LoginPage(Page);
        await loginPage.GoToAsync();
        
        // Act
        await loginPage.LoginAsync("parent@test.com", "Password123!");
        
        // Assert - Wait for navigation after login and verify we're redirected
        await Page.WaitForURLAsync("**/dashboard**", new() { Timeout = 10000 });
        var currentUrl = Page.Url;
        
        Assert.That(currentUrl, Does.Contain("/dashboard"), 
            "Should be redirected to dashboard after successful login");
        
        // Alternative: Verify that some dashboard element is visible
        // var dashboardElement = Page.GetByTestId("dashboard-title");
        // await Assertions.Expect(dashboardElement).toBeVisible();
    }
}
