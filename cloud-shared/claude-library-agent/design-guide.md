# AI Library Manager - Design Guide for Claude Code

## Purpose
This document helps Claude Code understand the design intentions from Figma and implement them correctly.

## Design Principles
1. **Three-Panel Layout**: Library List (left) | Book Details (center) | AI Chat (right)
2. **Responsive**: Adapt to mobile with stacked panels
3. **Reading-Focused**: Clean, minimal distractions
4. **AI-First**: Chat is prominent, not hidden

## Screen Structure

### Desktop Layout (Web)
```
┌──────────────┬────────────────┬──────────────┐
│   Library    │  Book Details  │   AI Chat    │
│   (15-35%)   │    (35-50%)    │   (35-50%)   │
│              │                │              │
│  - Filters   │  - Cover       │  - Context   │
│  - Sort      │  - Metadata    │  - Messages  │
│  - Search    │  - Progress    │  - Suggest   │
│  - Book List │  - Notes       │  - Input     │
└──────────────┴────────────────┴──────────────┘
```

### Mobile Layout (iOS/Android)
```
Navigation: Bottom tabs or swipe gestures
Screens:
1. Library (List view)
2. Book Details (Full screen)
3. AI Chat (Full screen)
4. Settings
```

## Component Breakdown

### 1. Library Panel
**Elements:**
- Search bar (sticky at top)
- Filter chips (Genre, Status, Tags)
- Sort dropdown
- Statistics summary
- Book cards (scrollable list)

**Book Card Structure:**
```
┌─────────────────────────────────┐
│ [Cover] Title                   │
│         by Author               │
│         Genre • Status          │
│         [Progress: 45/300]      │
│         ★★★★☆                   │
└─────────────────────────────────┘
```

### 2. Book Details Panel
**Sections (Tabs or Accordion):**
- Overview
  - Cover image (larger)
  - Metadata (publisher, year, ISBN, pages, language)
  - Description
  - Tags (clickable chips)
  - Reading progress
  - Dates (added, started, completed)
  - Rating selector
  - Action buttons (Edit, Delete)
- Notes
  - Note type filter (All, Notes, Highlights, Quotes)
  - Add note button
  - Notes list with page numbers
- Q&A History
  - Saved questions/answers specific to this book

### 3. AI Chat Panel
**Structure:**
- Context banner (shows current book or "Library-wide")
- Message area (scrollable)
- Suggestion chips (quick prompts)
- Input field with send button
- Minimize/maximize toggle

**Message Structure:**
```
User: [Question text]
Assistant: [Answer with book references as links]
         [Suggestion chips for follow-up]
```

### 4. Settings/Genre Taxonomy
**Structure:**
- Genre list (expandable)
- Add genre button
- Sub-genre tags under each genre
- Auto-generate button
- Reset button

## Color & Typography Guidance

### For Figma AI Prompts
Use these descriptions when generating designs:

**Color Palette:**
- Primary: "Deep reading-friendly blue or warm neutral"
- Background: "Soft off-white or very light gray for reduced eye strain"
- Accent: "Warm orange or teal for buttons and highlights"
- Text: "Dark gray (not pure black) for readability"
- Status colors:
  - Want to Read: Blue
  - Reading: Orange
  - Completed: Green
  - On Hold: Gray

**Typography:**
- Headings: "Clean, modern sans-serif (e.g., Inter, SF Pro, Roboto)"
- Body: "Readable serif or sans-serif at 16px minimum"
- Book titles: "Slightly larger, medium weight"
- Metadata: "Smaller, lighter weight"

## Key User Interactions

### Book Selection
1. Click book card → Book panel opens, Library minimizes, Chat updates context
2. Back/Forward buttons for book history
3. Close button to deselect book

### Adding Notes
1. Click "Add Note" button
2. Modal/slide-up with:
   - Text area
   - Note type selector (Note/Highlight/Quote)
   - Optional page number field
   - Save/Cancel buttons

### AI Conversation
1. Type question → Send
2. AI responds with streaming text
3. Book references appear as clickable links
4. Suggestion chips appear below answer
5. Hide/unhide saved Q&A

### Filtering & Search
1. Filter chips toggle on/off
2. Search bar with real-time results
3. Sort dropdown changes order
4. Clear filters button

## Mobile-Specific Considerations

### iOS (SwiftUI)
- Use native navigation (NavigationStack)
- SF Symbols for icons
- Bottom sheet for add/edit forms
- Swipe gestures for navigation
- Pull-to-refresh

