using Microsoft.Playwright;
using NUnit.Framework;
using System.Threading.Tasks;
using UI.Tests.Pages;

namespace UI.Tests;

/// <summary>
/// Smoke UI for parent family maps (Empathy / Resilience observations + journey).
/// Manual companion: UI.Tests/MANUAL_SMOKE_FAMILY_MAPS.md (~5 min).
/// Requires ASTROKID_UI_EMAIL + ASTROKID_UI_PASSWORD.
/// </summary>
[TestFixture]
[Category("Smoke")]
[Category("UI")]
[Category("FamilyMaps")]
public class FamilyMapsSmokeTests : UiTestBase
{
    [Test]
    [Category("Smoke")]
    public async Task Dashboard_Should_Show_Family_Map_Surface_After_Login()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 20000 });

        var dashboard = new DashboardPage(_page);
        Assert.That(await dashboard.IsReadyAsync(), Is.True, "Dashboard should be ready");

        var mvp = await dashboard.ParentMvpStack.CountAsync();
        var hasSurface = await dashboard.HasFamilyMapSurfaceAsync();
        Assert.That(mvp > 0 || hasSurface, Is.True,
            "Expected parent MVP stack or family-map cards/progress on dashboard");
    }

    [Test]
    [Category("Smoke")]
    public async Task Empathy_Family_Map_Should_Open_From_Dashboard()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 20000 });

        var dashboard = new DashboardPage(_page);
        await dashboard.WaitForAgentCardsAsync();
        await dashboard.OpenEmpathyFamilyMapAsync();

        Assert.That(_page.Url, Does.Contain("adventure"),
            "Should navigate to family map adventure route");

        var stations = _page.Locator("#family-map-questions");
        var journey = _page.Locator("#family-map-missions");
        var stationsVisible = await stations.CountAsync() > 0 && await stations.First.IsVisibleAsync();
        var journeyVisible = await journey.CountAsync() > 0 && await journey.First.IsVisibleAsync();

        Assert.That(stationsVisible || journeyVisible, Is.True,
            "Family map should show observation stations and/or child mission journey");
    }

    [Test]
    [Category("Smoke")]
    public async Task Family_Map_Pending_Prompt_Can_Be_Answered_When_Present()
    {
        TestCredentials.AssumeConfigured();

        var loginPage = new LoginPage(_page);
        await loginPage.GoToAsync();
        await loginPage.LoginAsync(TestCredentials.Email, TestCredentials.Password);
        await _page.WaitForURLAsync("**/dashboard**", new() { Timeout = 20000 });

        var dashboard = new DashboardPage(_page);
        var pendingCount = await dashboard.FamilyMapPendingPrompt.CountAsync();
        if (pendingCount == 0)
        {
            Assert.Pass("No pending family-map prompt (profiles may already be complete) — OK for smoke");
            return;
        }

        var answered = await dashboard.TryAnswerFamilyMapPendingAsync();
        Assert.That(answered, Is.True, "Should click an option on the pending prompt");

        var impactOrProgress =
            await _page.GetByText(new System.Text.RegularExpressions.Regex(
                "Guardado|Saved|priorizar|prioritize",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase)).CountAsync() > 0
            || await dashboard.FamilyMapSurveyProgress.CountAsync() > 0;
        Assert.That(impactOrProgress, Is.True,
            "After answering, expect impact copy or survey progress on dashboard");
    }
}
