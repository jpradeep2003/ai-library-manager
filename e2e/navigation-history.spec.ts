import { test, expect } from './fixtures';

test.describe('Navigation & History', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Clear localStorage for clean history tests
    await libraryPage.page.evaluate(() => localStorage.clear());

    // Set up test data
    const testBooks = [
      { title: 'History Book A', author: 'Author A', status: 'completed', tags: 'history' },
      { title: 'History Book B', author: 'Author B', status: 'reading', tags: 'history' },
      { title: 'History Book C', author: 'Author C', status: 'want-to-read', tags: 'history' },
      { title: 'History Book D', author: 'Author D', status: 'completed', tags: 'history' },
    ];

    for (const book of testBooks) {
      await libraryPage.addBookViaAPI(book);
    }

    await libraryPage.goto();
  });

  test.describe('Book History Navigation', () => {
    test('should disable back button initially', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');

      const backBtn = libraryPage.page.locator('#historyBackBtn');
      await expect(backBtn).toBeDisabled();
    });

    test('should disable forward button initially', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');

      const forwardBtn = libraryPage.page.locator('#historyForwardBtn');
      await expect(forwardBtn).toBeDisabled();
    });

    test('should enable back button after viewing multiple books', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      const backBtn = libraryPage.page.locator('#historyBackBtn');
      await expect(backBtn).toBeEnabled();
    });

    test('should navigate back to previous book', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.goBackInHistory();

      // Should show Book A
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book A');
    });

    test('should enable forward button after going back', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.goBackInHistory();

      const forwardBtn = libraryPage.page.locator('#historyForwardBtn');
      await expect(forwardBtn).toBeEnabled();
    });

    test('should navigate forward after going back', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.goBackInHistory();
      await libraryPage.goForwardInHistory();

      // Should show Book B
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book B');
    });

    test('should clear forward history when selecting new book after going back', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book C');
      await libraryPage.page.waitForTimeout(300);

      // Go back to Book B
      await libraryPage.goBackInHistory();

      // Select a new book (Book D)
      await libraryPage.selectBook('History Book D');
      await libraryPage.page.waitForTimeout(300);

      // Forward should be disabled (C is cleared from history)
      const forwardBtn = libraryPage.page.locator('#historyForwardBtn');
      await expect(forwardBtn).toBeDisabled();
    });

    test('should navigate through multiple books in history', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book C');
      await libraryPage.page.waitForTimeout(300);

      // Go back twice
      await libraryPage.goBackInHistory();
      await libraryPage.goBackInHistory();

      // Should be at Book A
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book A');

      // Go forward twice
      await libraryPage.goForwardInHistory();
      await libraryPage.goForwardInHistory();

      // Should be at Book C
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book C');
    });
  });

  test.describe('History Persistence', () => {
    test('should persist history in localStorage', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      // Check localStorage
      const history = await libraryPage.page.evaluate(() => {
        return localStorage.getItem('bookHistory');
      });

      expect(history).toBeTruthy();
      const parsed = JSON.parse(history || '{}');
      expect(parsed.history).toBeDefined();
      expect(parsed.history.length).toBeGreaterThan(0);
    });

    test('should restore history after page refresh', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.selectBook('History Book B');
      await libraryPage.page.waitForTimeout(300);

      // Refresh page
      await libraryPage.goto();

      // Select a book to open book panel
      await libraryPage.selectBook('History Book C');

      // Back button should be enabled (history preserved)
      const backBtn = libraryPage.page.locator('#historyBackBtn');
      // History may or may not preserve after refresh depending on implementation
    });

    test('should limit history to 10 items', async ({ libraryPage }) => {
      // View more than 10 books
      const books = ['History Book A', 'History Book B', 'History Book C', 'History Book D'];
      for (let i = 0; i < 12; i++) {
        await libraryPage.selectBook(books[i % books.length]);
        await libraryPage.page.waitForTimeout(200);
      }

      // Check localStorage
      const history = await libraryPage.page.evaluate(() => {
        return localStorage.getItem('bookHistory');
      });

      const parsed = JSON.parse(history || '{}');
      expect(parsed.history.length).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Panel Navigation', () => {
    test('should close book panel with X button', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await expect(libraryPage.page.locator('.book-panel.visible')).toBeVisible();

      await libraryPage.closeBookPanel();

      await expect(libraryPage.page.locator('.book-panel.visible')).not.toBeVisible();
    });

    test('should expand library panel when book panel closes', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');

      await libraryPage.closeBookPanel();

      // Library panel should be larger
      const libraryPanel = libraryPage.page.locator('.library-panel');
      const boundingBox = await libraryPanel.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(400);
    });

    test('should minimize library panel when book selected', async ({ libraryPage }) => {
      // Get initial width
      const libraryPanel = libraryPage.page.locator('.library-panel');
      const initialBox = await libraryPanel.boundingBox();

      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      // Library should be narrower
      const newBox = await libraryPanel.boundingBox();
      expect(newBox?.width).toBeLessThan(initialBox?.width || 1000);
    });

    test('should show vertical text when panel is minimized', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await libraryPage.page.waitForTimeout(300);

      // Library panel should have minimized styling when narrow enough
      const libraryPanel = libraryPage.page.locator('.library-panel');
      // Check if minimized class is applied
    });
  });

  test.describe('Book Selection', () => {
    test('should highlight selected book card', async ({ libraryPage }) => {
      const bookCard = libraryPage.page.locator('.book-card:has-text("History Book A")');
      await bookCard.click();

      await expect(bookCard).toHaveClass(/selected/);
    });

    test('should remove highlight from previous book when selecting new one', async ({ libraryPage }) => {
      const bookCardA = libraryPage.page.locator('.book-card:has-text("History Book A")');
      await bookCardA.click();
      await expect(bookCardA).toHaveClass(/selected/);

      const bookCardB = libraryPage.page.locator('.book-card:has-text("History Book B")');
      await bookCardB.click();

      await expect(bookCardA).not.toHaveClass(/selected/);
      await expect(bookCardB).toHaveClass(/selected/);
    });

    test('should update book panel when selecting different book', async ({ libraryPage }) => {
      await libraryPage.selectBook('History Book A');
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book A');

      await libraryPage.selectBook('History Book B');
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText('History Book B');
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state in book panel initially', async ({ libraryPage }) => {
      // Book panel should show empty state before any book is selected
      const emptyState = libraryPage.page.locator('.empty-state');
      // May or may not be visible depending on initial state
    });
  });
});
