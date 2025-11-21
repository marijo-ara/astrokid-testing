using Microsoft.Playwright;
using NUnit.Framework;
using System.Threading.Tasks;
using UI.Tests.Pages;

namespace UI.Tests;

[TestFixture]
public class HomeTests : UiTestBase
{
    [Test]
    public async Task Home_Should_Load()
    {
        await _page.GotoAsync(TestConfig.BaseUrl + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        await _page.WaitForLoadStateAsync(LoadState.NetworkIdle, new() { Timeout = 30000 });
        
        // Take screenshot for debugging
        await _page.ScreenshotAsync(new() { Path = "screenshot-home-page.png", FullPage = true });
        
        // Log page info for debugging
        var url = _page.Url;
        var title = await _page.TitleAsync();
        Console.WriteLine($"[HomeTests] Page URL: {url}");
        Console.WriteLine($"[HomeTests] Page title: {title}");
        
        // Verify the main heading is visible - the h1 contains "AstroKid"
        // Try different approaches to find the heading
        var heading = _page.GetByText("AstroKid", new() { Exact = false }).First;
        await Assertions.Expect(heading).ToBeVisibleAsync(new() { Timeout = 5000 });
    }
}

