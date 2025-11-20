using Microsoft.Playwright;

namespace UI.Tests.Pages;

public class LoginPage
{
    private readonly IPage _page;

    public LoginPage(IPage page)
    {
        _page = page;
    }

    public ILocator EmailInput => _page.GetByLabel("Email");
    public ILocator PasswordInput => _page.GetByLabel("Password");
    public ILocator LoginButton => _page.GetByTestId("login-btn");

    public async Task GoToAsync()
    {
        await _page.GotoAsync("https://astro-kid.vercel.app/login");
    }

    public async Task LoginAsync(string email, string password)
    {
        await EmailInput.FillAsync(email);
        await PasswordInput.FillAsync(password);
        await LoginButton.ClickAsync();
    }
}
