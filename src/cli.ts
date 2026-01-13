#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { DatabaseManager } from './database/schema.js';
import { LibraryService } from './services/library.service.js';
import { AIAgentService } from './services/ai-agent.service.js';
import { Book, Note } from './types/index.js';

config();

const program = new Command();
const dbManager = new DatabaseManager();
const libraryService = new LibraryService(dbManager);
const aiAgent = new AIAgentService(libraryService);

program
  .name('library')
  .description('AI-powered personal library management system')
  .version('1.0.0');

program
  .command('add')
  .description('Add a new book to the library')
  .action(async () => {
    const answers = await inquirer.prompt([
      { type: 'input', name: 'title', message: 'Book title:', validate: (input) => input.length > 0 },
      { type: 'input', name: 'author', message: 'Author:', validate: (input) => input.length > 0 },
      { type: 'input', name: 'isbn', message: 'ISBN (optional):' },
      { type: 'input', name: 'publisher', message: 'Publisher (optional):' },
      { type: 'input', name: 'publishedYear', message: 'Published year (optional):' },
      { type: 'input', name: 'genre', message: 'Genre (optional):' },
      { type: 'input', name: 'pages', message: 'Number of pages (optional):' },
      { type: 'input', name: 'description', message: 'Description (optional):' },
      {
        type: 'list',
        name: 'status',
        message: 'Status:',
        choices: ['want-to-read', 'reading', 'completed', 'on-hold'],
        default: 'want-to-read',
      },
      { type: 'input', name: 'tags', message: 'Tags (comma-separated, optional):' },
    ]);

    const book: Omit<Book, 'id'> = {
      title: answers.title,
      author: answers.author,
      isbn: answers.isbn || undefined,
      publisher: answers.publisher || undefined,
      publishedYear: answers.publishedYear ? parseInt(answers.publishedYear) : undefined,
      genre: answers.genre || undefined,
      pages: answers.pages ? parseInt(answers.pages) : undefined,
      description: answers.description || undefined,
      status: answers.status,
      dateAdded: new Date().toISOString(),
      tags: answers.tags || undefined,
    };

    const id = libraryService.addBook(book);
    console.log(chalk.green(`✓ Book added successfully with ID: ${id}`));
  });

program
  .command('list')
  .description('List all books')
  .option('-s, --status <status>', 'Filter by status')
  .option('-g, --genre <genre>', 'Filter by genre')
  .action((options) => {
    const books = libraryService.getAllBooks({
      status: options.status,
      genre: options.genre,
    });

    if (books.length === 0) {
      console.log(chalk.yellow('No books found.'));
      return;
    }

    console.log(chalk.bold(`\nFound ${books.length} book(s):\n`));
    books.forEach((book) => {
      console.log(chalk.cyan(`[${book.id}] ${book.title}`));
      console.log(`  Author: ${book.author}`);
      console.log(`  Status: ${getStatusColor(book.status)}`);
      if (book.genre) console.log(`  Genre: ${book.genre}`);
      if (book.rating) console.log(`  Rating: ${'⭐'.repeat(book.rating)}`);
      console.log();
    });
  });

program
  .command('search <query>')
  .description('Search books by title, author, or description')
  .action((query) => {
    const books = libraryService.searchBooks(query);

    if (books.length === 0) {
      console.log(chalk.yellow(`No books found matching "${query}"`));
      return;
    }

    console.log(chalk.bold(`\nFound ${books.length} book(s):\n`));
    books.forEach((book) => {
      console.log(chalk.cyan(`[${book.id}] ${book.title}`));
      console.log(`  Author: ${book.author}`);
      console.log(`  Status: ${getStatusColor(book.status)}`);
      console.log();
    });
  });

program
  .command('view <id>')
  .description('View detailed information about a book')
  .action((id) => {
    const book = libraryService.getBookById(parseInt(id));

    if (!book) {
      console.log(chalk.red(`Book with ID ${id} not found.`));
      return;
    }

    console.log(chalk.bold.cyan(`\n${book.title}\n`));
    console.log(`Author: ${book.author}`);
    console.log(`Status: ${getStatusColor(book.status)}`);
    if (book.isbn) console.log(`ISBN: ${book.isbn}`);
    if (book.publisher) console.log(`Publisher: ${book.publisher}`);
    if (book.publishedYear) console.log(`Published: ${book.publishedYear}`);
    if (book.genre) console.log(`Genre: ${book.genre}`);
    if (book.pages) console.log(`Pages: ${book.pages}`);
    if (book.rating) console.log(`Rating: ${'⭐'.repeat(book.rating)}`);
    if (book.description) console.log(`\nDescription:\n${book.description}`);
    if (book.tags) console.log(`\nTags: ${book.tags}`);

    const notes = libraryService.getNotesByBookId(book.id!);
    if (notes.length > 0) {
      console.log(chalk.bold(`\nNotes & Highlights (${notes.length}):`));
      notes.forEach((note) => {
        console.log(`\n[${note.type}]${note.pageNumber ? ` Page ${note.pageNumber}` : ''}`);
        console.log(note.content);
      });
    }
    console.log();
  });

