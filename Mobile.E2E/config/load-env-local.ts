import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Loads KEY=value from Mobile.E2E/.env.local (gitignored).
 * A variable already set in the process wins (CI / shell).
 */
export function loadEnvLocal(filePath?: string): void {
  const resolved =
    filePath ?? path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(resolved)) return

  const text = fs.readFileSync(resolved, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const eq = line.indexOf('=')
    if (eq <= 0) continue

    const key = line.slice(0, eq).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

    const existing = process.env[key]
    if (existing !== undefined && existing !== '') continue

    let value = line.slice(eq + 1).trim()
    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    if (quoted) value = value.slice(1, -1)

    process.env[key] = value
  }
}
