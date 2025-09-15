# Bookmark Feature Usage Guide

## Feature Overview

Gemini Timeline Assistant now supports bookmark and note features, allowing you to mark and pin important questions for quick access. It also supports edge docking, drag positioning, and long-press quick editing, making it easy to find key questions in conversations with the same URI.

## Main Features

### 1. Question Bookmarking
- Each question in the timeline has a star button (☆) and note button (📝) on the left
- Click the star button to bookmark/unbookmark questions without opening the note dialog
- Bookmarked questions display a solid star (★) and turn golden

### 2. Pin to Top
- Bookmarked questions are automatically pinned to the top of the timeline
- Bookmarked questions have special golden background and border
- Bookmarked questions show ⭐ icon before the question number

### 3. Filter Functions
- Click the ⭐ button in the timeline header to show only bookmarked questions
- Click the 📝 button in the timeline header to show only questions with notes
- Click the same button again to return to showing all questions
- Question count displays the current filter mode quantity

### 4. Note Feature
- Click the 📝 button to record note content; if the question isn't bookmarked, it will be automatically bookmarked
- Record why you want to bookmark this question or its importance
- Note content is displayed in the golden area below the question
- Click the 📝 button or note area to edit notes
- For questions with notes, the 📝 button turns blue
- In bookmark filter mode, note buttons are more prominent, showing "📝 Recorded" or "📝 Add Note"

### 5. Highlight and Comment Feature ⭐ New
- **Smart Text Highlighting**: Select any text in Gemini's responses to automatically show the highlight menu
- **Quick Highlighting**: Click "🖍️ Highlight" button to immediately turn text yellow and save as note
- **Add Comments**: Click "💬 Comment" button to add personal comments and thoughts to highlighted text
- **Auto Recording**: Highlighted content is automatically saved as notes without manual addition
- **Unified Management**: Highlighted text directly becomes note content, with comments as supplementary explanations
- **Real-time Sync**: After highlighting, the corresponding question is automatically bookmarked, and timeline shows note count

### 6. Edge Docking and Dragging
- Timeline defaults to docking on the right edge, auto-expands on mouse hover
- Supports dragging to any position on screen, auto-docks when near edges
- Shows small indicator when docked, click to expand timeline
- Supports left and right side docking to adapt to different usage habits

### 7. Simplified Operations
- Each question displays star (⭐) and note (📝) buttons
- Click star for direct bookmark/unbookmark
- Click note button to directly open edit dialog without pre-bookmarking

### 8. Cross-page Access
- Bookmark data is automatically saved to browser storage
- When you visit the same Gemini conversation URI, previously bookmarked questions are automatically loaded
- Golden notification appears on page load if there are bookmarked questions

## Usage Instructions

### Bookmarking Questions
1. On Gemini conversation page, timeline automatically docks to right edge
2. Hover over docking indicator to expand timeline
3. Find the question you want to bookmark
4. Click the star button (☆) on the left of the question for quick bookmarking
5. Button changes to solid star (★) and turns golden, showing bookmark success notification

### Adding Notes
1. Click the 📝 button on the right of any question
2. If question isn't bookmarked, it will be automatically bookmarked
3. Note editing dialog appears, enter note content (like "Great answer", "Need reference", etc.)
4. Click "Save" or press Ctrl+Enter to save note

### Note Editing
1. Click the 📝 button on the right of any question
2. Note editing dialog appears directly (no need to pre-bookmark)
3. Enter note content and save

### Filter Viewing
1. Bookmarked questions are automatically pinned to top
2. Click ⭐ button in timeline header to show only bookmarked questions
3. Click 📝 button in timeline header to show only questions with notes
4. Bookmarked questions have special golden background, note content shows below questions
5. In bookmark filter mode, each bookmarked item has prominent note button

### Editing Notes
1. Click the 📝 button on the right of any question
2. Or directly click the note area (if notes already exist)
3. Modify note content in the popup edit dialog
4. Supports clearing notes (save empty to clear)

### Highlight Feature ⭐ New Function
1. Select any text in Gemini's response content
2. Highlight operation menu automatically appears (🖍️ Highlight | 💬 Comment | ✖️)
3. Click "🖍️ Highlight": Text immediately turns yellow and is automatically saved as note
4. Click "💬 Comment": Comment dialog appears, enter personal thoughts and evaluations
5. Highlighted content automatically associates with corresponding question, no manual operation needed

### Viewing Highlight Content
1. After highlighting, corresponding question is automatically bookmarked (shows ⭐)
2. Timeline updates note count statistics
3. Click question's 📝 button to view all highlighted content
4. Highlighted text displays directly as note content, comments as supplementary explanations

