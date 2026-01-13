# Enhancements - Automatic Metadata & AI Summaries

## Overview

The AI Library Manager now automatically fetches book metadata and generates AI summaries when you add books, making it incredibly easy to build a rich, detailed library.

## New Features

### 1. Automatic Metadata Retrieval

When you add a book with just the title and author, the system automatically:
- Fetches the book cover image from Google Books API
- Retrieves publisher information
- Gets publication year
- Finds page count
- Identifies genre/categories
- Looks up ISBN if not provided

### 2. AI-Generated Summaries

Using Claude AI, the system generates:
- Concise 5-7 sentence summaries for each book
- Context-aware descriptions based on available book information
- Helps you quickly understand what each book is about

### 3. Enhanced Display

**CLI View:**
```bash
npm run dev add      # Simplified book addition
npm run dev view 1   # See cover URL, summary, and all metadata
```

Features:
- Cover image URLs displayed
- AI summary shown prominently
- Publication year highlighted
- Organized metadata presentation

**Web Interface:**

Book Grid:
- Cover images displayed on each card
- Author and publication year visible
- Genre badges
- Click to view full details

Book Detail View:
- Large cover image with metadata sidebar
- AI summary in highlighted section
- Full description below
- Notes and highlights at the bottom

### 4. Simplified Book Addition

**CLI:**
```bash
npm run dev add
# You only need to enter:
# - Title
# - Author
# - ISBN (optional)
# - Status
# - Tags (optional)
# Everything else is fetched automatically!
```

**Web:**
- Clean, simple form with just 5 fields
- Real-time status updates during metadata fetch
- Success confirmation before closing

## Usage Examples

### Adding a Book via CLI

```bash
$ npm run dev add

? Book title: The Hobbit
? Author: J.R.R. Tolkien
? ISBN (optional):
? Status: want-to-read
? Tags (comma-separated, optional): fantasy, adventure

🔍 Fetching book metadata and generating summary...
✓ Cover image found
✓ Publisher: Houghton Mifflin Harcourt
✓ Published: 1937
✓ Pages: 310
✓ Genre: Fiction
✓ AI summary generated

✓ Book added successfully with ID: 1
```

### Viewing a Book

```bash
$ npm run dev view 1

The Hobbit

Author: J.R.R. Tolkien
Published: 1937
Status: want-to-read
ISBN: 9780547928227
Publisher: Houghton Mifflin Harcourt
Genre: Fiction
Pages: 310
Cover: https://books.google.com/books/content?id=...

📝 Summary:
The Hobbit follows Bilbo Baggins, a comfort-loving hobbit who is swept
into an epic quest by the wizard Gandalf and a company of thirteen
dwarves. Led by Thorin Oakenshield, they seek to reclaim the dwarves'
treasure from the dragon Smaug...

📖 Description:
A great modern classic and the prelude to The Lord of the Rings...
```

### Web Interface Flow

1. Click "Add Book"
2. Enter title and author
3. Optionally add ISBN for better accuracy
4. Select reading status
5. Click "Add Book"
6. System shows: "🔍 Fetching book metadata and generating AI summary..."
7. Book appears in grid with cover image!

## Technical Details

### Book Metadata Service

Located in: `src/services/book-metadata.service.ts`

Methods:
- `fetchMetadata(title, author, isbn)` - Gets data from Google Books API
- `generateSummary(title, author, description)` - Creates AI summary using Claude
- `enrichBookData(title, author, isbn, existingData)` - Combines both operations

### API Integration

**Google Books API:**
- Free, no API key required
- Query by title/author or ISBN
- Returns comprehensive book metadata

**Claude AI:**
- Requires ANTHROPIC_API_KEY in .env
- Uses claude-sonnet-4-20250514 model
- Generates contextual summaries

### Database Schema

New field added to books table:
```sql
summary TEXT
```

All existing operations updated to support the summary field.

## Configuration

### Skip Metadata Fetching

If you want to add a book without fetching metadata:

**CLI:**
```bash
npm run dev add --no-fetch
```

**Web API:**
```javascript
fetch('/api/books', {
  method: 'POST',
  body: JSON.stringify({
    title: 'Book Title',
    author: 'Author Name',
    fetchMetadata: false  // Skip metadata retrieval
  })
})
```

## Benefits

1. **Time Saving**: No need to manually enter all book details
2. **Rich Library**: Cover images make browsing more engaging
3. **Quick Understanding**: AI summaries help you remember what each book is about
4. **Accurate Data**: Google Books provides reliable metadata
5. **Better Organization**: Automatic genre categorization

## Error Handling

The system gracefully handles:
- Books not found in Google Books API (manual data preserved)
- Network failures (books still added with provided information)
- API rate limits (falls back to manual data)
- Missing API keys (metadata features disabled, core functionality works)

## Future Enhancements

Potential additions:
- Multiple API sources (OpenLibrary, Amazon)
- User-editable summaries
- Bulk import from CSV with automatic enrichment
- Cover image upload for books not found online
- Reading time estimates based on page count
- Related book suggestions based on metadata
