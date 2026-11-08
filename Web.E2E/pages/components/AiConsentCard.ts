import { Locator, expect } from '@playwright/test';

/**
 * "Misiones con IA" card on the parent dashboard (AiMissionsConsentCard in astro-kid-web).
 * Scoped to one card root so the page object never mixes two rendered copies.
 */
export class AiConsentCard {
  readonly $root: Locator;
  readonly $switch: Locator;
  readonly $status: Locator;
  readonly $notice: Locator;
  readonly $acceptCheckbox: Locator;
  readonly $activateWithPremiumButton: Locator;

  constructor(root: Locator) {
    this.$root = root;
    this.$switch = root.getByRole('switch', { name: /Misiones con IA para|AI missions for/ });
    this.$status = root.locator('[aria-live="polite"]');
    this.$notice = root.locator('#ai-missions-consent-notice');
    this.$acceptCheckbox = this.$notice.getByRole('checkbox');
    this.$activateWithPremiumButton = this.$notice.getByRole('button', {
      name: /Activar con mi Premium|Turn on with my Premium/,
    });
  }

  async openNotice() {
    await expect(this.$switch).toBeEnabled();
    await this.$switch.click();
    await expect(this.$notice).toBeVisible();
  }

  async closeNotice() {
    await this.$switch.click();
    await expect(this.$notice).toBeHidden();
  }

  async acceptNotice() {
    await this.$acceptCheckbox.check();
  }

  async activateWithPremium() {
    await this.$activateWithPremiumButton.click();
  }

  async expectOff() {
    await expect(this.$switch).toHaveAttribute('aria-checked', 'false');
    await expect(this.$status).toContainText(/Apagado|\bOff\b/);
  }

  async expectOn() {
    await expect(this.$switch).toHaveAttribute('aria-checked', 'true');
    await expect(this.$status).toContainText(/Activado|\bOn\b/);
  }

  async expectNoExtraChargeNotice() {
    await expect(this.$notice).toContainText(/No hay cargo adicional|There is no extra charge/);
  }
}
