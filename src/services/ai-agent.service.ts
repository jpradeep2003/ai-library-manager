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

  private lastBookContextId: number | null = null;

  async query(userMessage: string, bookContext?: { id: number; title: string; author: string; summary?: string; genre?: string; tags?: string }, savedQAHistory?: Array<{ question: string; answer: string }>): Promise<AIResponse> {
    // Clear conversation history if book context changes
    if (bookContext?.id !== this.lastBookContextId) {
      this.conversationHistory = [];
      this.lastBookContextId = bookContext?.id || null;
    }

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

    const savedQAStr = savedQAHistory && savedQAHistory.length > 0
      ? `

PREVIOUS Q&A ABOUT THIS BOOK:
${savedQAHistory.map((qa, i) => `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer.substring(0, 300)}${qa.answer.length > 300 ? '...' : ''}`).join('\n\n')}

When generating follow-up suggestions, consider what topics have already been discussed and suggest NEW angles or deeper exploration.`
      : '';

    const bookContextStr = bookContext
      ? `
CURRENTLY SELECTED BOOK:
- Title: "${bookContext.title}"
- Author: ${bookContext.author}
- Book ID: ${bookContext.id}
${bookContext.genre ? `- Genre: ${bookContext.genre}` : ''}
${bookContext.tags ? `- Tags: ${bookContext.tags}` : ''}
${bookContext.summary ? `- Summary: ${bookContext.summary}` : ''}
${savedQAStr}

The user is asking about this specific book. Focus your responses on this book unless they explicitly ask about something else.`
      : '';

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
${bookContextStr}

Guidelines:
- Be conversational and helpful
- Use the available tools to access library data
- Provide personalized book recommendations based on the user's collection
- Help users discover books they might enjoy
- Track reading progress and suggest what to read next
- When discussing books, include relevant details like title, author, and status
- Be proactive in suggesting books from their "want-to-read" list
${bookContext ? `- Focus on the currently selected book "${bookContext.title}" unless asked otherwise` : ''}

IMPORTANT: At the end of your response, always suggest 3 relevant follow-up questions or actions the user might want to take. Format them as:
---SUGGESTIONS---
1. [First suggestion]
2. [Second suggestion]
3. [Third suggestion]`,
      messages: this.conversationHistory,
    });

    let finalResponse: AIResponse = {
      message: '',
      books: [],
      suggestions: [],
    };

    // Process response in a loop to handle multiple tool calls
    let currentResponse = response;
    const maxIterations = 5; // Prevent infinite loops

    for (let i = 0; i < maxIterations; i++) {
      const hasToolUse = currentResponse.content.some(block => block.type === 'tool_use');

      if (!hasToolUse) {
        // No tool use - extract text and we're done
        for (const block of currentResponse.content) {
          if (block.type === 'text') {
            finalResponse.message = block.text; // Use final text only, not accumulated
          }
        }
        this.conversationHistory.push({
          role: 'assistant',
          content: currentResponse.content,
        });
        break;
      }

      // Process tool use
      for (const block of currentResponse.content) {
        if (block.type === 'tool_use') {
          const toolResult = await this.handleToolUse(block.name, block.input);

          this.conversationHistory.push({
            role: 'assistant',
            content: currentResponse.content,
          });
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

          if (toolResult.books) {
            finalResponse.books = toolResult.books;
          }
          if (toolResult.recommendations) {
            finalResponse.recommendations = toolResult.recommendations;
          }

          // Get follow-up response
          currentResponse = await this.client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            tools,
            system: `You are an AI assistant for a personal library management system. Provide a complete, final response based on the tool results. Never say things like "Let me check", "I'll look that up", or "It looks like I need to". Just provide the direct answer.

IMPORTANT: At the end of your response, always suggest 3 relevant follow-up questions. Format them as:
---SUGGESTIONS---
1. [First suggestion]
2. [Second suggestion]
3. [Third suggestion]`,
            messages: this.conversationHistory,
          });

          break; // Process one tool at a time
        }
      }
    }

    // Extract suggestions from the response
    finalResponse = this.extractSuggestions(finalResponse);

    return finalResponse;
  }

  private extractSuggestions(response: AIResponse): AIResponse {
    const suggestionsMatch = response.message.match(/---SUGGESTIONS---\s*([\s\S]*?)$/i);
    if (suggestionsMatch) {
      const suggestionsText = suggestionsMatch[1].trim();
      const suggestions = suggestionsText
        .split(/\n/)
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.length > 0)
        .slice(0, 3);

      response.suggestions = suggestions;
      response.message = response.message.replace(/---SUGGESTIONS---[\s\S]*$/i, '').trim();
    }
    return response;
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
    const stats: any = this.libraryService.getStatistics();
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
