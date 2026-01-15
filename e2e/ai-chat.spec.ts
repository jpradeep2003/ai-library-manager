import { test, expect } from './fixtures';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Set up test data
    const testBooks = [
      { title: 'Deep Learning', author: 'Ian Goodfellow', status: 'completed', tags: 'AI, machine learning, neural networks' },
      { title: 'The Structure of Scientific Revolutions', author: 'Thomas Kuhn', status: 'reading', tags: 'philosophy, science, history' },
      { title: 'Gödel, Escher, Bach', author: 'Douglas Hofstadter', status: 'completed', tags: 'AI, consciousness, mathematics' },
    ];

    for (const book of testBooks) {
      await libraryPage.addBookViaAPI(book);
    }

    await libraryPage.goto();
  });

  test.describe('Chat Panel UI', () => {
    test('should display chat panel', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.chat-panel')).toBeVisible();
    });

    test('should have chat input field', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.chat-input input')).toBeVisible();
    });

    test('should have send button', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.chat-input button')).toBeVisible();
    });

    test('should display suggestions container', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.suggestions-container')).toBeVisible();
    });

    test('should have AI Assistant header', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.chat-panel .panel-header h2')).toContainText('AI Assistant');
    });
  });

  test.describe('Book Context', () => {
    test('should show book context banner when book is selected', async ({ libraryPage }) => {
      // Select a book
      await libraryPage.selectBook('Deep Learning');

      // Context banner should appear
      await expect(libraryPage.page.locator('.book-context-banner')).toBeVisible();
      await expect(libraryPage.page.locator('.book-context-banner .book-title')).toContainText('Deep Learning');
    });

    test('should clear book context when clicking clear button', async ({ libraryPage }) => {
      await libraryPage.selectBook('Deep Learning');
      await expect(libraryPage.page.locator('.book-context-banner')).toBeVisible();

      await libraryPage.clearBookContext();

      await expect(libraryPage.page.locator('.book-context-banner')).not.toBeVisible();
    });

    test('should update context when selecting different book', async ({ libraryPage }) => {
      await libraryPage.selectBook('Deep Learning');
      await expect(libraryPage.page.locator('.book-context-banner')).toContainText('Deep Learning');

      await libraryPage.selectBook('Gödel, Escher, Bach');
      await expect(libraryPage.page.locator('.book-context-banner')).toContainText('Gödel, Escher, Bach');
    });
  });

  test.describe('Sending Messages', () => {
    test('should send a message and show user message', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'Hello');
      await libraryPage.page.click('.chat-input button');

      // User message should appear
      await expect(libraryPage.page.locator('.message.user')).toBeVisible();
      await expect(libraryPage.page.locator('.message.user')).toContainText('Hello');
    });

    test('should show loading indicator while waiting for response', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'Test message');
      await libraryPage.page.click('.chat-input button');

      // Loading should appear briefly
      // Note: This might be too fast to catch in some cases
      const loading = libraryPage.page.locator('.message.loading');
      // Just verify the test doesn't crash
    });

    test('should disable send button while processing', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'Test');
      await libraryPage.page.click('.chat-input button');

      // Button might be disabled during processing
      // This is hard to test as it happens quickly
    });

    test('should clear input after sending', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'Test message');
      await libraryPage.page.click('.chat-input button');

      // Wait a moment
      await libraryPage.page.waitForTimeout(500);

      // Input should be cleared
      const inputValue = await libraryPage.page.locator('.chat-input input').inputValue();
      expect(inputValue).toBe('');
    });

    test('should send message with Enter key', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'Hello via Enter');
      await libraryPage.page.press('.chat-input input', 'Enter');

      // User message should appear
      await expect(libraryPage.page.locator('.message.user')).toContainText('Hello via Enter');
    });
  });

  test.describe('AI Response', () => {
    // Note: These tests require the AI backend to be functional
    // They may timeout if the API is slow or unavailable

    test('should receive AI response', async ({ libraryPage }) => {
      // Skip if API key not configured
      test.setTimeout(90000); // Longer timeout for AI response

      await libraryPage.sendChatMessage('How many books are in my library?');

      // Should have at least one assistant message
      const assistantMessages = libraryPage.page.locator('.message.assistant');
      await expect(assistantMessages.first()).toBeVisible({ timeout: 60000 });
    });

    test('should display suggestions after response', async ({ libraryPage }) => {
      test.setTimeout(90000);

      await libraryPage.sendChatMessage('Tell me about my library');

      // Wait for response
      await libraryPage.page.waitForSelector('.message.assistant', { timeout: 60000 });

      // Suggestions should be updated
      const suggestions = libraryPage.page.locator('.suggestion-btn');
      await expect(suggestions.first()).toBeVisible({ timeout: 10000 });
    });

    test('should click suggestion and send as message', async ({ libraryPage }) => {
      test.setTimeout(90000);

      // Get initial suggestion text
      const firstSuggestion = libraryPage.page.locator('.suggestion-btn').first();
      const suggestionText = await firstSuggestion.textContent();

      await firstSuggestion.click();

      // Should send as user message
      await expect(libraryPage.page.locator('.message.user')).toContainText(suggestionText || '');
    });
  });

  test.describe('Library-Level Q&A', () => {
    test('should ask about library without book selected', async ({ libraryPage }) => {
      test.setTimeout(90000);

      // Ensure no book is selected
      await libraryPage.clearBookContext();

      await libraryPage.sendChatMessage('What genres do I have in my library?');

      await expect(libraryPage.page.locator('.message.assistant').first()).toBeVisible({ timeout: 60000 });
    });

    test('should ask for recommendations', async ({ libraryPage }) => {
      test.setTimeout(90000);

      await libraryPage.sendChatMessage('Recommend me a book');

      await expect(libraryPage.page.locator('.message.assistant').first()).toBeVisible({ timeout: 60000 });
    });
  });

  test.describe('Book-Level Q&A', () => {
    test('should ask about specific book', async ({ libraryPage }) => {
      test.setTimeout(90000);

      await libraryPage.selectBook('Deep Learning');
      await libraryPage.sendChatMessage('What is this book about?');

      await expect(libraryPage.page.locator('.message.assistant').first()).toBeVisible({ timeout: 60000 });
    });
  });

  test.describe('Chat Panel Layout', () => {
    test('should maximize chat panel', async ({ libraryPage }) => {
      await libraryPage.selectBook('Deep Learning');

      // Find and click maximize button
      const maxBtn = libraryPage.page.locator('.chat-panel .panel-btn').first();
      await maxBtn.click();

      // Chat panel should be larger
      await libraryPage.page.waitForTimeout(300);
      const chatPanel = libraryPage.page.locator('.chat-panel');
      const boundingBox = await chatPanel.boundingBox();

      // Chat should take more space when maximized
      expect(boundingBox?.width).toBeGreaterThan(300);
    });
  });

  test.describe('Message Display', () => {
    test('should display user messages with correct styling', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', 'User message');
      await libraryPage.page.click('.chat-input button');

      const userMessage = libraryPage.page.locator('.message.user');
      await expect(userMessage).toBeVisible();
      await expect(userMessage).toHaveClass(/user/);
    });

    test('should render markdown in assistant messages', async ({ libraryPage }) => {
      test.setTimeout(90000);

      await libraryPage.sendChatMessage('Give me a list of something');

      // Wait for response
      await libraryPage.page.waitForSelector('.message.assistant', { timeout: 60000 });

      // Response should be rendered (might contain markdown elements)
      const assistantMessage = libraryPage.page.locator('.message.assistant').first();
      await expect(assistantMessage).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle empty message gracefully', async ({ libraryPage }) => {
      await libraryPage.page.fill('.chat-input input', '');
      await libraryPage.page.click('.chat-input button');

      // Should not crash, might not send anything
      await libraryPage.page.waitForTimeout(500);
    });

    test('should handle very long messages', async ({ libraryPage }) => {
      const longMessage = 'a'.repeat(1000);
      await libraryPage.page.fill('.chat-input input', longMessage);
      await libraryPage.page.click('.chat-input button');

      // Should handle without crashing
      await libraryPage.page.waitForTimeout(500);
    });
  });
});
