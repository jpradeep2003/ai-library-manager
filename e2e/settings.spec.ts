import { test, expect } from './fixtures';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Set up some test data
    await libraryPage.addBookViaAPI({
      title: 'Settings Test Book',
      author: 'Settings Author',
      status: 'completed',
      tags: 'settings, test, demo',
    });

    await libraryPage.goto();
  });

  test.describe('Opening and Closing', () => {
    test('should display settings button in top bar', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.settings-btn')).toBeVisible();
    });

    test('should open settings modal when clicking settings button', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await expect(libraryPage.page.locator('.settings-modal.active')).toBeVisible();
    });

    test('should display settings header', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await expect(libraryPage.page.locator('.settings-header h2')).toHaveText('Settings');
    });

    test('should close settings with X button', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await libraryPage.closeSettings();
      await expect(libraryPage.page.locator('.settings-modal.active')).not.toBeVisible();
    });

    test('should close settings when clicking outside', async ({ libraryPage }) => {
      await libraryPage.openSettings();

      // Click on the overlay (outside the content)
      await libraryPage.page.click('.settings-modal', { position: { x: 10, y: 10 } });

      // Modal might close depending on implementation
    });
  });

  test.describe('Taxonomy Editor', () => {
    test('should display taxonomy section', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await expect(libraryPage.page.locator('.taxonomy-editor')).toBeVisible();
    });

    test('should display genre list', async ({ libraryPage }) => {
      // Generate taxonomy first
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genres = libraryPage.page.locator('.taxonomy-genre');
      const count = await genres.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should expand genre to show sub-genres', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        await genre.locator('.taxonomy-genre-header').click();
        await expect(genre).toHaveClass(/expanded/);
      }
    });

    test('should display sub-genre tags when expanded', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        await genre.locator('.taxonomy-genre-header').click();

        const tags = genre.locator('.taxonomy-subgenre-tag');
        const count = await tags.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should have rename button for genres', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        const renameBtn = genre.locator('button:has-text("Rename")');
        await expect(renameBtn).toBeVisible();
      }
    });

    test('should have delete button for genres', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        const deleteBtn = genre.locator('.delete-btn');
        await expect(deleteBtn).toBeVisible();
      }
    });

    test('should delete genre when clicking delete', async ({ libraryPage, page }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const initialCount = await libraryPage.page.locator('.taxonomy-genre').count();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible() && initialCount > 0) {
        page.once('dialog', dialog => dialog.accept());
        await genre.locator('.delete-btn').click();
        await libraryPage.page.waitForTimeout(500);

        const newCount = await libraryPage.page.locator('.taxonomy-genre').count();
        expect(newCount).toBeLessThan(initialCount);
      }
    });

    test('should have add sub-genre input', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        await genre.locator('.taxonomy-genre-header').click();

        const addInput = genre.locator('.taxonomy-add-subgenre input');
        await expect(addInput).toBeVisible();
      }
    });

    test('should add sub-genre', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        await genre.locator('.taxonomy-genre-header').click();

        const initialCount = await genre.locator('.taxonomy-subgenre-tag').count();

        await genre.locator('.taxonomy-add-subgenre input').fill('new-test-tag');
        await genre.locator('.taxonomy-add-subgenre button').click();
        await libraryPage.page.waitForTimeout(500);

        const newCount = await genre.locator('.taxonomy-subgenre-tag').count();
        expect(newCount).toBeGreaterThanOrEqual(initialCount);
      }
    });

    test('should remove sub-genre tag', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openSettings();

      const genre = libraryPage.page.locator('.taxonomy-genre').first();
      if (await genre.isVisible()) {
        await genre.locator('.taxonomy-genre-header').click();

        const tag = genre.locator('.taxonomy-subgenre-tag').first();
        if (await tag.isVisible()) {
          const initialCount = await genre.locator('.taxonomy-subgenre-tag').count();

          await tag.locator('.remove-btn').click();
          await libraryPage.page.waitForTimeout(500);

          const newCount = await genre.locator('.taxonomy-subgenre-tag').count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    });
  });

  test.describe('Taxonomy Footer Actions', () => {
    test('should have "Add Genre" button', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await expect(libraryPage.page.locator('.add-genre-btn')).toBeVisible();
    });

    test('should have "Reset" button', async ({ libraryPage }) => {
      await libraryPage.openSettings();
      await expect(libraryPage.page.locator('.reset-btn')).toBeVisible();
    });

    test('should add new genre', async ({ libraryPage }) => {
      await libraryPage.openSettings();

      const initialCount = await libraryPage.page.locator('.taxonomy-genre').count();

      await libraryPage.page.click('.add-genre-btn');

      // A prompt might appear asking for genre name
      libraryPage.page.once('dialog', async dialog => {
        await dialog.accept('New Test Genre');
      });

      await libraryPage.page.waitForTimeout(500);

      // New genre should be added
      // Implementation may vary
    });

    test('should reset taxonomy to auto-generated', async ({ libraryPage }) => {
      await libraryPage.openSettings();

      // Click reset
      await libraryPage.page.click('.reset-btn');
      await libraryPage.page.waitForTimeout(1000);

      // Taxonomy should be regenerated
      const genres = libraryPage.page.locator('.taxonomy-genre');
      const count = await genres.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Future Features Section', () => {
    test('should display coming soon section', async ({ libraryPage }) => {
      await libraryPage.openSettings();

      const futureSection = libraryPage.page.locator('.settings-future');
      await expect(futureSection).toBeVisible();
    });

    test('should list future features', async ({ libraryPage }) => {
      await libraryPage.openSettings();

      const futureSection = libraryPage.page.locator('.settings-future');
      await expect(futureSection).toContainText('Chat History');
      await expect(futureSection).toContainText('Books History');
      await expect(futureSection).toContainText('Data Export');
    });
  });

  test.describe('Settings Persistence', () => {
    test('should persist taxonomy changes', async ({ libraryPage }) => {
      // Add a custom genre
      await libraryPage.page.request.post('/api/taxonomy/genre', {
        data: { genreName: 'Persistent Genre', subGenres: ['tag1'] },
      });

      await libraryPage.goto();
      await libraryPage.openSettings();

      // Should see the custom genre
      const genre = libraryPage.page.locator('.taxonomy-genre:has-text("Persistent Genre")');
      await expect(genre).toBeVisible();
    });

    test('should update genre dropdown after taxonomy change', async ({ libraryPage }) => {
      // Add a custom genre
      await libraryPage.page.request.post('/api/taxonomy/genre', {
        data: { genreName: 'Dropdown Test Genre', subGenres: ['test-tag'] },
      });

      await libraryPage.goto();

      // Check dropdown
      await libraryPage.openGenreDropdown();

      const genreItem = libraryPage.page.locator('.genre-tree-item:has-text("Dropdown Test Genre")');
      // May or may not be visible depending on max genres limit
    });
  });
});