### Search Function
1. Enter keywords in search box
2. Can search question content or note content
3. Questions matching notes will highlight the note area

### Dragging and Docking
1. Drag timeline header to move to any position
2. Dragging to screen edge will auto-dock
3. Shows indicator after docking, hover or click to expand
4. Supports left and right side docking

### Cross-page Usage
1. After bookmarking questions in a Gemini conversation
2. When you revisit the same conversation URI
3. System automatically loads previous bookmarks and notes
4. Notification appears in top-right corner showing number of bookmarked questions

## Visual Indicators

- **Unbookmarked Questions**: Gray hollow star (☆) + gray 📝 button
- **Bookmarked Questions**: Golden solid star (★) + blue/gray 📝 button
- **Bookmarked Question Background**: Golden gradient background
- **Questions with Notes**: 📝 button displays in blue
- **Note Area**: Golden background area displaying note content
- **Docking Indicator**: Ultra-thin colored strip at edge (1px wide) showing 📋 icon
- **Filter Buttons**: ⭐ and 📝 buttons in header, highlighted when active
- **Notification**: Golden gradient notification box
- **📱 Highlight**: Yellow background highlighted text with yellow underline and subtle shadow
- **🎯 Highlight Menu**: White floating menu with "🖍️ Highlight", "💬 Comment", "✖️" buttons
- **💬 Comment Dialog**: Modal dialog supporting personal evaluation and thought input
- **🔍 Highlight Association**: Highlighted content automatically displays in corresponding question's notes

## Technical Features

- Data Persistence: Uses Chrome extension's storage.local API with large capacity support
- Cross-page Sync: Based on URL pathname and search parameter matching
- Smart Deduplication: Avoids duplicate bookmarking of same content questions
- Real-time Updates: Bookmark status immediately reflects in interface
- Auto Expiration: Bookmark and note data automatically cleans up after 7 days to keep storage tidy
- Smart Question Recognition: Prioritizes complete question containers, avoids splitting long questions
- Note Search: Supports searching in question content and notes
- Edge Docking: Supports auto-docking to screen edges, saving usable space
- Drag Positioning: Can freely drag to any position
- Direct Editing: Click 📝 button for direct editing, simplified operation flow
- **🆕 Smart Text Recognition**: Automatically recognizes Gemini response areas, supports accurate text selection
- **🆕 Real-time Highlight Rendering**: Immediately shows yellow highlight effect on page after text selection
- **🆕 Auto Data Association**: Highlighted content automatically associates with corresponding questions, unified note management
- **🆕 Prevent Duplicate Triggers**: 500ms debounce mechanism prevents duplicate highlight menu creation
- **🆕 Smart Menu Positioning**: Highlight menu automatically adjusts position to ensure visibility within viewport
- **🆕 Unified Data Storage**: Highlights and notes use unified data structure for easy management and querying

## Notes

- Bookmark data syncs to your Chrome account
- Only the same Gemini conversation URL will load corresponding bookmarks
- Bookmark feature doesn't affect existing timeline and search functions
- Bookmark data automatically expires and cleans up after 7 days, no manual management needed
- Search box shows "⭐ Bookmarked questions will auto-clean after 7 days" hint
- Note filter mode shows "💡 Click 📝 button to directly edit notes"
- Long questions are now correctly recognized as single questions, no longer split into multiple entries
- Timeline defaults to edge docking, doesn't occupy excessive screen space

## Quick Operations

- **Quick Bookmark**: Directly click star button (☆), no note dialog popup
- **Add Notes**: Click 📝 button to record note content
- **Direct Edit**: Click 📝 button for direct note editing, no pre-bookmarking needed
- **Filter View**: Click header ⭐ button for bookmarks, 📝 button for notes
- **Drag Position**: Drag timeline to any position, auto-dock near edges
- **Quick Navigation**: Click notification to directly show bookmarked questions
- **Search Function**: Enter content in search box to search questions and notes
- **Quick Save**: Press Ctrl+Enter in note dialog for quick save
- **Edit Notes**: Click 📝 button or note area to edit
- **🆕 Quick Highlight**: Select text → Click "🖍️ Highlight" → Immediately highlight and save
- **🆕 Add Comment**: Select text → Click "💬 Comment" → Enter personal thoughts
- **🆕 View Highlights**: Click highlighted text to view details, supports delete operation
- **🆕 Unified Management**: Highlighted content automatically becomes notes, no duplicate operations
