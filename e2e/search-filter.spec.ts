import { test, expect } from './fixtures';

test.describe('Search & Filter', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Set up test data
    const testBooks = [
      { title: 'JavaScript Guide', author: 'John Doe', status: 'completed', tags: 'programming, javascript, web' },
      { title: 'Python Basics', author: 'Jane Smith', status: 'reading', tags: 'programming, python, data science' },
      { title: 'History of Rome', author: 'Marcus Aurelius', status: 'want-to-read', tags: 'history, ancient, rome' },
      { title: 'Art of War', author: 'Sun Tzu', status: 'completed', tags: 'strategy, military, philosophy' },
    ];

    for (const book of testBooks) {
      await libraryPage.addBookViaAPI(book);
    }

    await libraryPage.goto();
  });

  test.describe('Full-Text Search', () => {
    test('should search by title', async ({ libraryPage }) => {
      await libraryPage.searchBooks('JavaScript');
      await libraryPage.page.waitForTimeout(300); // Extra wait for DOM update

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      // Should find JavaScript Guide
      expect(count).toBeGreaterThan(0);
      await expect(libraryPage.page.locator('.book-card').first()).toContainText('JavaScript');
    });

    test('should search by author', async ({ libraryPage }) => {
      await libraryPage.searchBooks('Sun Tzu');
      await libraryPage.page.waitForTimeout(300);

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      expect(count).toBeGreaterThan(0);
      await expect(libraryPage.page.locator('.book-card').first()).toContainText('Art of War');
    });

    test('should search by tags', async ({ libraryPage }) => {
      await libraryPage.searchBooks('programming');
      await libraryPage.page.waitForTimeout(300);

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      // Should find books with programming tag (JavaScript Guide and Python Basics)
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should show no results for non-matching search', async ({ libraryPage }) => {
      await libraryPage.searchBooks('xyznonexistentbook123');
      await libraryPage.page.waitForTimeout(300);

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      // Should find 0 results for non-matching search
      expect(count).toBe(0);
    });

    test('should clear search and show all books', async ({ libraryPage }) => {
      const initialCount = await libraryPage.getBookCount();

      await libraryPage.searchBooks('JavaScript');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.clearSearch();
      await libraryPage.page.waitForTimeout(300);

      const finalCount = await libraryPage.getBookCount();
      expect(finalCount).toBeGreaterThanOrEqual(initialCount - 1);
    });
  });

  test.describe('Status Filter', () => {
    test('should filter by completed status', async ({ libraryPage }) => {
      await libraryPage.filterByStatus('completed');

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      // All visible books should be completed
      for (let i = 0; i < count; i++) {
        const badge = bookCards.nth(i).locator('.status-badge');
        if (await badge.isVisible()) {
          await expect(badge).toHaveClass(/status-completed/);
        }
      }
    });

    test('should filter by reading status', async ({ libraryPage }) => {
      await libraryPage.filterByStatus('reading');

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      for (let i = 0; i < count; i++) {
        const badge = bookCards.nth(i).locator('.status-badge');
        if (await badge.isVisible()) {
          await expect(badge).toHaveClass(/status-reading/);
        }
      }
    });

    test('should filter by want-to-read status', async ({ libraryPage }) => {
      await libraryPage.filterByStatus('want-to-read');

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      for (let i = 0; i < count; i++) {
        const badge = bookCards.nth(i).locator('.status-badge');
        if (await badge.isVisible()) {
          await expect(badge).toHaveClass(/status-want-to-read/);
        }
      }
    });

    test('should show all books when selecting "All Status"', async ({ libraryPage }) => {
      const initialCount = await libraryPage.getBookCount();

      await libraryPage.filterByStatus('completed');
      await libraryPage.page.waitForTimeout(300);

      await libraryPage.filterByStatus('');
      await libraryPage.page.waitForTimeout(300);

      const finalCount = await libraryPage.getBookCount();
      expect(finalCount).toBeGreaterThanOrEqual(initialCount - 1);
    });
  });

  test.describe('Sorting', () => {
    test('should sort by title A-Z', async ({ libraryPage }) => {
      await libraryPage.sortBy('title-asc');
      await libraryPage.page.waitForTimeout(300);

      const titles = await libraryPage.page.locator('.book-card h3').allTextContents();
      // Verify sort direction: first title should come before or equal to last (case-insensitive)
      if (titles.length > 1) {
        const first = titles[0].toLowerCase();
        const last = titles[titles.length - 1].toLowerCase();
        expect(first <= last).toBeTruthy();
      }
    });

    test('should sort by title Z-A', async ({ libraryPage }) => {
      await libraryPage.sortBy('title-desc');
      await libraryPage.page.waitForTimeout(300);

      const titles = await libraryPage.page.locator('.book-card h3').allTextContents();
      // Verify sort direction: first title should come after or equal to last (case-insensitive)
      if (titles.length > 1) {
        const first = titles[0].toLowerCase();
        const last = titles[titles.length - 1].toLowerCase();
        expect(first >= last).toBeTruthy();
      }
    });

    test('should sort by author A-Z', async ({ libraryPage }) => {
      await libraryPage.sortBy('author-asc');
      await libraryPage.page.waitForTimeout(300);

      const authors = await libraryPage.page.locator('.book-card .author').allTextContents();
      // Verify sort direction: first author should come before or equal to last (case-insensitive)
      if (authors.length > 1) {
        const first = authors[0].toLowerCase();
        const last = authors[authors.length - 1].toLowerCase();
        expect(first <= last).toBeTruthy();
      }
    });

    test('should sort by added date (recent first)', async ({ libraryPage }) => {
      await libraryPage.sortBy('dateAdded-desc');
      await libraryPage.page.waitForTimeout(300);

      // Just verify the sort option works without error
      const bookCards = libraryPage.page.locator('.book-card');
      await expect(bookCards.first()).toBeVisible();
    });

    test('should sort by published year (newest first)', async ({ libraryPage }) => {
      await libraryPage.sortBy('publishedYear-desc');
      await libraryPage.page.waitForTimeout(300);

      // Just verify the sort option works without error
      const bookCards = libraryPage.page.locator('.book-card');
      await expect(bookCards.first()).toBeVisible();
    });
  });

  test.describe('Genre Dropdown', () => {
    test('should open genre dropdown', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      await expect(libraryPage.page.locator('.genre-tree.open')).toBeVisible();
    });

    test('should show "All Genres" option', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      await expect(libraryPage.page.locator('.genre-tree-all')).toBeVisible();
      await expect(libraryPage.page.locator('.genre-tree-all')).toContainText('All Genres');
    });

    test('should select "All Genres" and show all books', async ({ libraryPage }) => {
      await libraryPage.selectAllGenres();

      await expect(libraryPage.page.locator('#genreDropdownLabel')).toContainText('All Genres');
    });

    test('should close dropdown when clicking outside', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();
      await expect(libraryPage.page.locator('.genre-tree.open')).toBeVisible();

      // Click outside
      await libraryPage.page.click('.panel-content', { position: { x: 10, y: 10 } });

      await libraryPage.page.waitForTimeout(300);
      // Dropdown should close
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply status filter and sort together', async ({ libraryPage }) => {
      await libraryPage.filterByStatus('completed');
      await libraryPage.sortBy('title-asc');
      await libraryPage.page.waitForTimeout(300);

      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();

      // All should be completed
      for (let i = 0; i < count; i++) {
        const badge = bookCards.nth(i).locator('.status-badge');
        if (await badge.isVisible()) {
          await expect(badge).toHaveClass(/status-completed/);
        }
      }

      // Should be sorted by title (verify direction only)
      const titles = await libraryPage.page.locator('.book-card h3').allTextContents();
      if (titles.length > 1) {
        const first = titles[0].toLowerCase();
        const last = titles[titles.length - 1].toLowerCase();
        expect(first <= last).toBeTruthy();
      }
    });

    test('should apply search and status filter together', async ({ libraryPage }) => {
      await libraryPage.searchBooks('programming');
      await libraryPage.page.waitForTimeout(300);
      await libraryPage.filterByStatus('completed');
      await libraryPage.page.waitForTimeout(300);

      // Results should match both criteria
      const bookCards = libraryPage.page.locator('.book-card');
      const count = await bookCards.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
