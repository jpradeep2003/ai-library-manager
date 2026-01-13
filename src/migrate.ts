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

  console.log('\n✓ Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
} finally {
  db.close();
}
