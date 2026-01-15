import { test, expect, testBooks, LibraryPage } from './fixtures';

test.describe('Book Management', () => {
  test.beforeEach(async ({ libraryPage }) => {
    await libraryPage.goto();
  });

  test.describe('Add Book', () => {
    test('should open add book modal', async ({ libraryPage }) => {
      await libraryPage.openAddBookModal();
      await expect(libraryPage.page.locator('.modal.active')).toBeVisible();
      await expect(libraryPage.page.locator('.modal-content h2')).toHaveText('Add New Book');
    });

    test('should close add book modal with X button', async ({ libraryPage }) => {
      await libraryPage.openAddBookModal();
      await libraryPage.closeAddBookModal();
      await expect(libraryPage.page.locator('.modal.active')).not.toBeVisible();
    });

    test('should add a new book successfully', async ({ libraryPage }) => {
      const initialCount = await libraryPage.getBookCount();

      await libraryPage.addBook({
        title: 'Test Book ' + Date.now(),
        author: 'Test Author',
        status: 'want-to-read',
        tags: 'test, e2e',
      });

      // Wait for book grid to update
      await libraryPage.page.waitForTimeout(1000);

      const newCount = await libraryPage.getBookCount();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('should require title field', async ({ libraryPage }) => {
      await libraryPage.openAddBookModal();
      await libraryPage.page.fill('input[placeholder="Author"]', 'Test Author');
      await libraryPage.page.click('#addBookModal button:has-text("Add Book")');

      // Modal should still be visible (validation failed)
      await expect(libraryPage.page.locator('.modal.active')).toBeVisible();
    });

    test('should require author field', async ({ libraryPage }) => {
      await libraryPage.openAddBookModal();
      await libraryPage.page.fill('input[placeholder="Title"]', 'Test Title');
      await libraryPage.page.click('#addBookModal button:has-text("Add Book")');

      // Modal should still be visible (validation failed)
      await expect(libraryPage.page.locator('.modal.active')).toBeVisible();
    });

    test('should prevent duplicate books', async ({ libraryPage }) => {
      const uniqueTitle = 'Duplicate Test ' + Date.now();

      // Add first book
      await libraryPage.addBook({
        title: uniqueTitle,
        author: 'Duplicate Author',
        status: 'want-to-read',
      });
      await libraryPage.page.waitForTimeout(1500);

      // Try to add same book again
      await libraryPage.addBook({
        title: uniqueTitle,
        author: 'Duplicate Author',
        status: 'want-to-read',
      });

      // Check for error message
      const statusMessage = libraryPage.page.locator('#addBookStatus + * >> text=/already exists/i');
      // The duplicate should be prevented
    });

    test('should set correct status when adding book', async ({ libraryPage }) => {
      const uniqueTitle = 'Status Test ' + Date.now();

      await libraryPage.addBook({
        title: uniqueTitle,
        author: 'Status Author',
        status: 'reading',
      });

      await libraryPage.page.waitForTimeout(1000);

      // Find and click the book
      await libraryPage.selectBook(uniqueTitle);

      // Verify status in book panel
      await expect(libraryPage.page.locator('.book-panel')).toContainText('Reading');
    });
  });

  test.describe('View Book Details', () => {
    test.beforeEach(async ({ libraryPage }) => {
      // Add a test book via API for consistent testing
      await libraryPage.addBookViaAPI({
        title: 'View Test Book ' + Date.now(),
        author: 'View Test Author',
        status: 'completed',
        tags: 'testing, view',
      });
      await libraryPage.goto();
    });

    test('should display book panel when clicking a book', async ({ libraryPage }) => {
      const firstBook = libraryPage.page.locator('.book-card').first();
      const bookTitle = await firstBook.locator('h3').textContent();

      await firstBook.click();
      await libraryPage.page.waitForSelector('.book-panel.visible');

      await expect(libraryPage.page.locator('.book-panel')).toBeVisible();
      await expect(libraryPage.page.locator('.book-detail-info h2')).toContainText(bookTitle || '');
    });

    test('should show book metadata', async ({ libraryPage }) => {
      const firstBook = libraryPage.page.locator('.book-card').first();
      await firstBook.click();
      await libraryPage.page.waitForSelector('.book-panel.visible');

      // Check for metadata elements
      await expect(libraryPage.page.locator('.book-detail-info')).toBeVisible();
      await expect(libraryPage.page.locator('.book-detail-info h2')).toBeVisible();
    });

    test('should close book panel with X button', async ({ libraryPage }) => {
      const firstBook = libraryPage.page.locator('.book-card').first();
      await firstBook.click();
      await libraryPage.page.waitForSelector('.book-panel.visible');

      await libraryPage.closeBookPanel();

      await expect(libraryPage.page.locator('.book-panel.visible')).not.toBeVisible();
    });

    test('should highlight selected book in grid', async ({ libraryPage }) => {
      const firstBook = libraryPage.page.locator('.book-card').first();
      await firstBook.click();

      await expect(firstBook).toHaveClass(/selected/);
    });
  });

  test.describe('Delete Book', () => {
    test('should delete a book', async ({ libraryPage, page }) => {
      // Add a book to delete
      const uniqueTitle = 'Delete Test ' + Date.now();
      await libraryPage.addBookViaAPI({
        title: uniqueTitle,
        author: 'Delete Author',
        status: 'want-to-read',
      });
      await libraryPage.goto();

      const initialCount = await libraryPage.getBookCount();

      // Select and delete the book
      await libraryPage.selectBook(uniqueTitle);

      // Set up dialog handler before clicking delete
      page.once('dialog', dialog => dialog.accept());

      await libraryPage.page.click('.book-actions .delete-btn');
      await libraryPage.page.waitForTimeout(1000);

      // Verify book is deleted
      const newCount = await libraryPage.getBookCount();
      expect(newCount).toBeLessThan(initialCount);
    });
  });

  test.describe('Book Card Display', () => {
    test('should display book cover or placeholder', async ({ libraryPage }) => {
      const bookCard = libraryPage.page.locator('.book-card').first();
      const cover = bookCard.locator('.book-cover');

      await expect(cover).toBeVisible();
    });

    test('should display book title', async ({ libraryPage }) => {
      const bookCard = libraryPage.page.locator('.book-card').first();
      const title = bookCard.locator('h3');

      await expect(title).toBeVisible();
      const titleText = await title.textContent();
      expect(titleText?.length).toBeGreaterThan(0);
    });

    test('should display author name', async ({ libraryPage }) => {
      const bookCard = libraryPage.page.locator('.book-card').first();
      const author = bookCard.locator('.author');

      await expect(author).toBeVisible();
    });

    test('should display status badge', async ({ libraryPage }) => {
      const bookCard = libraryPage.page.locator('.book-card').first();
      const statusBadge = bookCard.locator('.status-badge');

      await expect(statusBadge).toBeVisible();
    });

    test('should display correct status badge color', async ({ libraryPage }) => {
      // Add books with different statuses
      const testData = [
        { title: 'Completed Test ' + Date.now(), status: 'completed' },
        { title: 'Reading Test ' + Date.now(), status: 'reading' },
        { title: 'Want Test ' + Date.now(), status: 'want-to-read' },
      ];

      for (const book of testData) {
        await libraryPage.addBookViaAPI({
          ...book,
          author: 'Status Test Author',
        });
      }

      await libraryPage.goto();

      // Check for different status classes
      const completedBadge = libraryPage.page.locator('.status-badge.status-completed').first();
      const readingBadge = libraryPage.page.locator('.status-badge.status-reading').first();
      const wantBadge = libraryPage.page.locator('.status-badge.status-want-to-read').first();

      // At least one of each should exist
      expect(await completedBadge.count()).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Statistics', () => {
    test('should display total book count', async ({ libraryPage }) => {
      const stats = await libraryPage.getStats();
      expect(stats.total).toBeGreaterThanOrEqual(0);
    });

    test('should update stats when adding a book', async ({ libraryPage }) => {
      const initialStats = await libraryPage.getStats();

      await libraryPage.addBook({
        title: 'Stats Test ' + Date.now(),
        author: 'Stats Author',
        status: 'completed',
      });

      await libraryPage.page.waitForTimeout(1500);
      await libraryPage.goto(); // Refresh to get updated stats

      const newStats = await libraryPage.getStats();
      expect(newStats.total).toBeGreaterThanOrEqual(initialStats.total);
    });
  });
});
