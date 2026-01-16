import { Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration from environment
export const AI_TEST_MODE = process.env.AI_TEST_MODE || 'mock';
export const isLiveMode = AI_TEST_MODE === 'live';
export const isMockMode = AI_TEST_MODE === 'mock';
export const shouldRecordHAR = process.env.RECORD_HAR === 'true';

// Paths for HAR files
const FIXTURES_DIR = path.join(__dirname, '../fixtures/ai-responses');
const AI_HAR_PATH = path.join(FIXTURES_DIR, 'ai-api.har');

// Timeouts based on mode
export const AI_RESPONSE_TIMEOUT = isMockMode ? 10000 : 120000;
export const AI_TEST_TIMEOUT = isMockMode ? 30000 : 180000;

/**
 * Setup AI API mocking for a page.
 * - In mock mode: Uses recorded HAR responses
 * - In live mode with RECORD_HAR=true: Records new responses
 * - In live mode without recording: Passes through to real API
 */
export async function setupAIMocking(page: Page): Promise<void> {
  const harExists = fs.existsSync(AI_HAR_PATH);

  if (isMockMode) {
    if (!harExists) {
      console.warn(
        `⚠️ AI mock HAR file not found at ${AI_HAR_PATH}. ` +
        `Run with AI_TEST_MODE=live RECORD_HAR=true to generate it.`
      );
      // Create a minimal mock for missing HAR
      await setupFallbackMocks(page);
      return;
    }

    await page.routeFromHAR(AI_HAR_PATH, {
      url: '**/api/ai/**',
      update: false,
    });
    console.log('🎭 AI tests running in MOCK mode');
  } else if (isLiveMode && shouldRecordHAR) {
    // Ensure directory exists
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }

    await page.routeFromHAR(AI_HAR_PATH, {
      url: '**/api/ai/**',
      update: true,
    });
    console.log('📹 AI tests running in LIVE mode (RECORDING)');
  } else {
    // Live mode without recording - requests pass through
    console.log('🔴 AI tests running in LIVE mode');
  }
}

/**
 * Fallback mock responses when HAR file doesn't exist.
 * Provides minimal responses to prevent test crashes.
 */
async function setupFallbackMocks(page: Page): Promise<void> {
  // Mock the AI query endpoint
  await page.route('**/api/ai/query', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();

    // Generate a simple mock response matching the API format
    // Note: API returns { message: string, suggestions: string[] }
    const mockResponse = {
      message: `This is a mock AI response for: "${postData?.message || 'your question'}". ` +
        `Run tests with AI_TEST_MODE=live to get real responses.`,
      suggestions: [
        'What other books do you recommend?',
        'Tell me more about this topic',
        'What are the key themes?'
      ]
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse),
    });
  });

  // Mock the AI clear endpoint
  await page.route('**/api/ai/clear', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  console.log('🔶 Using FALLBACK mock responses (no HAR file)');
}

/**
 * Get the appropriate timeout for AI-dependent operations.
 */
export function getAITimeout(operationType: 'response' | 'test' = 'response'): number {
  return operationType === 'test' ? AI_TEST_TIMEOUT : AI_RESPONSE_TIMEOUT;
}

/**
 * Log the current AI test mode for debugging.
 */
export function logAITestMode(): void {
  const modeEmoji = isMockMode ? '🎭' : '🔴';
  const modeText = isMockMode ? 'MOCK' : 'LIVE';
  const recordingText = shouldRecordHAR ? ' (Recording)' : '';
  console.log(`${modeEmoji} AI Test Mode: ${modeText}${recordingText}`);
}
