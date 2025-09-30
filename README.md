# Diary PWA

A Progressive Web App for maintaining a personal diary that syncs with your Nextcloud instance.

## Features

- 📝 Daily diary entries stored in markdown format
- 🔄 Automatic syncing with Nextcloud via WebDAV
- 📱 Works offline as a PWA (can be installed on your device)
- ♾️ Infinite scroll to browse older entries
- ✏️ Edit today's and yesterday's entries
- 💾 Auto-save as you type
- 📅 Organized by month in files named `yyyy-mm.md`

## Setup

### Method 1: App Password (Recommended for Personal Use)

1. **Create App Password**: In your Nextcloud settings (Personal → Security → Devices & sessions → Create new app password)

2. **Open the App**: Open `index.html` in your web browser

3. **Choose Authentication**: Select "🔑 App Password" method

4. **Connect**: Enter your:
   - Nextcloud URL (e.g., `https://cloud.example.com`)
   - Username
   - App password (generated in step 1)

### Method 2: OAuth2 (More Secure)

1. **Create OAuth2 App**: In Nextcloud admin settings:
   - Go to Settings → Security → OAuth 2.0 clients
   - Add a new client with name "Diary PWA"
   - Set redirect URI to your app URL (e.g., `http://localhost:8000`)
   - Note the Client ID and Client Secret

2. **Open the App**: Open `index.html` in your web browser

3. **Choose Authentication**: Select "🔐 OAuth2" method

4. **Connect**: Enter your:
   - Nextcloud URL (e.g., `https://cloud.example.com`)
   - OAuth2 Client ID (from step 1)
   - OAuth2 Client Secret (from step 1)

5. **Authorize**: 
   - Click "Connect with OAuth2"
   - Authorize in the popup window
   - Copy the access token and paste it in the app

### Final Steps (Both Methods)

**Choose Diary Folder**: Use the interactive folder browser to:
- Navigate through your Nextcloud folders
- Create new folders if needed (📁 Create New Folder button)
- Select the folder where your diary will be stored (✓ Use This Folder button)

## Usage

- **Writing**: The app opens to today's entry. Start typing to create/edit today's entry
- **Navigation**: Scroll down to see older entries, which load automatically
- **Entry Format**: Each entry has a date header and optional custom title
- **Time Stamps**: When extending today's entry, timestamps are added automatically
- **Auto-save**: Entries are saved automatically 1 second after you stop typing

## File Format

Entries are stored in monthly markdown files with this format:

```markdown
## 2025-01-29 - Optional Custom Title
Your diary entry content here...

*14:30*
Additional content added later with timestamp

## 2025-01-28
Another entry without custom title
```

## Installation as PWA

1. Open the app in Chrome/Edge/Safari
2. Look for the "Install" button in the address bar
3. Click to install as a standalone app
4. The app will appear in your applications and can work offline

## Technical Notes

- **Authentication**: Supports both app passwords (basic auth) and OAuth2 tokens
- **Storage**: Credentials/tokens are stored in browser localStorage
- **Security**: OAuth2 provides better security with token-based access
- **Editing**: Only today's and yesterday's entries can be edited
- **Offline**: Supports offline usage with service worker caching
- **Performance**: Loads 3 months of entries at a time
- **WebDAV**: Uses Nextcloud WebDAV API for file operations