export interface Book {
  id?: number;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  genre?: string;
  pages?: number;
  language?: string;
  description?: string;
  coverUrl?: string;
  summary?: string;
  status: 'want-to-read' | 'reading' | 'completed' | 'on-hold';
  rating?: number;
  dateAdded: string;
  dateStarted?: string;
  dateCompleted?: string;
  currentPage?: number;
  tags?: string;
}

export interface Note {
  id?: number;
  bookId: number;
  content: string;
  pageNumber?: number;
  type: 'note' | 'highlight' | 'quote';
  createdAt: string;
  updatedAt?: string;
}

export interface SearchResult {
  book: Book;
  relevanceScore: number;
  matchReason: string;
}

export interface AIResponse {
  message: string;
  books?: Book[];
  recommendations?: Book[];
  action?: string;
  suggestions?: string[];
}

export interface SavedQA {
  id?: number;
  bookId?: number | null;  // null for library-level Q&A
  question: string;
  answer: string;
  suggestions?: string;
  hidden?: boolean;
  createdAt: string;
}

export interface GenreTaxonomy {
  id?: number;
  genreName: string;
  subGenres: string[];  // Array of tag names
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}
