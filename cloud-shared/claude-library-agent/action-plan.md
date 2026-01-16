# Action Plan: From Spec → Figma → Claude Code

## Overview
This is your step-by-step guide to take your AI Library Manager from specification to designed and implemented UI.

---

## Step 1: Prepare Figma AI Prompts (30 minutes)

### Task: Create a prompt document for Figma AI

**What to do:**
1. Sign up for Figma (free plan is fine)
2. Create a new file called "AI Library Manager"
3. Use Figma AI to generate designs with these prompts:

#### Prompt 1: Main Desktop Layout
```
Create a modern web application interface for a book library manager with three panels:

Left panel (30% width):
- Search bar at top
- Filter chips for Genre, Status, Tags
- Scrollable list of book cards
- Each card shows: book cover thumbnail, title, author, genre, reading status, progress bar, star rating

Center panel (40% width):
- Large book cover image at top
- Book metadata below (title, author, publisher, year, pages, ISBN)
- Tabs for: Overview, Notes, Q&A
- Reading progress indicator
- Edit and Delete buttons

Right panel (30% width):
- Context banner showing current book title
- Chat conversation area
- Suggestion chips for common questions
- Message input box at bottom

Use a clean, modern design with:
- Soft neutral background colors
- Blue accents for interactive elements
- Card-based layouts with subtle shadows
- Clear typography hierarchy
- Plenty of white space
```

#### Prompt 2: Mobile Library View
```
Create a mobile app screen for a book library with:
- Top search bar
- Horizontal scrolling filter chips (Genre, Status)
- Grid of book cards (2 columns)
- Each card shows cover, title, author, progress

Use bottom navigation with tabs:
- Library (home icon)
- Search (magnifying glass)
- AI Chat (sparkle/stars icon)
- Settings (gear icon)

Modern, clean design with material design principles
```

#### Prompt 3: Mobile Book Details
```
Create a mobile book details screen with:
- Back button top left
- Large book cover centered
- Title and author below cover
- Reading progress bar
- Tabs: Overview, Notes, AI Chat
- Floating action button for "Add Note"

Clean, reading-focused design
```

#### Prompt 4: AI Chat Interface
```
Create a modern AI chat interface with:
- Context banner at top (collapsible)
- Conversation area with user and AI messages
- AI messages have suggestion chips below them
- Book title references are styled as clickable links
- Input area at bottom with send button
- Maximize/minimize toggle button

Design should feel conversational and friendly
```

---

## Step 2: Generate and Refine Designs (1-2 hours)

### Task: Iterate on Figma AI outputs

**What to do:**
1. Generate designs using the prompts above
2. If results aren't perfect, refine with follow-up prompts:
   - "Make the book cards more compact"
   - "Use a warmer color palette"
   - "Add more spacing between elements"
3. Generate variations for different screen sizes
4. Create components for reusable elements

**Alternative:** If Figma AI doesn't work well for you:
- Browse Figma Community for "library app" or "reading app" templates
- Remix and customize existing designs
- Use Figma plugins like "Mockup" or "UI Faces" for quick content

---

## Step 3: Document Design Specifications (30 minutes)

### Task: Extract design tokens from Figma

**What to do:**
1. Open Figma's **Inspect** panel (right sidebar)
2. Click on elements to see their properties
3. Document in a simple text file:

```
COLORS:
- Primary: #3B82F6 (from button color)
- Background: #F9FAFB (from main bg)
- Card Background: #FFFFFF
- Text Primary: #111827
- Text Secondary: #6B7280
- Border: #E5E7EB
- Success: #10B981 (for "completed" status)
- Warning: #F59E0B (for "reading" status)

TYPOGRAPHY:
- Font Family: Inter (or similar)
- H1 (Book Title): 24px, Bold (600)
- H2 (Section): 18px, Semibold (600)
- Body: 14px, Regular (400)
- Small: 12px, Regular (400)

SPACING:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

BORDER RADIUS:
- Button: 6px
- Card: 8px
- Modal: 12px

SHADOWS:
- Card: 0 1px 3px rgba(0,0,0,0.1)
- Button Hover: 0 4px 6px rgba(0,0,0,0.1)
```

