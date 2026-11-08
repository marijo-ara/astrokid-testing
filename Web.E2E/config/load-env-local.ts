import fs from 'fs';

/**
 * Loads KEY=value lines from .env.local.
 * A variable already set in the process is left as-is, so CI and the shell win.
 */
export function loadEnvLocal(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    // Empty string in the shell blocks .env.local unless we treat "" as unset (common IDE quirk).
    const existing = process.env[key];
    if (existing !== undefined && existing !== '') continue;

    let value = line.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2);
    if (quoted) value = value.slice(1, -1);

    process.env[key] = value;
  }
}
