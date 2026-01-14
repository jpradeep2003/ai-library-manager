import { DatabaseManager } from '../database/schema.js';
import { Book, Note, SavedQA } from '../types/index.js';
import type Database from 'better-sqlite3';

export class LibraryService {
  private db: Database.Database;

  constructor(private dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  addBook(book: Omit<Book, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO books (
        title, author, isbn, publisher, publishedYear, genre, pages,
        language, description, coverUrl, summary, status, rating, dateAdded,
        dateStarted, dateCompleted, currentPage, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      book.title,
      book.author,
      book.isbn || null,
      book.publisher || null,
      book.publishedYear || null,
      book.genre || null,
      book.pages || null,
      book.language || 'English',
      book.description || null,
      book.coverUrl || null,
      book.summary || null,
      book.status,
      book.rating || null,
      book.dateAdded,
      book.dateStarted || null,
      book.dateCompleted || null,
      book.currentPage || 0,
      book.tags || null
    );

    return result.lastInsertRowid as number;
  }

  getBookById(id: number): Book | undefined {
    const stmt = this.db.prepare('SELECT * FROM books WHERE id = ?');
    return stmt.get(id) as Book | undefined;
  }

  getAllBooks(options?: {
    status?: string;
    genre?: string;
    tag?: string;
    sortBy?: 'title' | 'author' | 'dateAdded' | 'publishedYear' | 'rating';
    sortOrder?: 'asc' | 'desc';
  }): Book[] {
    let query = 'SELECT * FROM books';
    const params: any[] = [];
    const conditions: string[] = [];

    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    if (options?.genre) {
      conditions.push('genre = ?');
      params.push(options.genre);
    }
    if (options?.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%${options.tag}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const sortBy = options?.sortBy || 'dateAdded';
    const sortOrder = options?.sortOrder || 'desc';
    const validSortColumns = ['title', 'author', 'dateAdded', 'publishedYear', 'rating'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'dateAdded';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Book[];
  }

  getUniqueGenres(): string[] {
    const stmt = this.db.prepare('SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre');
    const results = stmt.all() as { genre: string }[];
    return results.map(r => r.genre);
  }

  getUniqueTags(): string[] {
    const stmt = this.db.prepare('SELECT tags FROM books WHERE tags IS NOT NULL');
    const results = stmt.all() as { tags: string }[];
    const allTags = new Set<string>();
    results.forEach(r => {
      if (r.tags) {
        r.tags.split(',').forEach(tag => {
          const trimmed = tag.trim().toLowerCase();
          if (trimmed) allTags.add(trimmed);
        });
      }
    });
    return Array.from(allTags).sort();
  }

  updateBook(id: number, updates: Partial<Book>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  deleteBook(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM books WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  searchBooks(query: string): Book[] {
    const stmt = this.db.prepare(`
      SELECT books.* FROM books_fts
      JOIN books ON books_fts.rowid = books.id
      WHERE books_fts MATCH ?
      ORDER BY rank
    `);
    return stmt.all(query) as Book[];
  }

  addNote(note: Omit<Note, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO notes (bookId, content, pageNumber, type, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      note.bookId,
      note.content,
      note.pageNumber || null,
      note.type,
      note.createdAt,
      note.updatedAt || null
    );

    return result.lastInsertRowid as number;
  }

  getNotesByBookId(bookId: number): Note[] {
    const stmt = this.db.prepare('SELECT * FROM notes WHERE bookId = ? ORDER BY createdAt DESC');
    return stmt.all(bookId) as Note[];
  }

  updateNote(id: number, content: string): boolean {
    const stmt = this.db.prepare(`
      UPDATE notes SET content = ?, updatedAt = ? WHERE id = ?
    `);
    const result = stmt.run(content, new Date().toISOString(), id);
    return result.changes > 0;
  }

  deleteNote(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getStatistics(): any {
    const stats: any = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'reading' THEN 1 ELSE 0 END) as reading,
        SUM(CASE WHEN status = 'want-to-read' THEN 1 ELSE 0 END) as wantToRead,
        SUM(CASE WHEN status = 'on-hold' THEN 1 ELSE 0 END) as onHold
      FROM books
    `).get();

    return stats;
  }

  getRecentBooks(limit: number = 10): Book[] {
    const stmt = this.db.prepare('SELECT * FROM books ORDER BY dateAdded DESC LIMIT ?');
    return stmt.all(limit) as Book[];
  }

  getBooksByStatus(status: string): Book[] {
    const stmt = this.db.prepare('SELECT * FROM books WHERE status = ? ORDER BY dateAdded DESC');
    return stmt.all(status) as Book[];
  }

  // Saved Q&A methods
  saveQA(qa: Omit<SavedQA, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO saved_qa (bookId, question, answer, suggestions, hidden, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      qa.bookId,
      qa.question,
      qa.answer,
      qa.suggestions || null,
      qa.hidden ? 1 : 0,
      qa.createdAt
    );

    return result.lastInsertRowid as number;
  }

  getSavedQAByBookId(bookId: number, includeHidden: boolean = false): SavedQA[] {
    const query = includeHidden
      ? 'SELECT * FROM saved_qa WHERE bookId = ? ORDER BY createdAt ASC'
      : 'SELECT * FROM saved_qa WHERE bookId = ? AND (hidden = 0 OR hidden IS NULL) ORDER BY createdAt ASC';
    const stmt = this.db.prepare(query);
    const results = stmt.all(bookId) as any[];
    return results.map(r => ({
      ...r,
      hidden: r.hidden === 1
    })) as SavedQA[];
  }

  getHiddenQACountByBookId(bookId: number): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM saved_qa WHERE bookId = ? AND hidden = 1');
    const result = stmt.get(bookId) as { count: number };
    return result.count;
  }

  hideQA(id: number): boolean {
    const stmt = this.db.prepare('UPDATE saved_qa SET hidden = 1 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  unhideQA(id: number): boolean {
    const stmt = this.db.prepare('UPDATE saved_qa SET hidden = 0 WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteSavedQA(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM saved_qa WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
