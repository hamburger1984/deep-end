# Technical Documentation - Deep End

## Architecture Overview

### Components

The application consists of two main classes:

1. **FolderBrowser** - Handles Nextcloud folder navigation and selection
2. **DiaryApp** - Main application logic for diary management

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Storage**: Nextcloud via WebDAV protocol
- **Local Storage**: Browser localStorage for credentials
- **PWA**: Service Worker for offline capabilities
- **Authentication**: HTTP Basic Auth (app passwords) or OAuth2 Bearer tokens

## Application Flow

### 1. Initial Setup

```
User Opens App
    ↓
Check localStorage for config
    ↓
[No Config] → Show Setup Screen
    ↓
User Selects Auth Method
    ↓
[App Password] → Enter URL, username, password
[OAuth2] → Enter URL, client ID, secret → OAuth flow
    ↓
Test Connection (PROPFIND request)
    ↓
Show Folder Browser
    ↓
User Navigates & Selects Folder
    ↓
Save Config to localStorage
    ↓
Load Main Screen
```

### 2. Main Application Loop

```
Load Main Screen
    ↓
Load Today's Entry
    ├─ Check if month file exists
    ├─ Parse entry for today's date
    ├─ Separate committed sections from current text
    ├─ Display read-only committed sections
    └─ Display editable current session text
    ↓
User Types
    ↓
Auto-save Trigger (1 second debounce)
    ├─ Update lastEditTime
    ├─ Reset session commit timer (30 min)
    └─ Trigger save after 1 second
    ↓
Save Entry
    ├─ Check day boundary (date changed?)
    ├─ Check external changes (ETag changed?)
    ├─ Check session committed flag
    └─ Save with appropriate logic
```

### 3. Session Lifecycle

```
Entry Loaded
    ↓
sessionCommitted = false
lastEditTime = null
currentEntryDate = today
    ↓
User Edits
    ↓
[30 Minutes Pass Without Edits]
    ↓
commitCurrentSession()
    ├─ Save current content
    ├─ Set sessionCommitted = true
    ├─ Update baseline
    ├─ Reload display (show as committed section)
    └─ Clear editable textarea
    ↓
User Edits Again
    ↓
Save with Timestamp
    └─ appendEntryWithTimestamp()
```

## Core Algorithms

### Session Commit Detection

The app uses multiple signals to determine if a new session should append with timestamp:

```javascript
// Decision tree for timestamp appending:
if (externalChange) {
    // ETag changed → another device modified file
    appendWithTimestamp();
} else if (sessionCommitted) {
    // 30 min inactivity → session was committed
    appendWithTimestamp();
    sessionCommitted = false;  // Reset flag
} else {
    // Normal edit within same session
    updateInPlace();
}
```

### Day Boundary Detection

```javascript
// On every save:
const today = formatDate(new Date());

if (currentEntryDate !== today) {
    // Day changed!
    // 1. Save current text to OLD date with timestamp
    saveToOldDate(currentEntryDate, content);
    
    // 2. Reload today's entry
    await loadTodaysEntry();  // Sets currentEntryDate = today
    
    // 3. Exit save (will be called again for new day)
    return;
}
```

### Entry Parsing

```javascript
// Parse committed sections from content:
function parseContentSections(content) {
    // Split by timestamp pattern: *HH:MM*
    const pattern = /\n\*(\d{2}:\d{2})\*\n/g;
    
    // Extract sections and timestamps
    const committedSections = [];  // Array of {timestamp, text}
    const currentText = "";        // Text after last timestamp
    
    // ... parsing logic ...
    
    return { committedSections, currentText };
}
```

## Data Flow

### Reading an Entry

```
HTTP GET /remote.php/dav/files/{user}/{folder}/yyyy-mm.md
    ↓
Response Headers:
    - ETag: "abc123..."
    - Last-Modified: "Mon, 03 Nov 2025..."
    ↓
Response Body:
    ## 2025-11-03 - Title
    Content...
    *14:30*
    More content...
    ↓
Parse Entry for Date
    ↓
Extract:
    - customTitle: "Title"
    - content: "Content...\n\n*14:30*\nMore content..."
    ↓
Parse Content Sections
    ↓
Split into:
    - committedSections: [{timestamp: "14:30", text: "Content..."}]
    - currentText: "More content..."
```

### Writing an Entry