### Android (Jetpack Compose)
- Material Design 3 components
- Bottom navigation or navigation rail
- FAB for primary actions
- Material icons
- Swipe-to-refresh

### Responsive Breakpoints
- Mobile: < 768px (single column)
- Tablet: 768-1024px (two columns)
- Desktop: > 1024px (three columns)

## Figma-to-Code Translation Guide

### When Claude Code Asks for Design Details

**Layout Measurements:**
- Panel widths: "15%, 50%, 35%" (adjustable)
- Padding: "16px standard, 24px for sections"
- Gap between elements: "8px small, 16px medium, 24px large"
- Border radius: "8px for cards, 4px for buttons"

**Component States:**
- Default
- Hover (desktop)
- Active/Selected
- Disabled
- Loading

**Animations:**
- Panel resize: 300ms ease-in-out
- Message appearance: Fade in 200ms
- Modal/sheet: Slide up 250ms
- Button press: Scale 0.95, 100ms

## Export Instructions from Figma

### What to Export:
1. **Screenshots of key screens** (PNG, 2x resolution)
   - Library view
   - Book details view
   - AI chat view
   - Mobile views
   - Modals/forms

2. **Component specifications** (use Figma's Inspect panel)
   - Colors (hex codes)
   - Font sizes and weights
   - Spacing values
   - Border radius
   - Shadow values

3. **Design tokens** (if available)
   - Export as JSON from Figma plugins like "Design Tokens"

### How to Share with Claude Code:
```
Structure your prompt like:

"I have the Figma designs for the AI Library Manager. Here are the key specs:

**Colors:**
- Primary: #3B82F6
- Background: #F9FAFB
- Text: #1F2937
[etc.]

**Layout:**
- Desktop: Three panels at 25%, 50%, 25%
- Mobile: Single column with bottom navigation
[etc.]

**Components to implement:**
1. Book card with [screenshot]
2. Note editor with [screenshot]
[etc.]

Please update the existing placeholder UI to match these designs."
```

## Iteration Strategy

### Phase 1: Core Layout
- Implement three-panel structure
- Basic responsive behavior
- Panel resizing

### Phase 2: Components
- Book cards
- Form inputs
- Buttons and chips

### Phase 3: Styling
- Apply colors
- Typography
- Spacing
- Borders and shadows

### Phase 4: Interactions
- Animations
- State changes
- Loading states

### Phase 5: Mobile
- Responsive breakpoints
- Touch interactions
- Native platform features

## Common Design Patterns for This App

### Pattern 1: Master-Detail
Library list (master) → Book details (detail)

### Pattern 2: Context-Aware Chat
Chat adapts based on book selection

### Pattern 3: Progressive Disclosure
Collapsible sections, tabs, modals for secondary actions

### Pattern 4: Quick Actions
Floating action buttons, context menus, swipe actions

## Accessibility Considerations

### Minimum Requirements:
- Color contrast ratio: 4.5:1 for text
- Touch targets: 44x44px minimum
- Keyboard navigation support
- Screen reader labels
- Focus indicators
- Skip navigation links

## Testing the Design in Code

### Visual Regression Checklist:
- [ ] Layout matches Figma at breakpoints
- [ ] Colors match design system
- [ ] Typography sizes and weights correct
- [ ] Spacing consistent
- [ ] Interactive states work
- [ ] Animations smooth
- [ ] Responsive behavior correct
- [ ] Dark mode (if applicable)

---

## Quick Start Template for Claude Code

When you're ready to implement, provide Claude Code with:

```markdown
# Design Implementation Request

## Context
I have a working AI Library Manager app with placeholder UI. I need to update it with these designs from Figma.

## Design Assets
[Attach screenshots or describe key screens]

## Color Palette
- Primary: [hex]
- Secondary: [hex]
- Background: [hex]
- Text: [hex]

## Typography
- Headings: [font family, size, weight]
- Body: [font family, size, weight]

## Key Components to Update
1. Book card - [screenshot + specifications]
2. Book details panel - [screenshot + specifications]
3. AI chat interface - [screenshot + specifications]

## Priority
1. Desktop layout first
2. Then mobile responsive
3. Polish animations last

## Technical Constraints
- Keep existing API structure
- Maintain current state management
- Use vanilla JS/CSS (or specify framework)
```

---

*This guide helps bridge the gap between Figma design and Claude Code implementation, even for non-designers.*