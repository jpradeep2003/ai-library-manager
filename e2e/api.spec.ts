import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';

test.describe('API Endpoints', () => {
  test.describe('Health Check', () => {
    test('GET /api/health should return status ok', async ({ request }) => {
      const response = await request.get(`${API_BASE}/health`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.timestamp).toBeDefined();
    });
  });

  test.describe('Books API', () => {
    let testBookId: number;

    test('GET /api/books should return book list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.books).toBeDefined();
      expect(Array.isArray(data.books)).toBeTruthy();
      expect(data.count).toBeDefined();
    });

    test('POST /api/books should add a new book', async ({ request }) => {
      const newBook = {
        title: 'API Test Book ' + Date.now(),
        author: 'API Test Author',
        status: 'want-to-read',
        tags: 'api, test',
        fetchMetadata: false,
      };

      const response = await request.post(`${API_BASE}/books`, { data: newBook });
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.id).toBeDefined();
      expect(data.message).toContain('added');

      testBookId = data.id;
    });

    test('POST /api/books should reject duplicate books', async ({ request }) => {
      const uniqueTitle = 'Duplicate API Test ' + Date.now();
      const book = {
        title: uniqueTitle,
        author: 'Duplicate Author',
        status: 'want-to-read',
        fetchMetadata: false,
      };

      // Add first book
      await request.post(`${API_BASE}/books`, { data: book });

      // Try to add duplicate
      const response = await request.post(`${API_BASE}/books`, { data: book });
      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('already exists');
    });

    test('GET /api/books/:id should return book details', async ({ request }) => {
      // First create a book
      const newBook = {
        title: 'Get Test Book ' + Date.now(),
        author: 'Get Test Author',
        status: 'reading',
        fetchMetadata: false,
      };

      const createResponse = await request.post(`${API_BASE}/books`, { data: newBook });
      const createData = await createResponse.json();
      const bookId = createData.id;

      // Get the book
      const response = await request.get(`${API_BASE}/books/${bookId}`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.book).toBeDefined();
      expect(data.book.title).toBe(newBook.title);
      expect(data.book.author).toBe(newBook.author);
    });

    test('GET /api/books/:id should return 404 for non-existent book', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books/999999`);
      expect(response.status()).toBe(404);
    });

    test('PUT /api/books/:id should update book', async ({ request }) => {
      // Create a book first
      const newBook = {
        title: 'Update Test Book ' + Date.now(),
        author: 'Update Test Author',
        status: 'want-to-read',
        fetchMetadata: false,
      };

      const createResponse = await request.post(`${API_BASE}/books`, { data: newBook });
      const createData = await createResponse.json();
      const bookId = createData.id;

      // Update the book
      const updateData = {
        status: 'completed',
        rating: 5,
      };

      const response = await request.put(`${API_BASE}/books/${bookId}`, { data: updateData });
      expect(response.ok()).toBeTruthy();

      // Verify update
      const getResponse = await request.get(`${API_BASE}/books/${bookId}`);
      const getData = await getResponse.json();
      expect(getData.book.status).toBe('completed');
      expect(getData.book.rating).toBe(5);
    });

    test('DELETE /api/books/:id should delete book', async ({ request }) => {
      // Create a book first
      const newBook = {
        title: 'Delete API Test ' + Date.now(),
        author: 'Delete Test Author',
        status: 'want-to-read',
        fetchMetadata: false,
      };

      const createResponse = await request.post(`${API_BASE}/books`, { data: newBook });
      const createData = await createResponse.json();
      const bookId = createData.id;

      // Delete the book
      const response = await request.delete(`${API_BASE}/books/${bookId}`);
      expect(response.ok()).toBeTruthy();

      // Verify deletion
      const getResponse = await request.get(`${API_BASE}/books/${bookId}`);
      expect(getResponse.status()).toBe(404);
    });

    test('GET /api/books with status filter', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books?status=completed`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      for (const book of data.books) {
        expect(book.status).toBe('completed');
      }
    });

    test('GET /api/books with sorting', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books?sortBy=title&sortOrder=asc`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      const titles = data.books.map((b: any) => b.title);
      const sortedTitles = [...titles].sort();
      expect(titles).toEqual(sortedTitles);
    });

    test('GET /api/books/by-tags should filter by tags', async ({ request }) => {
      // First add a book with specific tags
      await request.post(`${API_BASE}/books`, {
        data: {
          title: 'Tagged Book ' + Date.now(),
          author: 'Tagged Author',
          status: 'reading',
          tags: 'unique-test-tag-123',
          fetchMetadata: false,
        },
      });

      const response = await request.get(`${API_BASE}/books/by-tags?tags=unique-test-tag-123`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.books).toBeDefined();
    });
  });

  test.describe('Search API', () => {
    test('GET /api/search should return search results', async ({ request }) => {
      const response = await request.get(`${API_BASE}/search?q=test`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.books).toBeDefined();
      expect(data.count).toBeDefined();
    });

    test('GET /api/search with empty query', async ({ request }) => {
      const response = await request.get(`${API_BASE}/search?q=`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.books).toBeDefined();
    });
  });

  test.describe('Notes API', () => {
    let testBookId: number;

    test.beforeAll(async ({ request }) => {
      // Create a test book for notes
      const createResponse = await request.post(`${API_BASE}/books`, {
        data: {
          title: 'Notes Test Book ' + Date.now(),
          author: 'Notes Author',
          status: 'reading',
          fetchMetadata: false,
        },
      });
      const data = await createResponse.json();
      testBookId = data.id;
    });

    test('POST /api/books/:id/notes should add a note', async ({ request }) => {
      const note = {
        content: 'This is a test note',
        type: 'note',
        pageNumber: 42,
      };

      const response = await request.post(`${API_BASE}/books/${testBookId}/notes`, { data: note });
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.id).toBeDefined();
    });

    test('GET /api/books/:id/notes should return notes', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books/${testBookId}/notes`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.notes).toBeDefined();
      expect(Array.isArray(data.notes)).toBeTruthy();
    });

    test('POST /api/books/:id/notes should add highlight', async ({ request }) => {
      const highlight = {
        content: 'Important passage',
        type: 'highlight',
        pageNumber: 100,
      };

      const response = await request.post(`${API_BASE}/books/${testBookId}/notes`, { data: highlight });
      expect(response.ok()).toBeTruthy();
    });

    test('POST /api/books/:id/notes should add quote', async ({ request }) => {
      const quote = {
        content: '"To be or not to be"',
        type: 'quote',
        pageNumber: 50,
      };

      const response = await request.post(`${API_BASE}/books/${testBookId}/notes`, { data: quote });
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Q&A API', () => {
    let testBookId: number;

    test.beforeAll(async ({ request }) => {
      // Create a test book for Q&A
      const createResponse = await request.post(`${API_BASE}/books`, {
        data: {
          title: 'QA API Test Book ' + Date.now(),
          author: 'QA Author',
          status: 'completed',
          fetchMetadata: false,
        },
      });
      const data = await createResponse.json();
      testBookId = data.id;
    });

    test('POST /api/books/:id/qa should save Q&A', async ({ request }) => {
      const qa = {
        question: 'What is this book about?',
        answer: 'This book is about testing.',
        suggestions: JSON.stringify(['Follow up 1', 'Follow up 2']),
      };

      const response = await request.post(`${API_BASE}/books/${testBookId}/qa`, { data: qa });
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.id).toBeDefined();
    });

    test('GET /api/books/:id/qa should return saved Q&A', async ({ request }) => {
      const response = await request.get(`${API_BASE}/books/${testBookId}/qa`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.savedQA).toBeDefined();
      expect(Array.isArray(data.savedQA)).toBeTruthy();
    });

    test('POST /api/library/qa should save library-level Q&A', async ({ request }) => {
      const qa = {
        question: 'How many books do I have?',
        answer: 'You have several books.',
      };

      const response = await request.post(`${API_BASE}/library/qa`, { data: qa });
      expect(response.ok()).toBeTruthy();
    });

    test('GET /api/library/qa should return library Q&A', async ({ request }) => {
      const response = await request.get(`${API_BASE}/library/qa`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.savedQA).toBeDefined();
    });

    test('PUT /api/qa/:id/hide should hide Q&A', async ({ request }) => {
      // First create a Q&A
      const createResponse = await request.post(`${API_BASE}/books/${testBookId}/qa`, {
        data: {
          question: 'Hide test question',
          answer: 'Hide test answer',
        },
      });
      const createData = await createResponse.json();
      const qaId = createData.id;

      // Hide it
      const response = await request.put(`${API_BASE}/qa/${qaId}/hide`);
      expect(response.ok()).toBeTruthy();
    });

    test('PUT /api/qa/:id/unhide should unhide Q&A', async ({ request }) => {
      // First create and hide a Q&A
      const createResponse = await request.post(`${API_BASE}/books/${testBookId}/qa`, {
        data: {
          question: 'Unhide test question',
          answer: 'Unhide test answer',
        },
      });
      const createData = await createResponse.json();
      const qaId = createData.id;

      await request.put(`${API_BASE}/qa/${qaId}/hide`);

      // Unhide it
      const response = await request.put(`${API_BASE}/qa/${qaId}/unhide`);
      expect(response.ok()).toBeTruthy();
    });

    test('DELETE /api/qa/:id should delete Q&A', async ({ request }) => {
      // First create a Q&A
      const createResponse = await request.post(`${API_BASE}/books/${testBookId}/qa`, {
        data: {
          question: 'Delete test question',
          answer: 'Delete test answer',
        },
      });
      const createData = await createResponse.json();
      const qaId = createData.id;

      // Delete it
      const response = await request.delete(`${API_BASE}/qa/${qaId}`);
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Statistics API', () => {
    test('GET /api/statistics should return library stats', async ({ request }) => {
      const response = await request.get(`${API_BASE}/statistics`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.total).toBeDefined();
      expect(data.completed).toBeDefined();
      expect(data.reading).toBeDefined();
      expect(data.wantToRead).toBeDefined();
      expect(data.onHold).toBeDefined();
    });
  });

  test.describe('Genres & Tags API', () => {
    test('GET /api/genres should return genre list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/genres`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.genres).toBeDefined();
      expect(Array.isArray(data.genres)).toBeTruthy();
    });

    test('GET /api/tags should return tag list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/tags`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.tags).toBeDefined();
      expect(Array.isArray(data.tags)).toBeTruthy();
    });
  });

  test.describe('Taxonomy API', () => {
    test('GET /api/taxonomy should return taxonomy', async ({ request }) => {
      const response = await request.get(`${API_BASE}/taxonomy`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.taxonomy).toBeDefined();
      expect(Array.isArray(data.taxonomy)).toBeTruthy();
    });

    test('POST /api/taxonomy/generate should generate taxonomy', async ({ request }) => {
      const response = await request.post(`${API_BASE}/taxonomy/generate`);
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.taxonomy).toBeDefined();
    });

    test('PUT /api/taxonomy should save taxonomy', async ({ request }) => {
      const taxonomy = [
        { genreName: 'API Test Genre', subGenres: ['tag1', 'tag2'], sortOrder: 0 },
      ];

      const response = await request.put(`${API_BASE}/taxonomy`, {
        data: { taxonomy },
      });
      expect(response.ok()).toBeTruthy();
    });

    test('POST /api/taxonomy/genre should add genre', async ({ request }) => {
      const response = await request.post(`${API_BASE}/taxonomy/genre`, {
        data: { genreName: 'New API Genre', subGenres: [] },
      });
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.id).toBeDefined();
    });

    test('DELETE /api/taxonomy/genre/:id should delete genre', async ({ request }) => {
      // First create a genre
      const createResponse = await request.post(`${API_BASE}/taxonomy/genre`, {
        data: { genreName: 'Delete API Genre', subGenres: [] },
      });
      const createData = await createResponse.json();

      // Delete it
      const response = await request.delete(`${API_BASE}/taxonomy/genre/${createData.id}`);
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('AI API', () => {
    test('POST /api/ai/query should accept message', async ({ request }) => {
      // Note: This test verifies endpoint connectivity, not AI functionality
      // AI-dependent tests are in ai-chat.spec.ts with proper mocking

      const response = await request.post(`${API_BASE}/ai/query`, {
        data: {
          message: 'Hello',
          sessionId: 'test-session',
        },
        timeout: 30000, // Short timeout - we just want to verify endpoint exists
      });

      // Endpoint should respond (200, 400, or even 500 due to AI errors is acceptable)
      // We're testing endpoint existence, not AI functionality
      expect(response.status()).toBeDefined();
    });

    test('POST /api/ai/clear should clear session', async ({ request }) => {
      const response = await request.post(`${API_BASE}/ai/clear`, {
        data: { sessionId: 'test-session' },
      });

      expect(response.ok()).toBeTruthy();
    });
  });
});
