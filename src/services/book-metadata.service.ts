import Anthropic from '@anthropic-ai/sdk';

export interface BookMetadata {
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  genre?: string;
  pages?: number;
  description?: string;
  coverUrl?: string;
  summary?: string;
}

export class BookMetadataService {
  private client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  async fetchMetadata(title: string, author: string, isbn?: string): Promise<Partial<BookMetadata>> {
    try {
      let searchQuery = isbn ? isbn : `${title} ${author}`;
      const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(searchQuery)}`;

      const response = await fetch(googleBooksUrl);
      const data: any = await response.json();

      if (!data.items || data.items.length === 0) {
        console.log('No metadata found from Google Books API');
        return {};
      }

      const book = data.items[0].volumeInfo;
      const industryIdentifiers = book.industryIdentifiers || [];
      const isbnData = industryIdentifiers.find((id: any) => id.type === 'ISBN_13' || id.type === 'ISBN_10');

      const metadata: Partial<BookMetadata> = {
        title: book.title || title,
        author: book.authors ? book.authors.join(', ') : author,
        isbn: isbnData?.identifier || isbn,
        publisher: book.publisher,
        publishedYear: book.publishedDate ? parseInt(book.publishedDate.substring(0, 4)) : undefined,
        pages: book.pageCount,
        description: book.description,
        coverUrl: book.imageLinks?.thumbnail?.replace('http://', 'https://') || book.imageLinks?.smallThumbnail?.replace('http://', 'https://'),
        genre: book.categories ? book.categories[0] : undefined,
      };

      return metadata;
    } catch (error) {
      console.error('Error fetching book metadata:', error);
      return {};
    }
  }

  async generateSummary(bookTitle: string, author: string, description?: string): Promise<string> {
    try {
      const prompt = description
        ? `Please provide a concise 5-7 sentence summary of the book "${bookTitle}" by ${author}. Here's the book description: ${description}\n\nProvide only the summary, no additional commentary.`
        : `Please provide a concise 5-7 sentence summary of the book "${bookTitle}" by ${author}. Provide only the summary, no additional commentary.`;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text.trim();
      }

      return '';
    } catch (error) {
      console.error('Error generating summary:', error);
      return '';
    }
  }

  async enrichBookData(
    title: string,
    author: string,
    isbn?: string,
    existingData?: Partial<BookMetadata>
  ): Promise<Partial<BookMetadata>> {
    const metadata = await this.fetchMetadata(title, author, isbn);

    const mergedData = {
      ...metadata,
      ...existingData,
    };

    const finalDescription = mergedData.description || existingData?.description;
    const summary = await this.generateSummary(
      mergedData.title || title,
      mergedData.author || author,
      finalDescription
    );

    return {
      ...mergedData,
      summary: summary || undefined,
    };
  }
}
