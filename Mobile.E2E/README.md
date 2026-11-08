# Mobile.E2E — Appium / WebdriverIO

Moved from `astro-kid-web/apps/mobile-tests` (October 2026).

| Config | What it drives | Features |
| --- | --- | --- |
| `wdio.app.conf.ts` | The AstroKid Android APK | `features/smoke/`, `features/child-login/` |
| `wdio.conf.ts` | Demo todo-list in mobile Chrome (learning sandbox) | `features/todo-list/` |

## Child login with the downloaded QR (`npm run test:apk`)

Installs the APK from scratch, puts a fresh child QR in the emulator gallery, logs in
from "elegir QR de la galería", finishes the AstroWorld intro, restarts the app and checks
the child is still in session. It guards the 1.5.13 regression, where encrypting child
records on the phone used `TextDecoder` and `crypto.getRandomValues`, which Hermes does not have.

The QR carries the same payload as the parent dashboard download (`buildChildQRData`
in astro-kid-web). The child is created through the API before the run and deleted after it.

### Requirements

- Android emulator running (Android 11+; the gallery step handles the Photo Picker and DocumentsUI).
- `npx appium driver install uiautomator2` once. The WDIO Appium service starts Appium with
  `--allow-insecure=uiautomator2:adb_shell` so the pushed image gets indexed by the media scanner.
- A release APK built from astro-kid-web, pointing at the same backend as `ASTROKID_BASE_URL`.

### Environment

| Variable | Use |
| --- | --- |
| `ASTROKID_APK` | Path to the APK under test (required) |
| `ASTROKID_BASE_URL` | Backend. Required. The suite creates a child and does not pick a host on its own |
| `ASTROKID_PARENT_TOKEN` | Bearer of a QA parent with email-plus consent. Required on QA: deployed backends turn `/auth/dev-login` off |
| `ASTROKID_PARENT_EMAIL` | Only if the token has no `email` claim |
| `ANDROID_DEVICE_NAME`, `ANDROID_PLATFORM_VERSION` | Optional Appium capabilities |

Without `ASTROKID_PARENT_TOKEN` the suite uses `/auth/dev-login` with a fresh address, which only a
local backend accepts. Run that backend with `ENVIRONMENT=test` and `COPPA_EMAIL_PLUS_REQUIRED=false`
(as its own `conftest.py` does), and build the APK against it.

```powershell
$env:ASTROKID_APK = "C:\path\to\app-release.apk"
$env:ASTROKID_PARENT_TOKEN = "<token del padre de QA>"
npm run test:apk

# Smoke: the APK opens. The school-child scenario also runs and is skipped
# unless ASTROKID_PARENT_TOKEN belongs to the family with the school license.
npm run test:smoke
```

Report: `target/site/serenity`.

## Sandbox

The todo-list features are still a learning sandbox. Install a ChromeDriver that matches the
device Chrome to run them with `npm run serenity`. Guides: `APPIUM_LEARNING_GUIDE.md`,
`APPIUM_CHEAT_SHEET.md`, `examples/`.
