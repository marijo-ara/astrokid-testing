using Microsoft.Playwright;
using UI.Tests;

namespace UI.Tests.Pages;

public class LandingPage
{
    private readonly IPage _page;

    public LandingPage(IPage page)
    {
        _page = page;
    }

    public async Task GoToAsync()
    {
        await _page.GotoAsync(TestConfig.BaseUrl + "/", new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = 30000 });
        await _page.WaitForLoadStateAsync(LoadState.NetworkIdle, new() { Timeout = 30000 });
    }
}

