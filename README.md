# AI Library Manager

A personal library management system powered by Claude AI, built using Claude Code agent principles. Manage your book collection with natural language queries, intelligent recommendations, and comprehensive tracking features.

## Features

- **Book Management**: Add, edit, view, and delete books with detailed metadata
- **AI-Powered Assistant**: Natural language queries about your library using Claude
- **Smart Search**: Full-text search across titles, authors, descriptions, and tags
- **Reading Progress**: Track books you want to read, are reading, completed, or on hold
- **Notes & Highlights**: Capture quotes, highlights, and personal notes from your books
- **Recommendations**: Get personalized book suggestions based on your reading history
- **Statistics Dashboard**: View your reading statistics at a glance
- **Dual Interface**: Both CLI and Web interface for flexible interaction

## Technology Stack

- **TypeScript**: Type-safe development
- **SQLite**: Fast, embedded database with full-text search
- **Claude AI**: Anthropic's Claude for natural language understanding
- **Express**: Web API server
- **Commander**: CLI framework
- **Inquirer**: Interactive CLI prompts
- **Chalk**: Terminal styling

## Prerequisites

- Node.js 18+
- Anthropic API key (get one at https://console.anthropic.com)

## Installation

1. Clone the repository:
```bash
cd claude-library-agent
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

## Usage

### CLI Interface

The CLI provides quick access to all library management features.

#### Add a book
```bash
npm run dev add
```

#### List all books
```bash
npm run dev list
```

#### Filter by status or genre
```bash
npm run dev list --status reading
npm run dev list --genre "Science Fiction"
```

#### Search books
```bash
npm run dev search "tolkien"
```

#### View book details
```bash
npm run dev view <book-id>
```

#### Update a book
```bash
npm run dev update <book-id>
```

#### Delete a book
```bash
npm run dev delete <book-id>
```

#### Add notes/highlights
```bash
npm run dev note <book-id>
```

#### View statistics
```bash
npm run dev stats
```

#### AI Assistant (Interactive chat)
```bash
npm run dev ask
```

Example queries:
- "What books am I currently reading?"
- "Recommend me a science fiction book"
- "Show me all books by Isaac Asimov"
- "What should I read next?"
- "How many books have I completed this year?"

### Web Interface

1. Start the web server:
```bash
npm run web
```

2. Open your browser to `http://localhost:3000`

The web interface provides:
- Visual book grid with search and filtering
- Real-time statistics dashboard
- Interactive AI chat assistant
- Book details with notes and highlights
- Easy book addition through forms

## Project Structure

```
claude-library-agent/
├── src/
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── database/
│   │   └── schema.ts          # Database schema and initialization
│   ├── services/
│   │   ├── library.service.ts # Book and note management
│   │   └── ai-agent.service.ts # AI assistant with Claude
│   ├── web/
│   │   └── server.ts          # Express API server
│   └── cli.ts                 # CLI application
├── public/
│   └── index.html             # Web interface
├── package.json
├── tsconfig.json
└── .env                       # Environment variables
```

## Database Schema

### Books Table
- ID, Title, Author, ISBN
- Publisher, Published Year
- Genre, Pages, Language
- Description, Cover URL
- Status (want-to-read, reading, completed, on-hold)
- Rating (1-5 stars)
- Dates (added, started, completed)
- Current page, Tags

### Notes Table
- ID, Book ID
- Content
- Page number
- Type (note, highlight, quote)
- Created/Updated timestamps

## AI Agent Principles

This project demonstrates Claude Code agent principles:

1. **Tool Use**: The AI agent uses tools to interact with the library database
2. **Context Management**: Maintains conversation history for contextual responses
3. **Natural Language Understanding**: Interprets user queries and maps to appropriate actions
4. **Proactive Recommendations**: Suggests books based on reading patterns
5. **Multi-turn Conversations**: Maintains context across multiple interactions

## API Endpoints

- `GET /api/books` - List all books (with optional filters)
- `GET /api/books/:id` - Get book details
- `POST /api/books` - Add a new book
- `PUT /api/books/:id` - Update book
- `DELETE /api/books/:id` - Delete book
- `GET /api/search?q=query` - Search books
- `POST /api/books/:id/notes` - Add note to book
- `GET /api/books/:id/notes` - Get book notes
- `GET /api/statistics` - Get library statistics
- `POST /api/ai/query` - Query AI assistant
- `POST /api/ai/clear` - Clear conversation history

## Development

Build the project:
```bash
npm run build
```

Run in production:
```bash
npm start
```

## Example Workflow

1. Add books to your library via CLI or web interface
2. Mark books as "reading" when you start them
3. Add notes and highlights as you read
4. Update your progress by changing status to "completed"
5. Ask the AI assistant for recommendations
6. Discover patterns in your reading through statistics

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT

## Acknowledgments

Built with Claude AI and following Claude Code agent principles for agentic tool use and natural language interaction.
