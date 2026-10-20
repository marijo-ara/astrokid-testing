using System;
using NUnit.Framework;

namespace UI.Tests;

/// <summary>
/// UI login credentials — never hardcode secrets in source.
/// Set ASTROKID_UI_EMAIL / ASTROKID_UI_PASSWORD in local env or Azure DevOps.
/// </summary>
public static class TestCredentials
{
    public static string Email =>
        Environment.GetEnvironmentVariable("ASTROKID_UI_EMAIL")?.Trim() ?? string.Empty;

    public static string Password =>
        Environment.GetEnvironmentVariable("ASTROKID_UI_PASSWORD")?.Trim() ?? string.Empty;

    /// <summary>
    /// Skip UI auth tests when secrets are not configured (CI without vault / local without .env).
    /// </summary>
    public static void AssumeConfigured()
    {
        Assume.That(
            !string.IsNullOrWhiteSpace(Email) && !string.IsNullOrWhiteSpace(Password),
            "Set ASTROKID_UI_EMAIL and ASTROKID_UI_PASSWORD to run authenticated UI tests."
        );
    }
}
