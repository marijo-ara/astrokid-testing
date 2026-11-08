import path from 'path';

/** Cookies saved by global setup after unlocking Vercel password protection (git-ignored). */
export const VERCEL_PASSWORD_STATE = path.join(__dirname, '..', '.auth', 'vercel-password.json');