```
User Types "New text"
    ↓
Auto-save after 1 second
    ↓
Build/Update Content:
    option1: updateEntryInContent() → replace current entry
    option2: appendEntryWithTimestamp() → add with timestamp
    ↓
HTTP PUT /remote.php/dav/files/{user}/{folder}/yyyy-mm.md
    Headers:
        - Authorization: Basic/Bearer ...
        - Content-Type: text/plain
    Body:
        ## 2025-11-03 - Title
        Content...
        *14:30*
        More content...
        *15:05*
        New text
    ↓
Success (200 OK)
    ↓
Store new ETag for next check
```

## Performance Considerations

### Lazy Loading

- Entries loaded 3 months at a time
- Infinite scroll triggers when within 1000px of bottom
- Only today's entry loaded initially

### Caching

- Month files cached in `this.entries` Map
- ETags cached for external change detection
- No server polling - changes detected on save only

### Debouncing

- Auto-save: 1 second debounce
- Session commit: 30 minute timer (resets on each edit)
- No throttling on scroll (uses requestAnimationFrame)

## State Management

### Application State

```javascript
class DiaryApp {
    // Configuration
    config: {
        url: string,
        username: string,
        password?: string,      // For basic auth
        accessToken?: string,   // For OAuth2
        authType: "basic" | "oauth2",
        folder: string
    }
    
    // Session tracking
    todayBaselineContent: string        // Content when loaded
    todayBaselineETag: string           // ETag when loaded
    currentSessionText: string          // Current session text
    currentEntryDate: string            // Date being edited (yyyy-mm-dd)
    lastEditTime: number                // Timestamp of last edit
    sessionCommitTimer: timeoutId       // Timer for auto-commit
    sessionCommitted: boolean           // Was session committed?
    
    // UI state
    entries: Map<string, any>           // Cache of loaded entries
    isLoading: boolean                  // Loading indicator
    currentMonth: Date                  // Current month being viewed
    oldestLoadedMonth: Date             // Oldest loaded month
    autoSaveTimeout: timeoutId          // Auto-save timer
}
```

### State Transitions

```
Initial → Setup → Folder Browser → Main
                                    ↓
                          Active Session ←→ Committed Session
                                    ↓
                          Day Changed → New Entry (Active Session)
```

## Error Handling

### Connection Errors

- Failed connection → Show alert, stay on setup screen
- Invalid credentials → Show alert, allow retry
- Network timeout → Show error in console, retry on next save

### Save Errors

- File conflict (ETag mismatch) → Reload and append with timestamp
- Network error → Show alert, content preserved in textarea
- Permission error → Show alert, check Nextcloud permissions

### Parse Errors

- Invalid markdown → Display as-is, no crash
- Missing date header → Skip entry, continue parsing
- Malformed timestamp → Display as text, continue parsing

## Security Considerations

### Credentials Storage

- Stored in browser localStorage (encrypted by browser)
- Never sent to any server except Nextcloud
- Password field cleared after use (not populated on settings view)
- OAuth tokens have expiration (handled by Nextcloud)

### CORS Requirements

- Nextcloud must allow origin for WebDAV requests
- Required headers:
  - `Access-Control-Allow-Origin: *` (or specific origin)
  - `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS`
  - `Access-Control-Allow-Headers: Authorization, Content-Type, Depth, OCS-APIRequest`

### Authentication

- **Basic Auth**: Base64-encoded username:password (HTTPS required)
- **OAuth2**: Bearer token in Authorization header
- No session cookies, stateless authentication
- All requests authenticated (no public endpoints)

## Browser Compatibility

### Required Features

- localStorage (all modern browsers)
- Fetch API (all modern browsers)
- ES6+ JavaScript (arrow functions, async/await, classes)
- Service Worker (for PWA features)
- IndexedDB (for offline storage)

### Tested Browsers

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile Chrome/Safari (iOS 14+, Android 8+)

## Development Setup

### Running Locally

```bash
# Serve with any static server
python -m http.server 8080

# Or use Node.js http-server
npx http-server -p 8080

# Open http://localhost:8080
```

### Testing Multi-Device

1. Open app in multiple browser tabs/windows
2. Use different browsers (Chrome + Firefox)
3. Use private/incognito mode for separate sessions
4. Test on mobile + desktop simultaneously

### Debugging

- Open browser DevTools (F12)
- Console tab shows all logs and errors
- Network tab shows WebDAV requests
- Application tab shows localStorage and service worker

## Future Enhancements

Potential improvements:

- **Search**: Full-text search across all entries
- **Tags**: Tag entries for categorization
- **Export**: Export entries to PDF or other formats
- **Encryption**: End-to-end encryption of entries
- **Rich Text**: Markdown rendering in read view
- **Attachments**: Support for images and files
- **Themes**: Dark mode and custom themes
- **Backup**: Automatic backup to separate location