program
  .command('update <id>')
  .description('Update book information')
  .action(async (id) => {
    const book = libraryService.getBookById(parseInt(id));

    if (!book) {
      console.log(chalk.red(`Book with ID ${id} not found.`));
      return;
    }

    const answers = await inquirer.prompt([
      { type: 'list', name: 'field', message: 'What would you like to update?', choices: [
        'status',
        'rating',
        'currentPage',
        'genre',
        'description',
        'tags',
      ]},
    ]);

    let value: any;

    if (answers.field === 'status') {
      const statusAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: 'Select status:',
        choices: ['want-to-read', 'reading', 'completed', 'on-hold'],
        default: book.status,
      }]);
      value = statusAnswer.value;
    } else if (answers.field === 'rating') {
      const ratingAnswer = await inquirer.prompt([{
        type: 'list',
        name: 'value',
        message: 'Select rating:',
        choices: ['1', '2', '3', '4', '5'],
      }]);
      value = parseInt(ratingAnswer.value);
    } else {
      const inputAnswer = await inquirer.prompt([{
        type: 'input',
        name: 'value',
        message: `Enter new ${answers.field}:`,
      }]);
      value = inputAnswer.value;
    }

    const updates: any = { [answers.field]: value };

    if (answers.field === 'status') {
      if (value === 'reading' && !book.dateStarted) {
        updates.dateStarted = new Date().toISOString();
      } else if (value === 'completed' && !book.dateCompleted) {
        updates.dateCompleted = new Date().toISOString();
      }
    }

    libraryService.updateBook(parseInt(id), updates);
    console.log(chalk.green('✓ Book updated successfully'));
  });

program
  .command('delete <id>')
  .description('Delete a book from the library')
  .action(async (id) => {
    const book = libraryService.getBookById(parseInt(id));

    if (!book) {
      console.log(chalk.red(`Book with ID ${id} not found.`));
      return;
    }

    const confirm = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: `Delete "${book.title}" by ${book.author}?`,
      default: false,
    }]);

    if (confirm.proceed) {
      libraryService.deleteBook(parseInt(id));
      console.log(chalk.green('✓ Book deleted successfully'));
    }
  });

program
  .command('note <bookId>')
  .description('Add a note or highlight to a book')
  .action(async (bookId) => {
    const book = libraryService.getBookById(parseInt(bookId));

    if (!book) {
      console.log(chalk.red(`Book with ID ${bookId} not found.`));
      return;
    }

    console.log(chalk.cyan(`Adding note to: ${book.title}\n`));

    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: 'Note type:',
        choices: ['note', 'highlight', 'quote'],
      },
      {
        type: 'input',
        name: 'pageNumber',
        message: 'Page number (optional):',
      },
      {
        type: 'input',
        name: 'content',
        message: 'Content:',
        validate: (input) => input.length > 0,
      },
    ]);

    const note: Omit<Note, 'id'> = {
      bookId: parseInt(bookId),
      type: answers.type,
      pageNumber: answers.pageNumber ? parseInt(answers.pageNumber) : undefined,
      content: answers.content,
      createdAt: new Date().toISOString(),
    };

    const id = libraryService.addNote(note);
    console.log(chalk.green(`✓ Note added successfully with ID: ${id}`));
  });

program
  .command('stats')
  .description('Show library statistics')
  .action(() => {
    const stats = libraryService.getStatistics();

    console.log(chalk.bold('\n📚 Library Statistics\n'));
    console.log(`Total books: ${chalk.cyan(stats.total)}`);
    console.log(`Completed: ${chalk.green(stats.completed)}`);
    console.log(`Currently reading: ${chalk.yellow(stats.reading)}`);
    console.log(`Want to read: ${chalk.blue(stats.wantToRead)}`);
    console.log(`On hold: ${chalk.gray(stats.onHold)}`);
    console.log();
  });

program
  .command('ask')
  .description('Ask the AI assistant about your library')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🤖 AI Library Assistant\n'));
    console.log('Ask me anything about your library! (Type "exit" to quit)\n');

    let continueChat = true;

    while (continueChat) {
      const { question } = await inquirer.prompt([{
        type: 'input',
        name: 'question',
        message: 'You:',
      }]);

      if (question.toLowerCase() === 'exit') {
        continueChat = false;
        console.log(chalk.cyan('\nGoodbye!\n'));
        break;
      }

      try {
        console.log(chalk.gray('\nThinking...\n'));
        const response = await aiAgent.query(question);

        console.log(chalk.green('Assistant:'), response.message);

        if (response.books && response.books.length > 0) {
          console.log(chalk.bold(`\n📚 Books (${response.books.length}):`));
          response.books.slice(0, 5).forEach((book) => {
            console.log(chalk.cyan(`  • ${book.title} by ${book.author}`));
          });
        }

        if (response.recommendations && response.recommendations.length > 0) {
          console.log(chalk.bold('\n💡 Recommendations:'));
          response.recommendations.forEach((book) => {
            console.log(chalk.cyan(`  • ${book.title} by ${book.author}`));
          });
        }

        console.log();
      } catch (error: any) {
        console.log(chalk.red(`Error: ${error.message}`));
      }
    }
  });

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green(status);
    case 'reading':
      return chalk.yellow(status);
    case 'want-to-read':
      return chalk.blue(status);
    case 'on-hold':
      return chalk.gray(status);
    default:
      return status;
  }
}

program.parse();
