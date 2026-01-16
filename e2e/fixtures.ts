import { test as base, expect, Page } from '@playwright/test';
import { setupAIMocking, AI_RESPONSE_TIMEOUT, logAITestMode } from './helpers/ai-mock';

// Test data
export const testBooks = {
  book1: {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas',
    status: 'completed',
    tags: 'programming, software engineering, best practices',
  },
  book2: {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    status: 'reading',
    tags: 'programming, code quality, refactoring',
  },
  book3: {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    status: 'want-to-read',
    tags: 'psychology, decision making, cognitive science',
  },
  book4: {
    title: 'Sapiens',
    author: 'Yuval Noah Harari',
    status: 'completed',
    tags: 'history, anthropology, evolution',
  },
};

// Helper class for common page operations
export class LibraryPage {
  constructor(public page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/');
    await this.page.waitForSelector('#bookGrid');
  }

  // Book Management
  async openAddBookModal() {
    await this.page.click('button:has-text("+ Add")');
    await this.page.waitForSelector('.modal.active');
  }

  async addBook(book: { title: string; author: string; status?: string; tags?: string }) {
    await this.openAddBookModal();
    // Note: HTML placeholders include asterisks for required fields
    await this.page.fill('#title', book.title);
    await this.page.fill('#author', book.author);
    if (book.status) {
      await this.page.selectOption('#status', book.status);
    }
    if (book.tags) {
      await this.page.fill('#tags', book.tags);
    }
    await this.page.click('#addBookModal button:has-text("Add Book")');
    // Wait for modal to close (800ms delay in app + buffer)
    await this.page.waitForSelector('.modal.active', { state: 'hidden', timeout: 5000 }).catch(() => {});
    // Wait for book to appear in grid
    await this.page.waitForSelector(`.book-card:has-text("${book.title}")`, { timeout: 5000 }).catch(() => {});
  }

  async closeAddBookModal() {
    await this.page.click('.close-modal');
    await this.page.waitForSelector('.modal.active', { state: 'hidden' });
  }

  async getBookCount(): Promise<number> {
    const cards = await this.page.locator('.book-card').count();
    return cards;
  }

  async selectBook(title: string) {
    await this.page.click(`.book-card:has-text("${title}")`);
    // Wait for app container to have book-selected state (UI uses state classes, not .visible)
    await this.page.waitForSelector('.app-container.book-selected');
    // Wait for book details to be rendered
    await this.page.waitForSelector('.book-detail-info h2');
  }

  async deleteCurrentBook() {
    await this.page.click('.book-actions .delete-btn');
    // Handle confirmation if present
    this.page.once('dialog', dialog => dialog.accept());
    await this.page.waitForTimeout(500);
  }

  // Search & Filtering
  async searchBooks(query: string) {
    await this.page.fill('#searchInput', query);
    await this.page.click('button:has-text("Go")');
    // Wait for search to complete - give time for API call and re-render
    await this.page.waitForTimeout(800);
  }

  async clearSearch() {
    await this.page.fill('#searchInput', '');
    await this.page.click('button:has-text("Go")');
    // Wait for search to complete
    await this.page.waitForTimeout(800);
  }

  async filterByStatus(status: string) {
    await this.page.selectOption('#filterStatus', status);
    await this.page.waitForTimeout(500);
  }

  async sortBy(value: string) {
    await this.page.selectOption('#sortBy', value);
    await this.page.waitForTimeout(500);
  }

  // Genre Dropdown
  async openGenreDropdown() {
    await this.page.click('.genre-dropdown-btn');
    await this.page.waitForSelector('.genre-tree.open');
  }

  async selectAllGenres() {
    await this.openGenreDropdown();
    await this.page.click('.genre-tree-all');
    await this.page.waitForTimeout(300);
  }

  async selectGenre(genreName: string) {
    await this.openGenreDropdown();
    await this.page.click(`.genre-tree-header:has-text("${genreName}")`);
    await this.page.waitForTimeout(300);
  }

