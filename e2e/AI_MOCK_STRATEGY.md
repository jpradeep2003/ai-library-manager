# AI Test Mock Strategy

## Problem

AI-dependent E2E tests are inherently flaky due to:
- External API rate limits and throttling
- Variable response times (5-150+ seconds)
- API availability/uptime issues
- Cost of running tests frequently

## Strategy: Dual-Mode Testing (Mock/Live)

### Mode 1: Mock Mode (Default)
- **Purpose**: Fast, reliable, cost-effective CI/CD validation
- **How**: Use pre-recorded responses via Playwright's HAR files
- **When**: Default for all test runs, PR checks, local development

### Mode 2: Live Mode (On-Demand)
- **Purpose**: Verify actual AI integration, generate/update mock data
- **How**: Hit real AI API endpoints
- **When**: Pre-production validation, scheduled nightly runs, mock data refresh

## Implementation Plan

### Phase 1: Infrastructure Setup

1. **Create HAR directory structure**
   ```
   e2e/
   ├── fixtures/
   │   └── ai-responses/
   │       ├── library-questions.har
   │       ├── book-questions.har
   │       └── recommendations.har
   ```

2. **Add environment variable toggle**
   ```typescript
   // e2e/config/test-mode.ts
   export const AI_TEST_MODE = process.env.AI_TEST_MODE || 'mock';
   export const isLiveMode = AI_TEST_MODE === 'live';
   export const isMockMode = AI_TEST_MODE === 'mock';
   ```

3. **Create mock helper utility**
   ```typescript
   // e2e/helpers/ai-mock.ts
   export async function setupAIMocks(page: Page) {
     if (isMockMode) {
       await page.routeFromHAR('e2e/fixtures/ai-responses/ai-api.har', {
         url: '**/api/ai/**',
         update: false,
       });
     }
   }

   export async function recordAIResponses(page: Page) {
     if (isLiveMode) {
       await page.routeFromHAR('e2e/fixtures/ai-responses/ai-api.har', {
         url: '**/api/ai/**',
         update: true, // Record new responses
       });
     }
   }
   ```

### Phase 2: Test File Updates

1. **Update fixture to conditionally mock**
   ```typescript
   // In fixtures.ts beforeEach
   if (isMockMode) {
     await setupAIMocks(page);
   }
   ```

2. **Tag AI tests appropriately**
   ```typescript
   test.describe('AI Chat @ai-dependent', () => {
     test('should receive AI response', async ({ libraryPage }) => {
       // Test runs with mock or live based on mode
     });
   });
   ```

3. **Remove skip annotations from AI tests**
   - Tests will pass reliably in mock mode
   - Tests will run against real API in live mode

### Phase 3: npm Scripts & CI Integration

1. **Add npm scripts**
   ```json
   {
     "scripts": {
       "test:e2e": "AI_TEST_MODE=mock playwright test",
       "test:e2e:live": "AI_TEST_MODE=live playwright test",
       "test:e2e:record": "AI_TEST_MODE=live playwright test --update-snapshots",
       "test:e2e:ai-only": "AI_TEST_MODE=mock playwright test --grep @ai-dependent"
     }
   }
   ```

2. **CI Pipeline Configuration**
   ```yaml
   # .github/workflows/test.yml
   jobs:
     e2e-tests:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: npm ci
         - run: npm run test:e2e  # Uses mock mode by default

     e2e-live-validation:
       runs-on: ubuntu-latest
       if: github.ref == 'refs/heads/main'  # Only on main branch
       steps:
         - uses: actions/checkout@v4
         - run: npm ci
         - run: npm run test:e2e:live
       env:
         ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

### Phase 4: Mock Data Management

1. **Initial Recording**
   ```bash
   # Run once to capture real responses
   AI_TEST_MODE=live npm run test:e2e -- --grep @ai-dependent
   ```

2. **Mock Refresh Schedule**
   - Weekly automated job to refresh HAR files
   - Manual refresh when AI behavior changes
   - Version control HAR files for reproducibility

3. **Mock Validation**
   - Periodic live runs to verify mocks are still representative
   - Alert if live tests fail but mock tests pass

## File Changes Required

### 1. Create `e2e/helpers/ai-mock.ts`
```typescript
import { Page } from '@playwright/test';
import * as path from 'path';

export const AI_TEST_MODE = process.env.AI_TEST_MODE || 'mock';
export const isLiveMode = AI_TEST_MODE === 'live';
export const isMockMode = AI_TEST_MODE === 'mock';

const HAR_PATH = path.join(__dirname, '../fixtures/ai-responses/ai-api.har');

export async function setupAIMocking(page: Page) {
  if (isMockMode) {
    await page.routeFromHAR(HAR_PATH, {
      url: '**/api/ai/**',
      update: false,
    });
  } else if (isLiveMode && process.env.RECORD_HAR === 'true') {
    await page.routeFromHAR(HAR_PATH, {
      url: '**/api/ai/**',
      update: true,
    });
  }
  // In live mode without recording, requests go through normally
}
```

### 2. Update `e2e/fixtures.ts`
```typescript
import { setupAIMocking, AI_TEST_MODE } from './helpers/ai-mock';

// In test.beforeEach or fixture setup:
await setupAIMocking(page);

// Log mode for debugging
console.log(`Running AI tests in ${AI_TEST_MODE} mode`);
```

### 3. Update AI test files
- Remove `test.skip()` annotations
- Add `@ai-dependent` tags to test descriptions
- Adjust timeouts based on mode:
  ```typescript
  const AI_TIMEOUT = isMockMode ? 5000 : 90000;
  ```

### 4. Create HAR directory
```bash
mkdir -p e2e/fixtures/ai-responses
```

## Benefits

| Aspect | Mock Mode | Live Mode |
|--------|-----------|-----------|
| Speed | ~1-2s per test | 5-90s per test |
| Reliability | 100% deterministic | Variable |
| Cost | $0 | API costs |
| Coverage | High (all tests run) | High (validates real behavior) |
| CI Suitability | Excellent | Scheduled/pre-release only |

## Best Practices

1. **Don't test the AI provider** - Test YOUR app's handling of AI responses
2. **Mock at the network layer** - Use `page.route()` not service stubs
3. **Keep mocks realistic** - Record from real API, don't fabricate
4. **Version control HAR files** - Treat as test fixtures
5. **Refresh mocks periodically** - AI responses evolve
6. **Test error scenarios** - Include 429, 500, timeout mocks

## References

- [Playwright Mock APIs Documentation](https://playwright.dev/docs/mock)
- [BrowserStack Playwright Mocking Guide](https://www.browserstack.com/guide/how-to-mock-api-with-playwright)
- [Mocking External Systems in E2E Tests](https://madewithlove.com/blog/mocking-external-systems-in-e2e-tests/)
