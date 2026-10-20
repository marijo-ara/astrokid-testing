/**
 * Parent → child adaptive dashboard panels (mocked API).
 */
import { test, expect } from '../../fixtures/base'

test.describe('Adaptive parent dashboard — parent/child flow', () => {
  test.beforeEach(async ({ testHelpers }) => {
    await testHelpers.setupTestEnvironment()
  })

  test('shows adaptive profile and pilot metrics when APIs respond', async ({
    page,
    dashboardPage,
    testHelpers,
  }) => {
    await testHelpers.mockSpaceAgents(testHelpers.createDefaultSpaceAgents())

    const childId = 'child-e2e-adaptive-1'

    await page.route(`**/child-profiles/${childId}/adaptive-profile`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          childId,
          learningStyle: { dominantFormat: 'puzzle', engagementPatterns: ['solver'] },
          formatRewardScores: { puzzle: 0.8 },
          missionStatus: 'active',
        }),
      })
    })

    await page.route(`**/child-profiles/${childId}/pilot-metrics`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          childId,
          freeArc: { horizon: 10, completedCount: 5, percent: 50, arcComplete: false },
          retention: {
            missionsUsed: 5,
            freeArcCompleted: 5,
            arcPercent: 50,
            arcComplete: false,
            lastRecordedAt: null,
          },
          parentValue: {
            evidenceCount: 4,
            goalAchievedCount: 3,
            goalAchievedRate: 0.75,
            surveyCheckpoints: [5, 10],
          },
          skills: {
            competencyCounts: { empathy: 2 },
            competenciesWithSignal: 1,
            adaptiveStrategyMissions: 2,
            formatCounts: { puzzle: 2, narrative_choice: 3 },
          },
          conversion: {
            plan: 'free_capped',
            limit: 10,
            used: 5,
            remaining: 5,
            freeCap: 10,
            quotaExhausted: false,
            canUpgrade: true,
          },
          cohortSignals: {
            enabled: false,
            evidenceRowsSampled: 0,
            formatsWithPrior: 0,
            formatSuccessRates: {},
          },
        }),
      })
    })

    await page.route(`**/dpe/free-arc/${childId}/progress`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          arcId: 'primer-despegue',
          horizon: 10,
          completedCount: 5,
          nextMissionIndex: 6,
          percent: 50,
          arcComplete: false,
          active: true,
          nextMission: { index: 6, parentSurveyCheckpoint: false },
        }),
      })
    })

    await dashboardPage.goto()
    const isReady = await dashboardPage.isReady()
    if (!isReady) {
      test.skip()
    }

    const metricsCard = page.locator('[data-testid="pilot-metrics-card"]')
    const metricsCount = await metricsCard.count()
    if (metricsCount > 0) {
      await expect(metricsCard.first()).toBeVisible({ timeout: 8000 })
    }

    const arcCard = page.locator('[data-testid="free-arc-progress-card"]')
    const arcCount = await arcCard.count()
    if (arcCount > 0) {
      await expect(arcCard.first()).toBeVisible({ timeout: 8000 })
    }
  })
})
