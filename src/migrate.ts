import Database from 'better-sqlite3';
import path from 'path';
import { config } from 'dotenv';

config();

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'library.db');
const db = new Database(dbPath);

console.log(`Migrating database: ${dbPath}`);

try {
  // Check if summary column exists
  const tableInfo: any[] = db.prepare("PRAGMA table_info(books)").all();
  const hasSummaryColumn = tableInfo.some((col: any) => col.name === 'summary');

  if (hasSummaryColumn) {
    console.log('✓ Database already has summary column');
  } else {
    console.log('Adding summary column to books table...');
    db.exec('ALTER TABLE books ADD COLUMN summary TEXT');
    console.log('✓ Successfully added summary column');
  }

  // Check if saved_qa table exists
  const tables: any[] = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_qa'").all();
  const hasSavedQATable = tables.length > 0;

  if (hasSavedQATable) {
    console.log('✓ Database already has saved_qa table');

    // Check if hidden column exists
    const qaTableInfo: any[] = db.prepare("PRAGMA table_info(saved_qa)").all();
    const hasHiddenColumn = qaTableInfo.some((col: any) => col.name === 'hidden');

    if (hasHiddenColumn) {
      console.log('✓ saved_qa table already has hidden column');
    } else {
      console.log('Adding hidden column to saved_qa table...');
      db.exec('ALTER TABLE saved_qa ADD COLUMN hidden INTEGER DEFAULT 0');
      console.log('✓ Successfully added hidden column');
    }
  } else {
    console.log('Creating saved_qa table...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_qa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bookId INTEGER NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        suggestions TEXT,
        hidden INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_saved_qa_bookId ON saved_qa(bookId);
    `);
    console.log('✓ Successfully created saved_qa table');
  }

  // Check if bookId column allows NULL (for library-level Q&A)
  // SQLite doesn't support altering column constraints, so we need to recreate the table
  if (hasSavedQATable) {
    const qaTableInfo: any[] = db.prepare("PRAGMA table_info(saved_qa)").all();
    const bookIdCol = qaTableInfo.find((col: any) => col.name === 'bookId');

    if (bookIdCol && bookIdCol.notnull === 1) {
      console.log('Migrating saved_qa table to allow NULL bookId for library-level Q&A...');

      // Create new table with nullable bookId
      db.exec(`
        CREATE TABLE saved_qa_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bookId INTEGER,
          question TEXT NOT NULL,
          answer TEXT NOT NULL,
          suggestions TEXT,
          hidden INTEGER DEFAULT 0,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
        );
      `);

      // Copy existing data
      db.exec(`
        INSERT INTO saved_qa_new (id, bookId, question, answer, suggestions, hidden, createdAt)
        SELECT id, bookId, question, answer, suggestions, hidden, createdAt FROM saved_qa;
      `);

      // Drop old table and rename new one
      db.exec('DROP TABLE saved_qa;');
      db.exec('ALTER TABLE saved_qa_new RENAME TO saved_qa;');
      db.exec('CREATE INDEX IF NOT EXISTS idx_saved_qa_bookId ON saved_qa(bookId);');

      console.log('✓ Successfully migrated saved_qa table to allow NULL bookId');
    } else {
      console.log('✓ saved_qa.bookId already allows NULL');
    }
  }

  console.log('\n✓ Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
