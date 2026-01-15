import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { DatabaseManager } from '../database/schema.js';
import { LibraryService } from '../services/library.service.js';
import { AIAgentService } from '../services/ai-agent.service.js';
import { BookMetadataService } from '../services/book-metadata.service.js';
import { Book, Note, SavedQA } from '../types/index.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const dbManager = new DatabaseManager();
const libraryService = new LibraryService(dbManager);
const metadataService = new BookMetadataService();
const aiAgents = new Map<string, AIAgentService>();

function getOrCreateAgent(sessionId: string): AIAgentService {
  if (!aiAgents.has(sessionId)) {
    aiAgents.set(sessionId, new AIAgentService(libraryService));
  }
  return aiAgents.get(sessionId)!;
}

app.get('/api/books', (req, res) => {
  try {
    const { status, genre, tag, sortBy, sortOrder } = req.query;
    const books = libraryService.getAllBooks({
      status: status as string,
      genre: genre as string,
      tag: tag as string,
      sortBy: sortBy as 'title' | 'author' | 'dateAdded' | 'publishedYear' | 'rating',
      sortOrder: sortOrder as 'asc' | 'desc',
    });
    res.json({ books, count: books.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/genres', (req, res) => {
  try {
    const genres = libraryService.getUniqueGenres();
    res.json({ genres });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tags', (req, res) => {
  try {
    const tags = libraryService.getUniqueTags();
    res.json({ tags });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/books/:id', (req, res) => {
  try {
    const book = libraryService.getBookById(parseInt(req.params.id));
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    const notes = libraryService.getNotesByBookId(book.id!);
    res.json({ book, notes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    let bookData: Omit<Book, 'id'> = {
      ...req.body,
      dateAdded: new Date().toISOString(),
    };

    if (req.body.fetchMetadata !== false && bookData.title && bookData.author) {
      try {
        const metadata = await metadataService.enrichBookData(
          bookData.title,
          bookData.author,
          bookData.isbn
        );
        bookData = { ...bookData, ...metadata };
      } catch (error) {
        console.error('Error fetching metadata:', error);
      }
    }

    const id = libraryService.addBook(bookData);
    res.status(201).json({ id, message: 'Book added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/books/:id', (req, res) => {
  try {
    const success = libraryService.updateBook(parseInt(req.params.id), req.body);
    if (!success) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/books/:id', (req, res) => {
  try {
    const success = libraryService.deleteBook(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const books = libraryService.searchBooks(q as string);
    res.json({ books, count: books.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/:id/notes', (req, res) => {
  try {
    const note: Omit<Note, 'id'> = {
      ...req.body,
      bookId: parseInt(req.params.id),
      createdAt: new Date().toISOString(),
    };
    const id = libraryService.addNote(note);
    res.status(201).json({ id, message: 'Note added successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/books/:id/notes', (req, res) => {
  try {
    const notes = libraryService.getNotesByBookId(parseInt(req.params.id));
    res.json({ notes, count: notes.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:id', (req, res) => {
  try {
    const success = libraryService.updateNote(parseInt(req.params.id), req.body.content);
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  try {
    const success = libraryService.deleteNote(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/statistics', (req, res) => {
  try {
    const stats = libraryService.getStatistics();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/query', async (req, res) => {
  try {
    const { message, sessionId = 'default', bookContext } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get saved Q&A history (book-level or library-level)
    let savedQAHistory: Array<{ question: string; answer: string }> = [];
    if (bookContext?.id) {
      const savedQA = libraryService.getSavedQAByBookId(bookContext.id, false);
      savedQAHistory = savedQA.map(qa => ({ question: qa.question, answer: qa.answer }));
    } else {
      const savedQA = libraryService.getLibraryQA(false);
      savedQAHistory = savedQA.map(qa => ({ question: qa.question, answer: qa.answer }));
    }

    const agent = getOrCreateAgent(sessionId);
    const response = await agent.query(message, bookContext, savedQAHistory);
    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Saved Q&A endpoints - Book level
app.get('/api/books/:id/qa', (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const savedQA = libraryService.getSavedQAByBookId(parseInt(req.params.id), includeHidden);
    const hiddenCount = libraryService.getHiddenQACountByBookId(parseInt(req.params.id));
    res.json({ savedQA, count: savedQA.length, hiddenCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/books/:id/qa', (req, res) => {
  try {
    const qa: Omit<SavedQA, 'id'> = {
      bookId: parseInt(req.params.id),
      question: req.body.question,
      answer: req.body.answer,
      suggestions: req.body.suggestions,
      hidden: req.body.hidden || false,
      createdAt: new Date().toISOString(),
    };
    const id = libraryService.saveQA(qa);
    res.status(201).json({ id, message: 'Q&A saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Saved Q&A endpoints - Library level (no book context)
app.get('/api/library/qa', (req, res) => {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const savedQA = libraryService.getLibraryQA(includeHidden);
    const hiddenCount = libraryService.getHiddenLibraryQACount();
    res.json({ savedQA, count: savedQA.length, hiddenCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/library/qa', (req, res) => {
  try {
    const qa: Omit<SavedQA, 'id'> = {
      bookId: null,
      question: req.body.question,
      answer: req.body.answer,
      suggestions: req.body.suggestions,
      hidden: req.body.hidden || false,
      createdAt: new Date().toISOString(),
    };
    const id = libraryService.saveQA(qa);
    res.status(201).json({ id, message: 'Q&A saved successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/qa/:id/hide', (req, res) => {
  try {
    const success = libraryService.hideQA(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Saved Q&A not found' });
    }
    res.json({ message: 'Q&A hidden successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/qa/:id/unhide', (req, res) => {
  try {
    const success = libraryService.unhideQA(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Saved Q&A not found' });
    }
    res.json({ message: 'Q&A unhidden successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/qa/:id', (req, res) => {
  try {
    const success = libraryService.deleteSavedQA(parseInt(req.params.id));
    if (!success) {
      return res.status(404).json({ error: 'Saved Q&A not found' });
    }
    res.json({ message: 'Q&A deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/clear', (req, res) => {
  try {
    const { sessionId = 'default' } = req.body;
    const agent = aiAgents.get(sessionId);
    if (agent) {
      agent.clearHistory();
    }
    res.json({ message: 'Conversation history cleared' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Library Manager server running at http://${HOST}:${PORT}`);
  console.log(`📚 API endpoints available at http://${HOST}:${PORT}/api`);
});

process.on('SIGINT', () => {
  dbManager.close();
  process.exit(0);
});