---

## Step 4: Export Design Assets (15 minutes)

### Task: Prepare files for Claude Code

**What to do:**
1. Take screenshots of key screens:
   - Desktop: Library view
   - Desktop: Book selected view
   - Mobile: Library view
   - Mobile: Book details
   - Mobile: AI chat
   - Modals: Add book, Edit book, Add note

2. Export at 2x resolution (right-click → Export → 2x → PNG)

3. Optional: Export individual component screenshots:
   - Book card
   - Filter chips
   - Button styles
   - Form inputs

4. Name files clearly:
   - `01-desktop-library.png`
   - `02-desktop-book-selected.png`
   - `03-mobile-library.png`
   - etc.

---

## Step 5: Prepare Prompt for Claude Code (20 minutes)

### Task: Create comprehensive implementation request

**What to do:**
Copy this template and fill in your details:

```markdown
# UI Implementation from Figma Designs

## Context
I have a fully functional AI Library Manager app with placeholder UI. 
The backend, API, and all features are working. I need to update the 
frontend to match the designs I created in Figma.

## Tech Stack (Current)
- Backend: Express.js + TypeScript
- Database: SQLite
- Frontend: Vanilla JavaScript, HTML5, CSS3
- No framework currently used

## Design Specifications

### Colors
[Paste your color documentation from Step 3]

### Typography
[Paste your typography documentation from Step 3]

### Spacing & Layout
[Paste your spacing documentation from Step 3]

## Key Screens to Implement

### 1. Desktop Three-Panel Layout
[Attach screenshot: 01-desktop-library.png]

**Requirements:**
- Library panel: 30% width (collapsible to 15%)
- Book details panel: 40% width (opens when book selected)
- AI chat panel: 30% width (expandable to 55%)
- Panels should be resizable with drag handles

### 2. Book Card Component
[Attach screenshot or describe from Figma]

**Elements:**
- Cover thumbnail (80x120px)
- Title (truncate after 2 lines)
- Author (truncate after 1 line)
- Genre badge
- Status badge
- Progress bar (if status = "reading")
- Star rating (if rated)

### 3. Book Details View
[Attach screenshot: 02-desktop-book-selected.png]

**Layout:**
- Large cover at top (200x300px)
- Metadata grid below
- Tabs: Overview | Notes | Q&A
- Action buttons at bottom

### 4. Mobile Responsive
[Attach screenshots: 03-mobile-*.png]

**Breakpoints:**
- Mobile: < 768px (single panel, bottom nav)
- Tablet: 768-1024px (two panels)
- Desktop: > 1024px (three panels)

### 5. AI Chat Interface
[Attach screenshot of chat]

**Features:**
- Context banner (collapsible)
- Message bubbles (user right, AI left)
- Book references styled as links
- Suggestion chips below AI messages
- Input with send button

## Implementation Priority

### Phase 1: Critical (Do First)
1. Desktop three-panel layout
2. Book card component
3. Book details panel structure
4. Basic responsive mobile view

### Phase 2: Important (Do Second)
1. AI chat styling
2. Form modals (Add book, Edit book, Add note)
3. Filter and sort UI
4. Polish transitions

### Phase 3: Nice-to-Have (If Time)
1. Animations
2. Loading states
3. Empty states
4. Dark mode

## Existing Code Structure
- Main HTML: `/public/index.html`
- Main CSS: `/public/styles.css`
- Main JS: `/public/app.js`
- All features are working, just need better styling

## Questions for Claude Code
1. Should I keep vanilla JS or migrate to a framework?
2. Can we preserve all existing functionality while updating UI?
3. What's the best approach for the panel resizing?

## Success Criteria
- [ ] Matches Figma designs visually
- [ ] All existing features still work
- [ ] Responsive on mobile, tablet, desktop
- [ ] Smooth transitions between states
- [ ] Accessible (keyboard navigation, screen readers)
```

