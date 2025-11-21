using Microsoft.Playwright;
using UI.Tests;

namespace UI.Tests.Pages;

public class LoginPage
{
    private readonly IPage _page;

    public LoginPage(IPage page)
    {
        _page = page;
    }

    public ILocator EmailInput => _page.GetByTestId("login-email-input");
    public ILocator PasswordInput => _page.GetByTestId("login-password-input");
    public ILocator LoginButton => _page.GetByTestId("login-submit-button");

    public async Task GoToAsync()
    {
        await _page.GotoAsync(TestConfig.BaseUrl + "/login", new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        // Esperar a que la página cargue completamente
        await _page.WaitForLoadStateAsync(LoadState.NetworkIdle, new() { Timeout = 30000 });
        
        // Debug: Log page information
        var url = _page.Url;
        var title = await _page.TitleAsync();
        Console.WriteLine($"[LoginPage] Navigated to URL: {url}");
        Console.WriteLine($"[LoginPage] Page title: {title}");
        
        // Take screenshot for debugging
        await _page.ScreenshotAsync(new() { Path = "screenshot-login-page-loaded.png", FullPage = true });
    }

    public async Task LoginAsync(string email, string password)
    {
        // Debug: Log current state before waiting for elements
        var url = _page.Url;
        var title = await _page.TitleAsync();
        Console.WriteLine($"[LoginPage] Before waiting for elements - URL: {url}, Title: {title}");
        
        // Esperar a que los elementos estén visibles antes de interactuar
        try
        {
            await EmailInput.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 10000 });
            Console.WriteLine("[LoginPage] Email input found and visible");
            
            await PasswordInput.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 10000 });
            Console.WriteLine("[LoginPage] Password input found and visible");
        }
        catch (Exception ex)
        {
            // Take screenshot when elements are not found
            await _page.ScreenshotAsync(new() { Path = "screenshot-elements-not-found.png", FullPage = true });
            Console.WriteLine($"[LoginPage] Error waiting for elements: {ex.Message}");
            Console.WriteLine($"Current URL: {_page.Url}");
            Console.WriteLine($"Page title: {await _page.TitleAsync()}");
            throw;
        }
        
        await EmailInput.FillAsync(email);
        await PasswordInput.FillAsync(password);
        
        await LoginButton.WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = 10000 });
        Console.WriteLine("[LoginPage] Login button found and visible");
        
        await LoginButton.ClickAsync();
        Console.WriteLine("[LoginPage] Login button clicked");
    }
}
