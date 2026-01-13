import { DatabaseManager } from '../database/schema.js';
import { Book, Note } from '../types/index.js';
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

  getAllBooks(filters?: { status?: string; genre?: string }): Book[] {
    let query = 'SELECT * FROM books';
    const params: any[] = [];

    if (filters) {
      const conditions: string[] = [];
      if (filters.status) {
        conditions.push('status = ?');
        params.push(filters.status);
      }
      if (filters.genre) {
        conditions.push('genre = ?');
        params.push(filters.genre);
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
    }

    query += ' ORDER BY dateAdded DESC';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Book[];
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
}
