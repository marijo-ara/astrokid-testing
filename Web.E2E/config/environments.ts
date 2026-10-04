export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  apiURL?: string;
  loginBehavior: 'mock' | 'firebase' | 'oauth';
  authProvider?: 'google' | 'email' | 'both';
  mockData?: boolean;
  timeout: number;
  retries: number;
  headless: boolean;
  slowMo?: number;
}

export const environments: Record<string, EnvironmentConfig> = {
  localhost: {
    name: 'Localhost Development',
    baseURL: 'http://localhost:3000',
    apiURL: 'http://localhost:8000',
    loginBehavior: 'mock',
    authProvider: 'both',
    mockData: true,
    timeout: 30000,
    retries: 2,
    headless: false,
    slowMo: 100
  },
  dev: {
    name: 'Development Environment',
    baseURL: 'https://astro-kid-web-dev.vercel.app',
    apiURL: 'https://api-dev.astrokid.com',
    loginBehavior: 'firebase',
    authProvider: 'both',
    mockData: false,
    timeout: 30000,
    retries: 1,
    headless: true,
    slowMo: 0
  },
  qa: {
    name: 'QA Environment',
    baseURL: 'https://astro-kid-web-qa.vercel.app',
    apiURL: 'https://api-qa.astrokid.com',
    loginBehavior: 'firebase',
    authProvider: 'email',
    mockData: false,
    timeout: 60000,
    retries: 3,
    headless: true,
    slowMo: 0
  },
  staging: {
    name: 'Staging Environment',
    baseURL: 'https://staging.astrokid.com',
    apiURL: 'https://api-staging.astrokid.com',
    loginBehavior: 'firebase',
    authProvider: 'both',
    mockData: false,
    timeout: 60000,
    retries: 2,
    headless: true,
    slowMo: 0
  },
  prod: {
    name: 'Production Environment',
    baseURL: 'https://astrokid.io',
    apiURL: 'https://api.astrokid.com',
    loginBehavior: 'firebase',
    authProvider: 'both',
    mockData: false,
    timeout: 90000,
    retries: 1,
    headless: true,
    slowMo: 0
  }
};

export const getEnvironment = (env: string = 'localhost'): EnvironmentConfig => {
  const config = environments[env];
  if (!config) {
    throw new Error(`Environment '${env}' not found. Available environments: ${Object.keys(environments).join(', ')}`);
  }
  return config;
};

export const getCurrentEnvironment = (): EnvironmentConfig => {
  const env = process.env.PLAYWRIGHT_ENV || 'localhost';
  const config = getEnvironment(env);
  return {
    ...config,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || config.baseURL,
    apiURL: process.env.ASTROKID_BASE_URL || config.apiURL,
  };
};
