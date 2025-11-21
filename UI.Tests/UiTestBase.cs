using Microsoft.Playwright;
using NUnit.Framework;
using System;
using System.Threading.Tasks;

namespace UI.Tests;

public static class TestConfig
{
    public static string BaseUrl =>
        Environment.GetEnvironmentVariable("BASE_URL") 
        ?? "https://astro-kid-web-dev.vercel.app"; // valor por defecto
}

public class UiTestBase
{
    protected IPlaywright _playwright = null!;
    protected IBrowser _browser = null!;
    protected IPage _page = null!;

    [OneTimeSetUp]
    public async Task OneTimeSetup()
    {
        _playwright = await Playwright.CreateAsync();
        _browser = await _playwright.Chromium.LaunchAsync(new BrowserTypeLaunchOptions
        {
            Headless = true
        });
    }

    [SetUp]
    public async Task Setup()
    {
        var context = await _browser.NewContextAsync();
        _page = await context.NewPageAsync();
    }

    [TearDown]
    public async Task TearDown()
    {
        await _page.Context.CloseAsync();
    }

    [OneTimeTearDown]
    public async Task OneTimeTearDown()
    {
        await _browser.CloseAsync();
        _playwright.Dispose();
    }
}

