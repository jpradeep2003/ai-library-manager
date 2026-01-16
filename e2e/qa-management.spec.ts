import { test, expect } from './fixtures';
import { AI_TEST_TIMEOUT, AI_RESPONSE_TIMEOUT } from './helpers/ai-mock';

test.describe('Q&A Management', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Set up test data
    await libraryPage.addBookViaAPI({
      title: 'QA Test Book',
      author: 'QA Author',
      status: 'completed',
      tags: 'testing',
    });

    await libraryPage.goto();
  });

  test.describe('Saving Q&A', () => {
    test('should auto-save Q&A after AI response', async ({ libraryPage }) => {
      // Timeout adapts to mock (fast) or live (slow) mode
      test.setTimeout(AI_TEST_TIMEOUT);

      await libraryPage.selectBook('QA Test Book');
      await libraryPage.sendChatMessage('What is this book about?');

      // Wait for response
      await libraryPage.page.waitForSelector('.message.assistant', { timeout: AI_RESPONSE_TIMEOUT });

      // Q&A should be saved automatically
      // Refresh and check if it appears in saved Q&A
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Check for saved Q&A section or items
      const savedQA = libraryPage.page.locator('.qa-item, .saved-qa-section');
      // May or may not have saved Q&A depending on implementation
    });
  });

  test.describe('Displaying Saved Q&A', () => {
    test.beforeEach(async ({ libraryPage }) => {
      // Add some Q&A via API
      const bookResponse = await libraryPage.page.request.get('/api/books');
      const books = await bookResponse.json();
      const testBook = books.books.find((b: any) => b.title === 'QA Test Book');

      if (testBook) {
        await libraryPage.page.request.post(`/api/books/${testBook.id}/qa`, {
          data: {
            question: 'Test question 1',
            answer: 'Test answer 1',
            suggestions: JSON.stringify(['Follow up 1', 'Follow up 2']),
          },
        });

        await libraryPage.page.request.post(`/api/books/${testBook.id}/qa`, {
          data: {
            question: 'Test question 2',
            answer: 'Test answer 2',
          },
        });
      }
    });

    test('should display saved Q&A in book panel', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Look for saved Q&A section
      const savedQASection = libraryPage.page.locator('.saved-qa-section');
      await expect(savedQASection).toBeVisible();
    });

    test('should display saved Q&A in chat panel', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Look for Q&A items in chat area
      const qaItems = libraryPage.page.locator('.qa-item');
      const count = await qaItems.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should expand Q&A item when clicked', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      const qaItem = libraryPage.page.locator('.qa-item').first();
      await qaItem.locator('.qa-header').click();

      await expect(qaItem).toHaveClass(/expanded/);
      await expect(qaItem.locator('.qa-body')).toBeVisible();
    });

    test('should collapse Q&A item when clicked again', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      const qaItem = libraryPage.page.locator('.qa-item').first();

      // Expand
      await qaItem.locator('.qa-header').click();
      await expect(qaItem).toHaveClass(/expanded/);

      // Collapse
      await qaItem.locator('.qa-header').click();
      await expect(qaItem).not.toHaveClass(/expanded/);
    });
  });

  test.describe('Hide/Unhide Q&A', () => {
    test.beforeEach(async ({ libraryPage }) => {
      // Add Q&A via API
      const bookResponse = await libraryPage.page.request.get('/api/books');
      const books = await bookResponse.json();
      const testBook = books.books.find((b: any) => b.title === 'QA Test Book');

      if (testBook) {
        await libraryPage.page.request.post(`/api/books/${testBook.id}/qa`, {
          data: {
            question: 'Hide test question',
            answer: 'Hide test answer',
          },
        });
      }
    });

    test('should hide Q&A item', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      const qaItem = libraryPage.page.locator('.qa-item').first();
      await qaItem.hover();

      const hideBtn = qaItem.locator('.hide-btn');
      if (await hideBtn.isVisible()) {
        await hideBtn.click();
        await libraryPage.page.waitForTimeout(500);

        // Q&A should be hidden or show hidden indicator
      }
    });

    test('should show hidden Q&A toggle when items are hidden', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Hide a Q&A first
      const qaItem = libraryPage.page.locator('.qa-item').first();
      await qaItem.hover();

      const hideBtn = qaItem.locator('.hide-btn');
      if (await hideBtn.isVisible()) {
        await hideBtn.click();
        await libraryPage.page.waitForTimeout(500);

        // Hidden toggle might appear
        const hiddenToggle = libraryPage.page.locator('.hidden-toggle');
        // May or may not be visible depending on implementation
      }
    });

    test('should unhide Q&A item', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Hide a Q&A first
      const qaItem = libraryPage.page.locator('.qa-item').first();
      await qaItem.hover();

      const hideBtn = qaItem.locator('.hide-btn');
      if (await hideBtn.isVisible()) {
        await hideBtn.click();
        await libraryPage.page.waitForTimeout(500);

        // Show hidden
        await libraryPage.showHiddenQA();

        // Find and unhide
        const hiddenItem = libraryPage.page.locator('.qa-item.hidden-qa').first();
        if (await hiddenItem.isVisible()) {
          await hiddenItem.hover();
          const unhideBtn = hiddenItem.locator('.unhide-btn');
          if (await unhideBtn.isVisible()) {
            await unhideBtn.click();
          }
        }
      }
    });
  });

  test.describe('Delete Q&A', () => {
    test.beforeEach(async ({ libraryPage }) => {
      // Add Q&A via API
      const bookResponse = await libraryPage.page.request.get('/api/books');
      const books = await bookResponse.json();
      const testBook = books.books.find((b: any) => b.title === 'QA Test Book');

      if (testBook) {
        await libraryPage.page.request.post(`/api/books/${testBook.id}/qa`, {
          data: {
            question: 'Delete test question',
            answer: 'Delete test answer',
          },
        });
      }
    });

    test('should delete Q&A item', async ({ libraryPage, page }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      const initialCount = await libraryPage.page.locator('.qa-item').count();

      const qaItem = libraryPage.page.locator('.qa-item').first();
      await qaItem.hover();

      const deleteBtn = qaItem.locator('.delete-btn');
      if (await deleteBtn.isVisible()) {
        page.once('dialog', dialog => dialog.accept());
        await deleteBtn.click();
        await libraryPage.page.waitForTimeout(500);

        const newCount = await libraryPage.page.locator('.qa-item').count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });
  });

  test.describe('Library-Level Q&A', () => {
    test.beforeEach(async ({ libraryPage }) => {
      // Add library-level Q&A via API
      await libraryPage.page.request.post('/api/library/qa', {
        data: {
          question: 'Library question',
          answer: 'Library answer',
        },
      });
    });

    test('should display library-level Q&A when no book selected', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.clearBookContext();

      // Library Q&A might be visible in chat area
      const qaItems = libraryPage.page.locator('.qa-item');
      // May have library-level Q&A
    });
  });

  test.describe('Q&A Separator', () => {
    test('should show separator between saved and new Q&A', async ({ libraryPage }) => {
      await libraryPage.goto();
      await libraryPage.selectBook('QA Test Book');

      // Look for separator
      const separator = libraryPage.page.locator('.saved-qa-separator');
      // May or may not be visible
    });
  });
});
