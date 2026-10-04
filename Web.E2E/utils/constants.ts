export const TEST_CONSTANTS = {
  BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  TIMEOUTS: {
    SHORT: 5000,
    MEDIUM: 10000,
    LONG: 30000,
    VERY_LONG: 60000
  },
  TEST_DATA: {
    DEFAULT_USER: {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    },
    DEFAULT_FAMILY: {
      id: 'a1b2c3d4-e5f6-4789-a012-3456789abcde',
      parentName: 'María García',
      parentEmail: 'maria.garcia@example.com',
      children: [
        {
          id: 'b2c3d4e5-f6a7-4890-b123-456789abcdef0',
          name: 'Test Child',
          age: 7,
          birthdate: '2017-01-01',
          avatarId: 'astro-1',
          interests: ['Educación emocional'],
          createdAt: new Date().toISOString()
        }
      ],
      currentChildId: 'b2c3d4e5-f6a7-4890-b123-456789abcdef0'
    },
    SPACE_AGENTS: [
      {
        name: "Capitán Empatía",
        title: "Inteligencia emocional",
        description: "Reconoce emociones, desarrolla empatía y fortalece la amistad",
        icon: "Heart",
        color: "bg-red-500",
        hoverColor: "hover:bg-red-600",
        progress: 50
      },
      {
        name: "Comandante Finanzas",
        title: "Habilidades para la vida",
        description: "Aprende responsabilidad, ahorro y decisiones conscientes con el dinero",
        icon: "Rocket",
        color: "bg-green-500",
        hoverColor: "hover:bg-green-600",
        progress: 0
      }
    ]
  },
  SELECTORS: {
    ERROR_MESSAGES: [
      'text=/This page could not be found/i',
      'text=/Internal Server Error/i',
      'text=/Application error/i',
      'text=/Unhandled Runtime Error/i',
      'role=heading[name=/^(404|500|Error)$/i]',
    ],
    LOADING_INDICATORS: [
      '[class*="loading"]',
      '[class*="spinner"]',
      '[class*="skeleton"]'
    ]
  },
  PERFORMANCE: {
    MAX_LOAD_TIME: 3000,
    MAX_FIRST_PAINT: 1000,
    MAX_FIRST_CONTENTFUL_PAINT: 1500
  }
} as const;

export const TEST_ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
} as const;

export const TEST_TAGS = {
  SMOKE: '@smoke',
  REGRESSION: '@regression',
  E2E: '@e2e',
  ACCESSIBILITY: '@accessibility',
  PERFORMANCE: '@performance',
  CRITICAL: '@critical'
} as const;
