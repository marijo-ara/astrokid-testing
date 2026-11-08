import type { Page, Route } from '@playwright/test';
import { qaIdentityEmail } from '../config/qaTestAccounts';

/**
 * Stubbed backend for the parent AI-consent card. The real rules run against QA in
 * API.Tests/Coppa/CoppaTests.cs (COPPA_18_*, COPPA_19_*); here only the UI contract is under test.
 */

export const PREMIUM_PARENT = {
  email: qaIdentityEmail('familia_premium'),
  name: 'UI Premium Parent',
  familyId: 'a1b2c3d4-e5f6-4789-a012-3456789abc18',
  parentId: 'c3d4e5f6-a7b8-4901-c234-567890abc018',
  child: {
    id: 'b2c3d4e5-f6a7-4890-b123-456789abc018',
    name: 'UI Child',
    age: 8,
    birthdate: '2018-01-01',
    avatarId: 'astro-1',
    interests: ['space'],
  },
} as const;

export const AI_NOTICE_VERSION = '2026-10-15';

export type AiDecisionCall = { url: string; body: Record<string, unknown> };

export type AiConsentBackend = {
  /** premium-activate calls the card sent, in order. */
  decisions: AiDecisionCall[];
  /** One-time US$0.50 checkout calls; Premium paid by card must never open one. */
  checkouts: string[];
};

function premiumStatus(active: boolean) {
  return {
    child_id: PREMIUM_PARENT.child.id,
    plan: 'premium',
    verification: 'premium_subscription',
    available: true,
    unavailable_reason: null,
    active,
    opted_out: false,
    school_name: null,
    status: active ? 'active' : 'off',
    activated_at: active ? new Date().toISOString() : null,
    refunded: false,
    amount_cents: 50,
    currency: 'usd',
    refund_after_verification: true,
    notice: {
      version: AI_NOTICE_VERSION,
      what: 'Qué sale: la escena de la misión, el tema, el formato, la franja de edad y un interés.',
      not_sent: 'No sale: el nombre, la fecha de nacimiento, la voz ni lo que escribe.',
      to_whom: 'A quién: xAI.',
      why: 'Para qué: adaptar la escena.',
      training: 'xAI no entrena con estos datos.',
      retention: 'Retención cero.',
      charge: 'Cómo se verifica: su suscripción Premium pagada con tarjeta. No hay cargo adicional.',
      revoke: 'Puede apagarlo cuando quiera.',
      without: 'Sin activarlo, las misiones siguen funcionando.',
    },
  };
}

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** Parent session plus the family endpoints the dashboard reads on load. */
export async function seedPremiumParent(page: Page) {
  const { email, name, familyId, parentId, child } = PREMIUM_PARENT;
  const createdAt = new Date().toISOString();
  const familyData = {
    id: familyId,
    parentName: name,
    parentEmail: email,
    children: [{ ...child, createdAt }],
    currentChildId: child.id,
  };

  await page.addInitScript(({ email, name, familyData }) => {
    if (sessionStorage.getItem('__AK_TEST_SEEDED__') === '1') return;
    sessionStorage.setItem('__AK_TEST_SEEDED__', '1');
    localStorage.clear();
    localStorage.setItem('__PLAYWRIGHT_E2E__', '1');
    localStorage.setItem('user', JSON.stringify({ name, email }));
    localStorage.setItem('ak_access_token', `mock-access-token-${email}`);
    localStorage.setItem(`familyProfile:${email}`, JSON.stringify(familyData));
  }, { email, name, familyData });

  await page.route(`**/family-profiles/by-email/${encodeURIComponent(email)}*`, (route) =>
    json(route, 200, {
      id: familyId,
      parent: { id: parentId, parent_name: name, parent_email: email, created_at: createdAt, updated_at: createdAt },
      children: [{ ...child, created_at: createdAt, updated_at: createdAt }],
      created_at: createdAt,
      updated_at: createdAt,
    })
  );
  await page.route('**/family-profiles/parental-consent/email-plus*', (route) => json(route, 200, { status: 'confirmed' }));
  await page.route('**/mission-progress/**', (route) => json(route, 200, {}));
  await page.route('**/billing/premium/status*', (route) => json(route, 200, { premium: true, source: 'premium_stripe' }));
}

/**
 * Serves /ai-consent like the backend for a family on Premium paid by card:
 * off until premium-activate arrives with accepted=true.
 */
export async function mockAiConsentBackend(page: Page): Promise<AiConsentBackend> {
  const backend: AiConsentBackend = { decisions: [], checkouts: [] };
  let active = false;

  await page.route('**/ai-consent/children/**', async (route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === 'POST' && url.includes('/premium-activate')) {
      const body = (request.postDataJSON() ?? {}) as Record<string, unknown>;
      backend.decisions.push({ url, body });
      if (body.accepted !== true) return json(route, 400, { detail: 'AI_NOTICE_NOT_ACCEPTED' });
      active = true;
      return json(route, 200, { ok: true, active: true });
    }
    if (request.method() === 'POST' && url.includes('/checkout')) {
      backend.checkouts.push(url);
      return json(route, 500, { detail: 'unexpected checkout' });
    }
    return json(route, 200, premiumStatus(active));
  });

  return backend;
}
