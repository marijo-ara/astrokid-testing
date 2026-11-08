import { test as base, expect } from '@playwright/test'
import { ensureVercelProtectionOnContext } from './vercelProtectionHeaders'

/**
 * Bypass de Vercel solo en el baseURL (nunca en identitytoolkit.googleapis.com).
 * Usar en specs con login Firebase real si no pasan por provisioningAuth.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    await ensureVercelProtectionOnContext(context)
    await use(context)
  },
})

export { expect }
