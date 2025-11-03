# Diary PWA

A Progressive Web App for maintaining a personal diary that syncs with your Nextcloud instance. Features intelligent session management, multi-device support, and automatic conflict resolution.

## Features

### Core Functionality
- 📝 **Daily Diary Entries** - Write entries stored in markdown format
- 🔄 **Nextcloud Sync** - Automatic syncing via WebDAV
- 📱 **Progressive Web App** - Install on any device, works offline
- ♾️ **Infinite Scroll** - Browse older entries seamlessly
- 💾 **Auto-Save** - Saves as you type (1 second debounce)

### Smart Session Management
- ⏱️ **Inactivity Commits** - Auto-commits sessions after 30 minutes of inactivity
- 🌅 **Day Boundary Detection** - Handles writing across midnight correctly
- 🔀 **Multi-Device Support** - Detects and merges changes from other devices
- 🏷️ **Timestamped Entries** - New sessions append with timestamps
- 👀 **Read-Only History** - Previous sessions displayed as committed sections

### Authentication & Security
- 🔑 **App Password** - Simple authentication for personal use
- 🔐 **OAuth2** - More secure token-based authentication
- 🔒 **Credentials Protected** - Never exposed in UI after initial setup

## Setup

### Prerequisites
- A Nextcloud instance with WebDAV access
- A modern web browser (Chrome, Firefox, Safari, Edge)
- CORS headers configured on your Nextcloud server (see [Technical Docs](docs/TECHNICAL.md))

### Method 1: App Password (Recommended for Personal Use)

1. **Create App Password** in Nextcloud:
   - Go to Settings → Security → Devices & sessions
   - Click "Create new app password"
   - Give it a name (e.g., "Diary PWA")
   - Copy the generated password

2. **Open the App**: Open `index.html` in your browser

3. **Connect**:
   - Select "🔑 App Password" method
   - Enter your Nextcloud URL (e.g., `https://cloud.example.com`)
   - Enter your username
   - Enter the app password from step 1
   - Click "Connect with App Password"

4. **Choose Folder**:
   - Browse your Nextcloud folders
   - Create a new folder or select an existing one
   - Click "✓ Use This Folder"

### Method 2: OAuth2 (More Secure)

1. **Create OAuth2 Client** in Nextcloud:
   - Go to Settings → Security → OAuth 2.0 clients (admin required)
   - Add a new client named "Diary PWA"
   - Set redirect URI to your app URL
   - Note the Client ID and Client Secret

2. **Open the App**: Open `index.html` in your browser

3. **Connect**:
   - Select "🔐 OAuth2" method
   - Enter your Nextcloud URL
   - Enter Client ID and Client Secret
   - Click "Connect with OAuth2"
   - Authorize in the popup window
   - Copy the access token and paste it in the app

4. **Choose Folder**: Same as App Password method

## Usage

### Daily Writing
- **Today's Entry**: Opens automatically when you start the app
- **Custom Titles**: Add an optional title to any entry
- **Auto-Save**: Saves 1 second after you stop typing
- **Writing Indicator**: Shows "Saved" when auto-save completes

### Session Management
- **Active Session**: Your current writing appears in the editable textarea
- **Committed Sessions**: Previous sessions shown as read-only sections above
- **Session Commit**: Happens automatically after 30 minutes of inactivity
- **New Session**: Next edit after commit appends with timestamp

### Multi-Device Usage
- **Sync Detection**: Automatically detects changes from other devices
- **Conflict Resolution**: Appends changes with timestamps instead of overwriting
- **Indicators**: Shows "Saved (merged with external changes)" when merging

### Cross-Midnight Writing
- **Scenario**: Writing at 23:55 and continuing past midnight
- **Behavior**: Detects day boundary, saves to correct date, reloads new day's entry
- **Result**: Content properly split between the two days with timestamps

### Settings
- Click the **⚙️ settings** button to view/change connection settings
- Use **← Back to Diary** to return without making changes
- Credentials are preserved (never shown for security)

## File Format

Entries are stored in monthly markdown files (`yyyy-mm.md`) in your chosen Nextcloud folder:

```markdown
## 2025-11-03 - Morning Thoughts

First session content written in the morning...

*14:30*
Afternoon update after session commit

*23:58*
Evening thoughts

## 2025-11-02 - Yesterday's Title

Previous day's content
```

### Format Details
- Each entry starts with `## yyyy-mm-dd`
- Optional custom title after the date: `## yyyy-mm-dd - Title`
- Timestamps mark session boundaries: `*HH:MM*`
- Content is plain text (markdown compatible)
- Files organized by month for performance

## Installation as PWA

1. Open the app in a modern browser
2. Look for "Install" or "Add to Home Screen"
3. Click to install as a standalone app
4. Access from your app drawer/desktop
5. Works offline with cached data

## Technical Details

For detailed technical documentation, see:
- [Technical Overview](docs/TECHNICAL.md) - Architecture and behavior
- [Connection Guide](docs/CONNECTION.md) - Setting up authentication and CORS
- [Multi-Device Logic](docs/MULTI_DEVICE.md) - How sync and conflicts work
- [Entry Format](docs/ENTRY_FORMAT.md) - Markdown file structure

## Development

See [CLAUDE.md](CLAUDE.md) for development guidelines and commit conventions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Features in Detail

### Intelligent Session Commits
Sessions automatically commit after 30 minutes of inactivity. This means:
- Your writing is organized into logical sessions
- Each session is timestamped when you return after a break
- Easy to see when you wrote different parts of an entry

### Day Boundary Handling
If you're writing at 23:55 and continue past midnight:
1. The app detects the day change on the next save
2. Current content is saved to the old day with a timestamp
3. The new day's entry loads automatically
4. You continue writing in the new day's entry

### Multi-Device Synchronization
When editing from multiple devices:
1. Each device tracks the file's ETag (version)
2. Before saving, checks if ETag changed
3. If changed, appends with timestamp instead of overwriting
4. Shows "Saved (merged with external changes)"
5. Reloads to display all sections properly

### Read-Only Committed Sections
- Previous sessions appear in gray boxes above the editor
- Each section shows its timestamp
- Only the current session is editable
- Clear visual separation of history vs. active writing

## Troubleshooting

### Can't Connect
- Verify Nextcloud URL is correct and accessible
- Check that CORS headers are configured (see docs/CONNECTION.md)
- Ensure app password is valid
- Try accessing Nextcloud WebDAV directly in browser

### Changes Not Syncing
- Check internet connection
- Verify credentials are still valid
- Look for error messages in browser console
- Check Nextcloud server logs

### Folders Not Appearing
- Ensure you have read permissions on Nextcloud
- Check browser console for errors
- Verify WebDAV access is enabled in Nextcloud

## Browser Support

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅
- **Mobile browsers**: Full support ✅

Requires a browser with:
- ES6+ JavaScript support
- localStorage
- Fetch API
- Service Worker (for PWA features)

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

See [CLAUDE.md](CLAUDE.md) for development guidelines.
