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

1. **Nextcloud App Password**: Create an app-specific password in your Nextcloud settings (Personal → Security → Devices & sessions → Create new app password)

2. **Open the App**: Open `index.html` in your web browser

3. **Connect to Nextcloud**: Enter your:
   - Nextcloud URL (e.g., `https://cloud.example.com`)
   - Username
   - App password (not your regular password!)

4. **Choose Diary Folder**: Use the interactive folder browser to:
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

- Uses WebDAV to communicate with Nextcloud
- Credentials are stored in browser localStorage
- Only today's and yesterday's entries can be edited
- Supports offline usage with service worker caching
- Loads 3 months of entries at a time for performance