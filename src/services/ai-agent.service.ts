import Anthropic from '@anthropic-ai/sdk';
import { LibraryService } from './library.service.js';
import { Book, AIResponse } from '../types/index.js';

export class AIAgentService {
  private client: Anthropic;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(
    private libraryService: LibraryService,
    apiKey?: string
  ) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async query(userMessage: string): Promise<AIResponse> {
    const tools: Anthropic.Tool[] = [
      {
        name: 'search_books',
        description: 'Search for books in the library using full-text search. Returns books matching the query.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query to find books by title, author, description, genre, or tags',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_all_books',
        description: 'Get all books from the library, optionally filtered by status or genre',
        input_schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['want-to-read', 'reading', 'completed', 'on-hold'],
              description: 'Filter books by reading status',
            },
            genre: {
              type: 'string',
              description: 'Filter books by genre',
            },
          },
        },
      },
      {
        name: 'get_book_details',
        description: 'Get detailed information about a specific book by ID',
        input_schema: {
          type: 'object',
          properties: {
            bookId: {
              type: 'number',
              description: 'The ID of the book',
            },
          },
          required: ['bookId'],
        },
      },
      {
        name: 'get_statistics',
        description: 'Get library statistics including total books, completed, reading, etc.',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_notes',
        description: 'Get all notes and highlights for a specific book',
        input_schema: {
          type: 'object',
          properties: {
            bookId: {
              type: 'number',
              description: 'The ID of the book',
            },
          },
          required: ['bookId'],
        },
      },
      {
        name: 'recommend_books',
        description: 'Get book recommendations based on user preferences, reading history, or similar books',
        input_schema: {
          type: 'object',
          properties: {
            basedOn: {
              type: 'string',
              description: 'What to base recommendations on (genre, author, completed books, etc.)',
            },
          },
          required: ['basedOn'],
        },
      },
    ];

    const libraryContext = await this.getLibraryContext();

    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools,
      system: `You are an AI assistant for a personal library management system. You help users manage their book collection, search for books, get recommendations, and track their reading progress.

Current Library Context:
${libraryContext}

Guidelines:
- Be conversational and helpful
- Use the available tools to access library data
- Provide personalized book recommendations based on the user's collection
- Help users discover books they might enjoy
- Track reading progress and suggest what to read next
- When discussing books, include relevant details like title, author, and status
- Be proactive in suggesting books from their "want-to-read" list`,
      messages: this.conversationHistory,
    });

    let finalResponse: AIResponse = {
      message: '',
      books: [],
    };

    const assistantMessage: Anthropic.MessageParam = {
      role: 'assistant',
      content: response.content,
    };

    for (const block of response.content) {
      if (block.type === 'text') {
        finalResponse.message += block.text;
      } else if (block.type === 'tool_use') {
        const toolResult = await this.handleToolUse(block.name, block.input);

        this.conversationHistory.push(assistantMessage);
        this.conversationHistory.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            },
          ],
        });

        const followUp = await this.client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          tools,
          system: `You are an AI assistant for a personal library management system. Provide a natural, conversational response based on the tool results.`,
          messages: this.conversationHistory,
        });

        for (const followUpBlock of followUp.content) {
          if (followUpBlock.type === 'text') {
            finalResponse.message += followUpBlock.text;
          }
        }

        if (toolResult.books) {
          finalResponse.books = toolResult.books;
        }
        if (toolResult.recommendations) {
          finalResponse.recommendations = toolResult.recommendations;
        }

        this.conversationHistory.push({
          role: 'assistant',
          content: followUp.content,
        });

        break;
      }
    }

    if (response.stop_reason === 'end_turn' && finalResponse.message === '') {
      this.conversationHistory.push(assistantMessage);
    }

    return finalResponse;
  }

  private async handleToolUse(toolName: string, input: any): Promise<any> {
    switch (toolName) {
      case 'search_books':
        const books = this.libraryService.searchBooks(input.query);
        return { books, count: books.length };

      case 'get_all_books':
        const allBooks = this.libraryService.getAllBooks({
          status: input.status,
          genre: input.genre,
        });
        return { books: allBooks, count: allBooks.length };

      case 'get_book_details':
        const book = this.libraryService.getBookById(input.bookId);
        if (!book) return { error: 'Book not found' };
        const notes = this.libraryService.getNotesByBookId(input.bookId);
        return { book, notes };

      case 'get_statistics':
        return this.libraryService.getStatistics();

      case 'get_notes':
        const bookNotes = this.libraryService.getNotesByBookId(input.bookId);
        return { notes: bookNotes, count: bookNotes.length };

      case 'recommend_books':
        return this.generateRecommendations(input.basedOn);

      default:
        return { error: 'Unknown tool' };
    }
  }

  private async getLibraryContext(): Promise<string> {
    const stats = this.libraryService.getStatistics();
    const recentBooks = this.libraryService.getRecentBooks(5);

    return `
Library Statistics:
- Total books: ${stats.total}
- Completed: ${stats.completed}
- Currently reading: ${stats.reading}
- Want to read: ${stats.wantToRead}
- On hold: ${stats.onHold}

Recently added books:
${recentBooks.map(b => `- "${b.title}" by ${b.author} (${b.status})`).join('\n')}
    `.trim();
  }

  private generateRecommendations(basedOn: string): any {
    const completedBooks = this.libraryService.getBooksByStatus('completed');
    const wantToReadBooks = this.libraryService.getBooksByStatus('want-to-read');

    const genreCount: { [key: string]: number } = {};
    completedBooks.forEach(book => {
      if (book.genre) {
        genreCount[book.genre] = (genreCount[book.genre] || 0) + 1;
      }
    });

    const favoriteGenres = Object.entries(genreCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre);

    const recommendations = wantToReadBooks
      .filter(book => book.genre && favoriteGenres.includes(book.genre))
      .slice(0, 5);

    return {
      recommendations,
      favoriteGenres,
      basedOn,
      message: `Based on your reading history, you seem to enjoy ${favoriteGenres.join(', ')}`,
    };
  }

  clearHistory() {
    this.conversationHistory = [];
  }

  getConversationHistory(): Anthropic.MessageParam[] {
    return this.conversationHistory;
  }
}
