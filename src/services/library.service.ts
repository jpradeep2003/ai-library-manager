import { DatabaseManager } from '../database/schema.js';
import { Book, Note, SavedQA, GenreTaxonomy } from '../types/index.js';
import type Database from 'better-sqlite3';

export class LibraryService {
  private db: Database.Database;

  constructor(private dbManager: DatabaseManager) {
    this.db = dbManager.getDatabase();
  }

  // Check if a book with the same title and author already exists
  findDuplicateBook(title: string, author: string): Book | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM books WHERE LOWER(title) = LOWER(?) AND LOWER(author) = LOWER(?)'
    );
    return stmt.get(title.trim(), author.trim()) as Book | undefined;
  }

  addBook(book: Omit<Book, 'id'>): number {
    // Check for duplicate
    const existing = this.findDuplicateBook(book.title, book.author);
    if (existing) {
      throw new Error(`Book "${book.title}" by ${book.author} already exists in your library`);
    }

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
      qa.bookId || null,
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

  // Library-level Q&A (bookId is null)
  getLibraryQA(includeHidden: boolean = false): SavedQA[] {
    const query = includeHidden
      ? 'SELECT * FROM saved_qa WHERE bookId IS NULL ORDER BY createdAt ASC'
      : 'SELECT * FROM saved_qa WHERE bookId IS NULL AND (hidden = 0 OR hidden IS NULL) ORDER BY createdAt ASC';
    const stmt = this.db.prepare(query);
    const results = stmt.all() as any[];
    return results.map(r => ({
      ...r,
      hidden: r.hidden === 1
    })) as SavedQA[];
  }

  getHiddenLibraryQACount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM saved_qa WHERE bookId IS NULL AND hidden = 1');
    const result = stmt.get() as { count: number };
    return result.count;
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

  // ==================== Genre Taxonomy Methods ====================

  // Predefined keyword mappings for genre classification
  private genreKeywordMap: Record<string, string[]> = {
    'AI & Technology': ['artificial intelligence', 'ai', 'neural networks', 'machine learning', 'ai safety', 'technological singularity', 'innovation', 'tech'],
    'Science & Biology': ['evolution', 'genetics', 'biology', 'natural selection', 'human evolution', 'chromosomes', 'science', 'scientific'],
    'Philosophy & Ideas': ['philosophy', 'futurism', 'existential risk', 'transhumanism', 'consciousness', 'cognitive science', 'ideas'],
    'Computing & Math': ['algorithms', 'computer science', 'problem solving', 'mathematics', 'puzzles', 'programming', 'coding'],
    'Health & Medicine': ['aging', 'longevity', 'death', 'lifespan', 'health', 'medicine', 'biology', 'medical'],
    'History & Culture': ['history', 'biography', 'silicon valley', 'tech history', 'science writing', 'popular science', 'culture']
  };

  // Get all taxonomy entries
  getTaxonomy(): GenreTaxonomy[] {
    const stmt = this.db.prepare('SELECT * FROM genre_taxonomy ORDER BY sort_order ASC');
    const results = stmt.all() as any[];
    return results.map(r => ({
      id: r.id,
      genreName: r.genre_name,
      subGenres: JSON.parse(r.sub_genres),
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  // Save entire taxonomy (replaces existing)
  saveTaxonomy(taxonomy: GenreTaxonomy[]): void {
    const deleteStmt = this.db.prepare('DELETE FROM genre_taxonomy');
    const insertStmt = this.db.prepare(`
      INSERT INTO genre_taxonomy (genre_name, sub_genres, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      deleteStmt.run();
      const now = new Date().toISOString();
      taxonomy.forEach((genre, index) => {
        insertStmt.run(
          genre.genreName,
          JSON.stringify(genre.subGenres),
          index,
          genre.createdAt || now,
          now
        );
      });
    });

    transaction();
  }

  // Add a single genre
  addGenre(genre: Omit<GenreTaxonomy, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO genre_taxonomy (genre_name, sub_genres, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      genre.genreName,
      JSON.stringify(genre.subGenres),
      genre.sortOrder,
      genre.createdAt,
      genre.updatedAt || null
    );
    return result.lastInsertRowid as number;
  }

  // Update a genre
  updateGenre(id: number, updates: Partial<GenreTaxonomy>): boolean {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.genreName !== undefined) {
      fields.push('genre_name = ?');
      values.push(updates.genreName);
    }
    if (updates.subGenres !== undefined) {
      fields.push('sub_genres = ?');
      values.push(JSON.stringify(updates.subGenres));
    }
    if (updates.sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(updates.sortOrder);
    }
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    if (fields.length === 1) return false; // Only updated_at

    values.push(id);
    const stmt = this.db.prepare(`UPDATE genre_taxonomy SET ${fields.join(', ')} WHERE id = ?`);
    const result = stmt.run(...values);
    return result.changes > 0;
  }

  // Delete a genre
  deleteGenre(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM genre_taxonomy WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Get all tags with their frequencies
  getTagFrequencies(): Map<string, number> {
    const stmt = this.db.prepare('SELECT tags FROM books WHERE tags IS NOT NULL');
    const results = stmt.all() as { tags: string }[];
    const frequencies = new Map<string, number>();

    results.forEach(r => {
      if (r.tags) {
        r.tags.split(',').forEach(tag => {
          const trimmed = tag.trim().toLowerCase();
          if (trimmed) {
            frequencies.set(trimmed, (frequencies.get(trimmed) || 0) + 1);
          }
        });
      }
    });

    return frequencies;
  }

  // Auto-generate taxonomy from tags
  generateTaxonomy(minFrequency: number = 1): GenreTaxonomy[] {
    const tagFrequencies = this.getTagFrequencies();
    const genreMap = new Map<string, Set<string>>();

    // Initialize genre buckets
    Object.keys(this.genreKeywordMap).forEach(genre => {
      genreMap.set(genre, new Set());
    });

    // Classify tags into genres
    const unclassifiedTags: string[] = [];

    tagFrequencies.forEach((freq, tag) => {
      if (freq < minFrequency) return;

      let classified = false;
      for (const [genre, keywords] of Object.entries(this.genreKeywordMap)) {
        // Check if tag matches any keyword (partial match)
        if (keywords.some(keyword => tag.includes(keyword) || keyword.includes(tag))) {
          genreMap.get(genre)?.add(tag);
          classified = true;
          break;
        }
      }

      if (!classified) {
        unclassifiedTags.push(tag);
      }
    });

    // Build taxonomy array
    const taxonomy: GenreTaxonomy[] = [];
    const now = new Date().toISOString();
    let sortOrder = 0;

    genreMap.forEach((tags, genreName) => {
      if (tags.size > 0) {
        // Sort tags by frequency, take top 6
        const sortedTags = Array.from(tags)
          .sort((a, b) => (tagFrequencies.get(b) || 0) - (tagFrequencies.get(a) || 0))
          .slice(0, 6);

        taxonomy.push({
          genreName,
          subGenres: sortedTags,
          sortOrder: sortOrder++,
          createdAt: now
        });
      }
    });

    // Limit to 6 genres, sorted by total tag frequency
    return taxonomy
      .sort((a, b) => {
        const aTotal = a.subGenres.reduce((sum, tag) => sum + (tagFrequencies.get(tag) || 0), 0);
        const bTotal = b.subGenres.reduce((sum, tag) => sum + (tagFrequencies.get(tag) || 0), 0);
        return bTotal - aTotal;
      })
      .slice(0, 6)
      .map((g, i) => ({ ...g, sortOrder: i }));
  }

  // Get or generate taxonomy
  getOrGenerateTaxonomy(): GenreTaxonomy[] {
    const existing = this.getTaxonomy();
    if (existing.length > 0) {
      return existing;
    }

    // Auto-generate and save
    const generated = this.generateTaxonomy();
    if (generated.length > 0) {
      this.saveTaxonomy(generated);
    }
    return generated;
  }

  // Get books by tag (for filtering)
  getBooksByTag(tag: string): Book[] {
    const stmt = this.db.prepare('SELECT * FROM books WHERE LOWER(tags) LIKE ?');
    return stmt.all(`%${tag.toLowerCase()}%`) as Book[];
  }

  // Get books by any of multiple tags (for genre filtering)
  getBooksByTags(tags: string[]): Book[] {
    if (tags.length === 0) return [];

    const conditions = tags.map(() => 'LOWER(tags) LIKE ?').join(' OR ');
    const params = tags.map(tag => `%${tag.toLowerCase()}%`);

    const stmt = this.db.prepare(`SELECT * FROM books WHERE ${conditions}`);
    return stmt.all(...params) as Book[];
  }
}
