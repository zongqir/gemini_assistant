# Gemini Timeline Assistant

A Chrome/Edge browser extension designed to solve a key pain point in Gemini conversations: difficulty in quickly viewing and jumping to previous questions when conversations become lengthy.

## 🚀 Key Features

### Core Functionality
- **Pure Question Timeline**: Intelligently extracts all user questions from the current conversation, completely excluding AI responses to ensure the timeline displays only pure question content
- **Zero Content Filtering**: Uses DOM structure recognition instead of text content analysis, ensuring all user questions are accurately captured (including short questions like "hello", "range", etc.)
- **Quick Navigation**: Click any question in the timeline to automatically scroll to the corresponding position in the conversation, with smooth scrolling and highlight effects
- **Real-time Search**: Built-in search functionality supporting keyword-based quick location of specific questions
- **Reverse Chronological Order**: New questions appear at the top of the timeline for easy access to recent conversation content

### Interface Features
- **High Capacity Display**: Supports displaying up to 100 questions (vs. traditional 10-question limit)
- **Modern UI**: Beautiful gradient title bar, search box, hover effects, and click feedback
- **Smart Counting**: Real-time display of total question count and search match quantities
- **Collapsible Design**: Support for collapsing/expanding the timeline without interfering with normal browsing
- **Responsive Layout**: Adapts to different screen sizes, fixed on the right side of the page

### Intelligent Updates
- **Multiple Trigger Mechanisms**:
  - Auto-update after detecting Enter key question submission
  - Listen for send button click events
  - Trigger historical content loading when scrolling to top
  - Real-time DOM change monitoring via MutationObserver
- **Anti-Duplication**: Smart deduplication to avoid displaying duplicate questions
- **Performance Optimization**: Cooldown time control to prevent excessive scanning frequency

## 📦 Installation

### Chrome Browser
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top-right corner
4. Click "Load unpacked"
5. Select the plugin folder
6. Installation complete

### Edge Browser
1. Open Edge browser
2. Navigate to `edge://extensions/`
3. Enable "Developer mode" in the bottom-left corner
4. Click "Load unpacked"
5. Select the plugin folder
6. Installation complete

## 🎯 Usage Guide

### Basic Usage
1. Open Gemini conversation page at `https://gemini.google.com/`
2. Start conversing with Gemini
3. The plugin will automatically display a timeline container on the right side of the page
4. The timeline will show all your questions in real-time, with new questions appearing at the top

### Search Functionality
1. Enter keywords in the search box at the top of the timeline
2. The timeline will filter and display matching questions in real-time
3. Search results show "matches/total" format
4. Clear the search box to restore display of all questions

### Quick Navigation
1. Click any question in the timeline
2. The page will automatically scroll to the corresponding question position
3. The target question will be briefly highlighted (2 seconds)
4. Supports smooth scrolling animation effects

### Interface Controls
- **Collapse/Expand**: Click the "−"/"+" button on the right side of the title bar
- **Question Count**: Title bar displays current total question count
- **Hover Effects**: Visual feedback when hovering over questions
- **Text Selection**: Support for direct selection and copying of question text

## 🔧 Technical Features

### DOM Structure Recognition
The plugin identifies questions based on Gemini's actual DOM structure using the following selectors:
- `user-query-content` - User query content tags
- `.user-query-bubble-with-background` - User question bubbles
- `.query-text` - Question text containers
- `.query-text-line` - Question text lines

### Filtering Strategy
- **Zero Content Filtering**: No judgment based on text content
- **System Error Exclusion**: Only filters obvious system error messages (connection errors, Request IDs, etc.)
- **Structure Priority**: Completely relies on DOM structure rather than text features

### Performance Optimization
- **Debouncing**: Prevents frequent DOM scanning
- **Smart Deduplication**: Uses text fingerprinting to avoid duplicate displays
- **Layered Listening**: Multiple trigger mechanisms ensure timely updates
- **Memory Management**: Limits display quantity to prevent memory overflow

## 🐛 Debug Mode

If the plugin doesn't correctly display your questions, open browser developer tools (F12), switch to the "Console" tab to view plugin logs:

### Key Log Information
```
=== Gemini Timeline: 开始扫描用户问题（零过滤版本）===
Gemini Timeline: 选择器 "user-query-content" 找到 X 个元素
Gemini Timeline: ✅ 找到用户问题: "Your question content"
Gemini Timeline: 🚀 跳过所有内容过滤，直接使用DOM检测结果: X 条
Gemini Timeline: 成功渲染 X 条问题
```

