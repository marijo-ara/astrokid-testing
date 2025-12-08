using Microsoft.Playwright;
using NUnit.Framework;
using UI.Tests.Pages;
using System;
using System.Threading.Tasks;

namespace UI.Tests;

[TestFixture]
public class ParentsTests : UiTestBase
{
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
            
            // Wait for navigation after login
            await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 10000 });
            
            // Assert
            var currentUrl = _page.Url;
            Assert.That(currentUrl, Does.Contain("dashboard").Or.Contain("home"),
                "Después del login, debería redirigir al dashboard o home");
            
            // Verify that we're no longer on the login page
            Assert.That(currentUrl, Does.Not.Contain("/login"),
                "No debería estar en la página de login después de iniciar sesión");
            
            // Take screenshot after successful login
            await _page.ScreenshotAsync(new() { Path = "screenshot-after-login.png", FullPage = true });
            Console.WriteLine("Screenshot saved: screenshot-after-login.png");
        }
        catch (Exception ex)
        {
            // Take screenshot on error for debugging
            try
            {
                await _page.ScreenshotAsync(new() { Path = "screenshot-on-error.png", FullPage = true });
                Console.WriteLine($"Screenshot saved: screenshot-on-error.png");
                Console.WriteLine($"Error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                Console.WriteLine($"Current URL: {_page.Url}");
                Console.WriteLine($"Page Title: {await _page.TitleAsync()}");
            }
            catch { }
            throw;
        }
    }

    [Test]
    public async Task Parent_Should_See_Login_Form_On_Login_Page()
    {
        // Arrange
        var loginPage = new LoginPage(_page);
        
        // Act
        await loginPage.GoToAsync();
        
        // Assert
        await Assertions.Expect(loginPage.EmailInput).ToBeVisibleAsync(new() { Timeout = 10000 });
        await Assertions.Expect(loginPage.PasswordInput).ToBeVisibleAsync(new() { Timeout = 10000 });
        await Assertions.Expect(loginPage.LoginButton).ToBeVisibleAsync(new() { Timeout = 10000 });
    }

    [Test]
    public async Task Parent_Should_See_Error_With_Invalid_Credentials()
    {
        // Arrange
        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        
        // Act
        await loginPage.LoginAsync("invalid@example.com", "WrongPassword123!");
        
        // Wait a bit for error message to appear
        await Task.Delay(2000);
        
        // Assert - Check if error message appears (adjust selector based on your UI)
        var errorMessage = _page.GetByText("error", new() { Exact = false })
            .Or(_page.GetByText("incorrecto", new() { Exact = false }))
            .Or(_page.GetByText("invalid", new() { Exact = false }))
            .First;
        
        // The test passes if we're still on login page or if error message appears
        var currentUrl = _page.Url;
        var isStillOnLoginPage = currentUrl.Contains("/login");
        var hasErrorMessage = await errorMessage.IsVisibleAsync().ConfigureAwait(false);
        
        Assert.That(isStillOnLoginPage || hasErrorMessage, Is.True,
            "Con credenciales inválidas, debería mostrar error o permanecer en login");
    }
}