  // Chat Panel
  async sendChatMessage(message: string) {
    await this.page.fill('.chat-input input', message);
    await this.page.click('.chat-input button');
    // Wait for response (loading indicator to appear and disappear)
    // Allow longer timeout for AI responses which can take 90+ seconds
    await this.page.waitForSelector('.message.loading', { state: 'visible', timeout: 5000 }).catch(() => {});
    await this.page.waitForSelector('.message.loading', { state: 'hidden', timeout: 120000 }).catch(() => {});
    await this.page.waitForTimeout(500);
  }

  async getChatMessages(): Promise<string[]> {
    const messages = await this.page.locator('.message').allTextContents();
    return messages;
  }

  async clearBookContext() {
    const clearBtn = this.page.locator('.book-context-banner button:has-text("Clear")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
      await this.page.waitForTimeout(300);
    }
  }

  async clickSuggestion(index: number) {
    await this.page.click(`.suggestion-btn:nth-child(${index + 1})`);
    await this.page.waitForTimeout(500);
  }

  // Q&A Management
  async toggleQAItem(questionText: string) {
    await this.page.click(`.qa-header:has-text("${questionText}")`);
    await this.page.waitForTimeout(200);
  }

  async hideQA(questionText: string) {
    const qaItem = this.page.locator(`.qa-item:has-text("${questionText}")`);
    await qaItem.hover();
    await qaItem.locator('.hide-btn').click();
    await this.page.waitForTimeout(300);
  }

  async showHiddenQA() {
    const toggle = this.page.locator('.hidden-toggle button');
    if (await toggle.isVisible()) {
      await toggle.click();
      await this.page.waitForTimeout(300);
    }
  }

  // Book Panel Navigation
  async goBackInHistory() {
    await this.page.click('#historyBackBtn');
    await this.page.waitForTimeout(300);
  }

  async goForwardInHistory() {
    await this.page.click('#historyForwardBtn');
    await this.page.waitForTimeout(300);
  }

  async closeBookPanel() {
    await this.page.click('.book-panel .close-btn');
    // Wait for book-selected state to be removed
    await this.page.waitForSelector('.app-container.book-selected', { state: 'detached' }).catch(() => {});
    await this.page.waitForTimeout(200);
  }

  async maximizeChat() {
    await this.page.click('.chat-panel .panel-btn:has-text("□")');
    await this.page.waitForTimeout(200);
  }

  // Settings
  async openSettings() {
    await this.page.click('.settings-btn');
    await this.page.waitForSelector('.settings-modal.active');
  }

  async closeSettings() {
    await this.page.click('.settings-close');
    await this.page.waitForSelector('.settings-modal.active', { state: 'hidden' });
  }

  async resetTaxonomy() {
    await this.openSettings();
    await this.page.click('.reset-btn');
    await this.page.waitForTimeout(1000);
  }

  // Stats
  async getStats(): Promise<{ total: number; completed: number; reading: number }> {
    const statsText = await this.page.locator('#stats').textContent();
    const total = parseInt(statsText?.match(/(\d+)\s*Books/)?.[1] || '0');
    const completed = parseInt(statsText?.match(/(\d+)\s*Done/)?.[1] || '0');
    const reading = parseInt(statsText?.match(/(\d+)\s*Reading/)?.[1] || '0');
    return { total, completed, reading };
  }

  // API helpers
  async clearLibrary() {
    const response = await this.page.request.get('/api/books');
    const data = await response.json();
    for (const book of data.books) {
      await this.page.request.delete(`/api/books/${book.id}`);
    }
  }

  async addBookViaAPI(book: { title: string; author: string; status: string; tags?: string }) {
    await this.page.request.post('/api/books', {
      data: {
        ...book,
        fetchMetadata: false, // Skip external API calls in tests
      },
    });
  }
}

// Extended test fixture with AI mocking support
export const test = base.extend<{ libraryPage: LibraryPage; page: Page }>({
  libraryPage: async ({ page }, use) => {
    // Setup AI mocking before tests run
    await setupAIMocking(page);
    logAITestMode();

    const libraryPage = new LibraryPage(page);
    await use(libraryPage);
  },
});

// Export AI timeout for use in tests
export { AI_RESPONSE_TIMEOUT };

export { expect };