### Common Issue Troubleshooting
- **Timeline not showing**: Check if you're on Gemini page, try refreshing
- **Missing questions**: Check console logs to verify DOM selector matching
- **Duplicate questions**: Normal behavior, plugin handles deduplication automatically
- **No search results**: Verify search keywords are correct, supports partial matching

## 📁 File Structure

```
chrome-extension/
├── manifest.json          # Plugin configuration
├── content.js             # Core functionality (593 lines)
├── style.css              # Timeline styles
├── background.js          # Background service
├── popup.html             # Popup interface
├── images/
│   └── icon.svg          # Plugin icon
├── README.md             # Chinese documentation
├── README_EN.md          # English documentation
└── INSTALL_GUIDE.md      # Installation guide
```

## 🔄 Update History

### Latest Version Features
- ✅ **Zero Content Filtering**: Completely DOM-structure-based, won't mistakenly filter any user questions
- ✅ **Search Functionality**: Real-time search and question filtering
- ✅ **100 Question Display**: Increased from 10 to 100 question capacity
- ✅ **Reverse Order**: New questions displayed at the top
- ✅ **Modern UI**: Beautiful interface design and interactive effects
- ✅ **Smart Updates**: Multiple trigger mechanisms ensure real-time updates
- ✅ **Performance Optimization**: Debouncing, deduplication, memory management optimizations

### Problems Solved
1. **Over-filtering**: Previous versions mistakenly filtered short questions (like "hello", "range"), now completely resolved
2. **Capacity Limitation**: Increased from 10-question limit to 100 questions
3. **Delayed Updates**: Added multiple automatic update trigger mechanisms
4. **Basic Interface**: Redesigned with modern UI interface
5. **Missing Search**: Added real-time search functionality

## 🚨 Important Notes

- This plugin only works on Gemini pages (`gemini.google.com`)
- Plugin automatically adapts to Gemini's DOM structure changes
- Regular plugin updates recommended for optimal compatibility
- Console logs available for troubleshooting
- Plugin doesn't collect or store any user data

## 🛠️ Development Guide

### Core File Descriptions
- **content.js**: Main logic file containing DOM detection, timeline rendering, search functionality
- **style.css**: Timeline styles supporting text selection and modern UI
- **manifest.json**: Plugin configuration supporting Manifest V3
- **background.js**: Background service handling plugin lifecycle
- **popup.html**: Plugin popup interface

### Custom Development
For modifying plugin functionality, focus on these functions:
- `scanQuestions()`: Question scanning and detection logic
- `renderTimeline()`: Timeline rendering and UI generation
- `setupSearch()`: Search functionality implementation
- `observePageChanges()`: Page change monitoring

## 📞 Feedback & Support

If you encounter issues or have suggestions during use, please provide feedback through:
- Submit Issues to the project repository
- Check console logs for self-troubleshooting
- Refer to the Debug Mode section in this documentation

---

**Development Philosophy**: Focus on solving the pain point of question navigation in long Gemini conversations, providing a pure, efficient, and intelligent question timeline experience.

## 🌟 User Requirements & Use Cases

### Original Problem Statement
The user needed a solution for navigating long Gemini conversations where:
- **Pain Point**: Difficult to scroll back through lengthy conversations to find specific questions
- **User Need**: A timeline showing only user questions (not AI responses) for quick navigation
- **Requirement**: Click-to-jump functionality to instantly locate any previous question

### Key User Demands
1. **Pure Question Timeline**: Only display user questions, completely exclude AI responses
2. **Zero False Filtering**: Ensure short questions like "hello" or "range" are not filtered out
3. **High Capacity**: Display up to 100 questions instead of just 10
4. **Search Capability**: Real-time search to quickly find specific questions
5. **Reverse Order**: New questions at the top for better UX
6. **Auto-Update**: Automatically detect and add new questions as conversation progresses

### Technical Challenges Solved
- **DOM Structure Analysis**: Reverse-engineered Gemini's actual DOM structure for accurate question detection
- **Content Filtering Elimination**: Moved from unreliable text-based filtering to structure-based detection
- **Performance Optimization**: Implemented debouncing, deduplication, and memory management
- **Multi-trigger Updates**: Added Enter key detection, button click monitoring, scroll detection, and MutationObserver
- **Modern UI/UX**: Created responsive, searchable, collapsible timeline interface

This extension represents a complete solution to the user's workflow problem, transforming a frustrating navigation issue into a smooth, efficient experience.
