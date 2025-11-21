using UI.Tests.Pages;

namespace UI.Tests;

public class Tests : UiTestBase
{

    [Test]
    public void Test1()
    {
        Assert.Pass();
    }

    [Test]
    public async Task Parent_Should_Login_Successfully()
    {
        try
        {
            // Arrange
            var loginPage = new LoginPage(_page);
            await loginPage.GoToAsync();
            
            // Debug: Take screenshot and log page info after navigation
            var pageTitle = await _page.TitleAsync();
            var pageUrl = _page.Url;
            Console.WriteLine($"Page Title: {pageTitle}");
            Console.WriteLine($"Page URL: {pageUrl}");
            
            // Take screenshot for debugging
            await _page.ScreenshotAsync(new() { Path = "screenshot-before-login.png", FullPage = true });
            Console.WriteLine("Screenshot saved: screenshot-before-login.png");
            
            // Act
            await loginPage.LoginAsync("marijodev@gmail.com", "Password123!");
            
            
        }
        catch (Exception ex)
        {
            // Take screenshot on error for debugging
            try
            {
                await _page.ScreenshotAsync(new() { Path = "screenshot-on-error.png", FullPage = true });
                Console.WriteLine($"Screenshot saved: screenshot-on-error.png");
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"Current URL: {_page.Url}");
                Console.WriteLine($"Page Title: {await _page.TitleAsync()}");
            }
            catch { }
            throw;
        }
    }
}
