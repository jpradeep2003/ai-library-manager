import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseManager {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'library.db');
    this.db = new Database(dbPath || defaultPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT,
        publisher TEXT,
        publishedYear INTEGER,
        genre TEXT,
        pages INTEGER,
        language TEXT DEFAULT 'English',
        description TEXT,
        coverUrl TEXT,
        summary TEXT,
        status TEXT DEFAULT 'want-to-read' CHECK(status IN ('want-to-read', 'reading', 'completed', 'on-hold')),
        rating INTEGER CHECK(rating >= 1 AND rating <= 5),
        dateAdded TEXT NOT NULL,
        dateStarted TEXT,
        dateCompleted TEXT,
        currentPage INTEGER DEFAULT 0,
        tags TEXT
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER NOT NULL,
        content TEXT NOT NULL,
        pageNumber INTEGER,
        type TEXT NOT NULL CHECK(type IN ('note', 'highlight', 'quote')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
      CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
      CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
      CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
      CREATE INDEX IF NOT EXISTS idx_notes_bookId ON notes(bookId);

      CREATE VIRTUAL TABLE IF NOT EXISTS books_fts USING fts5(
        title, author, description, genre, tags, content=books, content_rowid=id
      );

      CREATE TRIGGER IF NOT EXISTS books_ai AFTER INSERT ON books BEGIN
        INSERT INTO books_fts(rowid, title, author, description, genre, tags)
        VALUES (new.id, new.title, new.author, new.description, new.genre, new.tags);
      END;

      CREATE TRIGGER IF NOT EXISTS books_ad AFTER DELETE ON books BEGIN
        DELETE FROM books_fts WHERE rowid = old.id;
      END;

      CREATE TRIGGER IF NOT EXISTS books_au AFTER UPDATE ON books BEGIN
        UPDATE books_fts SET
          title = new.title,
          author = new.author,
          description = new.description,
          genre = new.genre,
          tags = new.tags
        WHERE rowid = new.id;
      END;
    `);
  }

  getDatabase(): Database.Database {
    return this.db;
  }

  close() {
    this.db.close();
  }
}
