# Mobile.E2E — Appium / WebdriverIO (sandbox)

Moved from `astro-kid-web/apps/mobile-tests` (October 2026).

This is still a learning sandbox: the features drive a demo todo-list app, not
AstroKid. It lives here so every black-box test is in one repo. The committed
`chromedriver.exe` was not copied; install the driver locally
(`npx appium driver install uiautomator2`, or a ChromeDriver that matches the
device Chrome).

Until real AstroKid mobile specs exist, the mobile release gate is the API
happy path in `API.Tests` (MissionFlow, DPE, ResilienceAssessments,
McpEvaluate). See `docs/TEST_STRATEGY.md`.

Guides: `APPIUM_LEARNING_GUIDE.md`, `APPIUM_CHEAT_SHEET.md`, `examples/`.