---

## Step 6: Run Implementation with Claude Code (2-4 hours)

### Task: Execute the implementation

**What to do:**
1. Open your terminal in the project directory
2. Start Claude Code:
   ```bash
   claude-code
   ```

3. Provide the prompt you prepared in Step 5
4. Upload the design screenshots
5. Upload the design specifications document

6. Claude Code will:
   - Analyze your current code
   - Plan the refactoring
   - Update HTML structure
   - Rewrite CSS styles
   - Adjust JavaScript as needed
   - Test the changes

7. Review each change:
   - Check visual accuracy against Figma
   - Test functionality still works
   - Verify responsive behavior

8. Iterate with follow-up prompts:
   - "The book cards need more spacing"
   - "Can we make the chat panel scrollable?"
   - "Add a loading spinner when fetching books"

---

## Step 7: Mobile Implementation (1-2 hours)

### Task: Adapt for mobile platforms (if needed)

**For React Native or Flutter:**
```markdown
# Mobile Implementation Request

Using the same designs from Figma, I need to implement the mobile version.

## Platform
[Choose: iOS (SwiftUI) / Android (Jetpack Compose) / React Native / Flutter]

## Design Assets
[Attach mobile screenshots]

## API Integration
The backend API is already running at localhost:3000
[Provide API documentation from your spec]

## Implementation Notes
- Use native navigation patterns
- Bottom tab bar for main sections
- Swipe gestures for book history
- Pull-to-refresh for library
- Native platform components

Please generate the complete mobile app structure.
```

---

## Step 8: Testing & Refinement (1-2 hours)

### Task: Validate implementation

**Checklist:**
- [ ] Visual comparison: Side-by-side Figma vs. implemented
- [ ] Responsive testing: Resize browser window
- [ ] Touch testing: Tap all interactive elements
- [ ] Flow testing: Complete key user workflows
- [ ] Accessibility: Keyboard navigation, screen reader
- [ ] Performance: Load time, scroll smoothness

**Common fixes to request:**
- "The spacing between book cards is inconsistent"
- "Mobile book cards should be 2 columns, not 1"
- "Chat messages should have alternating alignment"
- "Add hover states to all buttons"

---

## Time Estimate

| Phase | Time | 
|-------|------|
| Figma AI prompts & generation | 1-2 hours |
| Design documentation | 30 min |
| Claude Code implementation | 2-4 hours |
| Mobile (if applicable) | 1-2 hours |
| Testing & refinement | 1-2 hours |
| **Total** | **5-10 hours** |

---

## Tips for Success

### Do's ✅
- Start with desktop layout first
- Implement in phases (layout → components → styling)
- Test frequently as you go
- Keep design specifications documented
- Take screenshots at each stage for comparison

### Don'ts ❌
- Don't try to implement everything at once
- Don't skip the documentation step
- Don't assume Claude Code knows your design preferences
- Don't ignore accessibility from the start
- Don't forget to test on actual mobile devices

---

## Troubleshooting

### Issue: Figma AI not generating good results
**Solution:** Use Figma Community templates instead, or describe in more detail

### Issue: Claude Code changes break functionality
**Solution:** Request rollback, then implement in smaller chunks

### Issue: Design doesn't translate well to code
**Solution:** Simplify design, or request Claude Code suggest alternatives

### Issue: Mobile performance is slow
**Solution:** Request optimization, lazy loading, and code splitting

---

## Next Steps After Implementation

1. **User Testing**: Share with friends/family for feedback
2. **Polish**: Add micro-interactions, animations
3. **Dark Mode**: Extend color system for dark theme
4. **Onboarding**: Add first-time user tutorial
5. **Analytics**: Track which features are used most
6. **Iterate**: Based on real usage, refine the UI

---

*Good luck with your implementation! Remember: You don't need to be a designer to create a beautiful app—you just need clear communication between Figma and Claude Code.*