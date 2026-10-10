import { EnvironmentConfig } from './environments';

export interface LoginCredentials {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginBehavior {
  type: 'mock' | 'firebase' | 'oauth';
  credentials: LoginCredentials[];
  googleEnabled: boolean;
  emailEnabled: boolean;
  mockUser?: {
    uid: string;
    email: string;
    displayName: string;
  };
  firebaseConfig?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
}

// Real accounts come from pipeline secrets, never from this file.
const envCredentials = (displayName: string): LoginCredentials[] =>
  process.env.ASTROKID_UI_EMAIL && process.env.ASTROKID_UI_PASSWORD
    ? [{ email: process.env.ASTROKID_UI_EMAIL, password: process.env.ASTROKID_UI_PASSWORD, displayName }]
    : [];

export const getLoginBehavior = (env: EnvironmentConfig): LoginBehavior => {
  switch (env.name) {
    case 'Localhost Development':
      return {
        type: 'mock',
        credentials: [
          { email: 'dev@astrokid.com', password: 'dev123', displayName: 'Dev User' },
          { email: 'test@astrokid.com', password: 'test123', displayName: 'Test User' }
        ],
        googleEnabled: true,
        emailEnabled: true,
        mockUser: {
          uid: 'dev-user-123',
          email: 'dev@astrokid.com',
          displayName: 'Usuario de Desarrollo'
        }
      };

    case 'Development Environment':
      return {
        type: 'firebase',
        credentials: envCredentials('Dev User'),
        googleEnabled: true,
        emailEnabled: true,
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY_DEV || 'dev-api-key',
          authDomain: 'astrokid-dev.firebaseapp.com',
          projectId: 'astrokid-dev'
        }
      };

    case 'QA Environment':
      return {
        type: 'firebase',
        credentials: envCredentials('QA User'),
        googleEnabled: false,
        emailEnabled: true,
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY_QA || 'qa-api-key',
          authDomain: 'astrokid-qa.firebaseapp.com',
          projectId: 'astrokid-qa'
        }
      };

    case 'Staging Environment':
      return {
        type: 'firebase',
        credentials: envCredentials('Staging User'),
        googleEnabled: true,
        emailEnabled: true,
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY_STAGING || 'staging-api-key',
          authDomain: 'astrokid-staging.firebaseapp.com',
          projectId: 'astrokid-staging'
        }
      };

    case 'Production Environment':
      return {
        type: 'firebase',
        credentials: envCredentials('Production User'),
        googleEnabled: true,
        emailEnabled: true,
        firebaseConfig: {
          apiKey: process.env.FIREBASE_API_KEY_PROD || 'prod-api-key',
          authDomain: 'astrokid-prod.firebaseapp.com',
          projectId: 'astrokid-prod'
        }
      };

    default:
      throw new Error(`Unknown environment: ${env.name}`);
  }
};

export const getTestCredentials = (env: EnvironmentConfig): LoginCredentials => {
  const behavior = getLoginBehavior(env);
  if (behavior.credentials.length === 0) {
    throw new Error(`Set ASTROKID_UI_EMAIL and ASTROKID_UI_PASSWORD to log in on ${env.name}.`);
  }
  return behavior.credentials[0];
};

export const isGoogleLoginEnabled = (env: EnvironmentConfig): boolean => {
  const behavior = getLoginBehavior(env);
  return behavior.googleEnabled;
};

export const isEmailLoginEnabled = (env: EnvironmentConfig): boolean => {
  const behavior = getLoginBehavior(env);
  return behavior.emailEnabled;
};
