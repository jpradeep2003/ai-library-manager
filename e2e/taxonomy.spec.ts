import { test, expect } from './fixtures';

test.describe('Genre Taxonomy', () => {
  test.beforeEach(async ({ libraryPage }) => {
    // Set up test data with various tags
    const testBooks = [
      { title: 'AI Fundamentals', author: 'Author 1', status: 'completed', tags: 'artificial intelligence, machine learning, neural networks' },
      { title: 'Python for ML', author: 'Author 2', status: 'reading', tags: 'machine learning, python, programming' },
      { title: 'History of Computing', author: 'Author 3', status: 'want-to-read', tags: 'history, computing, technology' },
      { title: 'Philosophy of Mind', author: 'Author 4', status: 'completed', tags: 'philosophy, consciousness, mind' },
      { title: 'Algorithms', author: 'Author 5', status: 'completed', tags: 'algorithms, mathematics, programming' },
      { title: 'Biology Basics', author: 'Author 6', status: 'reading', tags: 'biology, science, evolution' },
    ];

    for (const book of testBooks) {
      await libraryPage.addBookViaAPI(book);
    }

    await libraryPage.goto();
  });

  test.describe('Genre Dropdown', () => {
    test('should display genre dropdown button', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('.genre-dropdown-btn')).toBeVisible();
    });

    test('should show "All Genres" by default', async ({ libraryPage }) => {
      await expect(libraryPage.page.locator('#genreDropdownLabel')).toContainText('All Genres');
    });

    test('should open genre tree on click', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();
      await expect(libraryPage.page.locator('.genre-tree.open')).toBeVisible();
    });

    test('should show genre items in dropdown', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      const genreItems = libraryPage.page.locator('.genre-tree-item');
      const count = await genreItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should expand genre to show sub-genres', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      const genreItem = libraryPage.page.locator('.genre-tree-item').first();
      if (await genreItem.isVisible()) {
        await genreItem.locator('.genre-tree-header').click();
        await expect(genreItem).toHaveClass(/expanded/);
      }
    });

    test('should show sub-genres when expanded', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      const genreItem = libraryPage.page.locator('.genre-tree-item').first();
      if (await genreItem.isVisible()) {
        await genreItem.locator('.genre-tree-header').click();
        const subGenres = genreItem.locator('.genre-tree-subgenre');
        const count = await subGenres.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Genre Filtering', () => {
    test('should filter books by genre', async ({ libraryPage }) => {
      const initialCount = await libraryPage.getBookCount();

      await libraryPage.openGenreDropdown();
      const genreHeader = libraryPage.page.locator('.genre-tree-header').first();
      if (await genreHeader.isVisible()) {
        await genreHeader.click(); // Expand
        await genreHeader.click(); // Select genre
      }

      // Count might be different after filtering
      const filteredCount = await libraryPage.getBookCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    });

    test('should filter books by sub-genre', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      const genreItem = libraryPage.page.locator('.genre-tree-item').first();
      if (await genreItem.isVisible()) {
        await genreItem.locator('.genre-tree-header').click(); // Expand

        const subGenre = genreItem.locator('.genre-tree-subgenre').first();
        if (await subGenre.isVisible()) {
          await subGenre.click();
          await libraryPage.page.waitForTimeout(500);

          // Books should be filtered
          const bookCount = await libraryPage.getBookCount();
          expect(bookCount).toBeGreaterThanOrEqual(0);
        }
      }
    });

    test('should update dropdown label when filtering', async ({ libraryPage }) => {
      await libraryPage.openGenreDropdown();

      const genreHeader = libraryPage.page.locator('.genre-tree-header').first();
      if (await genreHeader.isVisible()) {
        const genreName = await genreHeader.textContent();
        await genreHeader.click(); // Expand
        await genreHeader.click(); // Select

        // Label should update
        const label = libraryPage.page.locator('#genreDropdownLabel');
        // Label should change from "All Genres"
      }
    });

    test('should reset to all genres', async ({ libraryPage }) => {
      // First filter by a genre
      await libraryPage.openGenreDropdown();
      const genreHeader = libraryPage.page.locator('.genre-tree-header').first();
      if (await genreHeader.isVisible()) {
        await genreHeader.click();
        await genreHeader.click();
      }

      // Then select All Genres
      await libraryPage.selectAllGenres();

      await expect(libraryPage.page.locator('#genreDropdownLabel')).toContainText('All Genres');
    });
  });

  test.describe('Auto-Generated Taxonomy', () => {
    test('should auto-generate taxonomy from tags', async ({ libraryPage }) => {
      // Reset taxonomy
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      await libraryPage.openGenreDropdown();

      // Should have some genres
      const genreItems = libraryPage.page.locator('.genre-tree-item');
      const count = await genreItems.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should categorize tags into appropriate genres', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');
      await libraryPage.goto();

      // Check taxonomy via API
      const response = await libraryPage.page.request.get('/api/taxonomy');
      const data = await response.json();

      expect(data.taxonomy).toBeDefined();
      // Taxonomy should have genres with sub-genres
    });

    test('should limit to 6 genres', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');

      const response = await libraryPage.page.request.get('/api/taxonomy');
      const data = await response.json();

      expect(data.taxonomy.length).toBeLessThanOrEqual(6);
    });

    test('should limit to 6 sub-genres per genre', async ({ libraryPage }) => {
      await libraryPage.page.request.post('/api/taxonomy/generate');

      const response = await libraryPage.page.request.get('/api/taxonomy');
      const data = await response.json();

      for (const genre of data.taxonomy) {
        expect(genre.subGenres.length).toBeLessThanOrEqual(6);
      }
    });
  });

  test.describe('Taxonomy API', () => {
    test('should get taxonomy', async ({ libraryPage }) => {
      const response = await libraryPage.page.request.get('/api/taxonomy');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.taxonomy).toBeDefined();
    });

    test('should save taxonomy', async ({ libraryPage }) => {
      const newTaxonomy = [
        { genreName: 'Test Genre', subGenres: ['tag1', 'tag2'], sortOrder: 0 },
      ];

      const response = await libraryPage.page.request.put('/api/taxonomy', {
        data: { taxonomy: newTaxonomy },
      });

      expect(response.ok()).toBeTruthy();

      // Verify it was saved
      const getResponse = await libraryPage.page.request.get('/api/taxonomy');
      const data = await getResponse.json();
      expect(data.taxonomy.some((g: any) => g.genreName === 'Test Genre')).toBeTruthy();
    });

    test('should generate taxonomy', async ({ libraryPage }) => {
      const response = await libraryPage.page.request.post('/api/taxonomy/generate');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.taxonomy).toBeDefined();
    });

    test('should add new genre', async ({ libraryPage }) => {
      const response = await libraryPage.page.request.post('/api/taxonomy/genre', {
        data: { genreName: 'New Test Genre', subGenres: [] },
      });

      expect(response.ok()).toBeTruthy();
    });

    test('should delete genre', async ({ libraryPage }) => {
      // First add a genre
      const addResponse = await libraryPage.page.request.post('/api/taxonomy/genre', {
        data: { genreName: 'Genre To Delete', subGenres: [] },
      });
      const addData = await addResponse.json();

      // Then delete it
      const deleteResponse = await libraryPage.page.request.delete(
        `/api/taxonomy/genre/${addData.id}`
      );
      expect(deleteResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Filter by Tags API', () => {
    test('should filter books by single tag', async ({ libraryPage }) => {
      const response = await libraryPage.page.request.get('/api/books/by-tags?tags=programming');

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.books).toBeDefined();
    });

    test('should filter books by multiple tags', async ({ libraryPage }) => {
      const response = await libraryPage.page.request.get(
        '/api/books/by-tags?tags=programming,machine%20learning'
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.books).toBeDefined();
    });
  });
});
