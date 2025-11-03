# Development Guidelines for Claude

This file contains instructions for Claude (or other AI assistants) working on the Deep End project.

## Project Overview

**Deep End** is a Progressive Web App for personal journaling and reflection that syncs with Nextcloud. Created as a space for introspection away from the noise of social media and constant connectivity. Key features:
- Vanilla JavaScript (no frameworks)
- WebDAV API for Nextcloud sync
- Session-based commit system
- Multi-device conflict resolution
- Cross-midnight writing support

## Commit Convention

### After Every Significant Change

**Create a commit with a short, descriptive summary** explaining what was changed.

**Format:**
```
<Short description of what changed>

[Optional: More details if needed]
- Bullet points for multiple changes
- Explanation of why if non-obvious
```

**Examples:**

```bash
# Good commits:
git commit -m "Add session commit after 30min inactivity"

git commit -m "Fix day boundary detection for cross-midnight writing

- Check date on every save
- Save to old date before reloading
- Handles 23:55 → 00:10 scenario correctly"

git commit -m "Improve CORS error handling

Show user-friendly message when CORS headers missing"
```

**Avoid:**
```bash
# Too vague:
git commit -m "Update code"
git commit -m "Fix bug"

# Too long for first line:
git commit -m "Add session commit functionality that triggers after 30 minutes of inactivity and handles edge cases including..."
```

### When to Commit

Commit after:
- ✅ Completing a feature or fix
- ✅ Refactoring that works
- ✅ Adding documentation
- ✅ Fixing a bug
- ✅ Code cleanup

Don't commit:
- ❌ Broken code that doesn't work
- ❌ Experimental changes mid-progress
- ❌ Code with syntax errors
- ❌ Half-finished features (unless explicitly requested)

## Code Style

### JavaScript

**Use existing style:**
- ES6+ features (classes, arrow functions, async/await)
- No semicolons at end of statements
- 2-space indentation
- camelCase for variables and methods
- PascalCase for classes

**Example:**
```javascript
class DiaryApp {
  async loadTodaysEntry() {
    const today = new Date()
    const content = await this.loadMonthFile(filename)
    
    if (content) {
      this.displayEntry(content)
    }
  }
}
```

### HTML

- 2-space indentation
- Use semantic HTML
- Add helpful comments for major sections
- Descriptive IDs and classes

### CSS

- Organize by component
- Comment each major section
- Use CSS variables for colors (if adding)
- Mobile-first approach

## File Organization

```
/
├── index.html          # Main HTML structure
├── app.js             # Application logic (2 classes)
├── styles.css         # All styles
├── manifest.json      # PWA manifest
├── sw.js             # Service worker (if present)
├── README.md         # User documentation
├── LICENSE           # MIT license
├── CLAUDE.md         # This file
├── .gitignore        # Git ignore rules
└── docs/
    ├── TECHNICAL.md      # Technical architecture
    ├── CONNECTION.md     # Auth and CORS setup
    ├── MULTI_DEVICE.md   # Multi-device behavior
    └── ENTRY_FORMAT.md   # File format specification
```

## Testing Checklist

Before committing, manually test:

### Basic Functionality
- [ ] App loads without errors
- [ ] Can connect with app password
- [ ] Can navigate folder browser
- [ ] Can select folder
- [ ] Today's entry loads
- [ ] Can type and auto-save works
- [ ] Can add custom title

### Session Management
- [ ] Writing appears in editable textarea
- [ ] No errors in browser console
- [ ] Saves show "Saved" indicator

### Multi-Device (if relevant)
- [ ] Open in two browser tabs
- [ ] Edit in tab 1, save
- [ ] Edit in tab 2, save
- [ ] Check for "merged with external changes"
- [ ] Verify both contents present with timestamps

### Settings
- [ ] Can open settings (⚙️)
- [ ] "Back to Diary" button works
- [ ] Credentials preserved when going back

## Common Tasks

### Adding a New Feature

1. **Understand the current code**
   - Read relevant sections in app.js
   - Check existing patterns

2. **Plan the change**
   - Where does it fit?
   - What existing code is affected?
   - Any edge cases?

3. **Implement**
   - Follow existing code style
   - Add comments for complex logic
   - Consider error handling

4. **Test**
   - Manual testing in browser
   - Test edge cases
   - Check browser console for errors

5. **Document**
   - Update README if user-facing
   - Update docs/ if technical change
   - Add code comments for complex parts

6. **Commit**
   - Write clear commit message
   - Include "why" if not obvious

### Fixing a Bug

1. **Reproduce**
   - Understand the bug
   - Find steps to reproduce

2. **Locate**
   - Find relevant code
   - Understand current behavior

3. **Fix**
   - Make minimal change
   - Avoid refactoring while fixing

4. **Test**
   - Verify fix works
   - Ensure no regressions

5. **Commit**
   - Explain what was broken
   - Explain how fix works

### Refactoring

1. **Check tests first**
   - Ensure feature works before refactoring

2. **Small changes**
   - One refactor at a time
   - Don't mix with feature additions

3. **Preserve behavior**
   - Functionality stays the same
   - Only code organization changes

4. **Test thoroughly**
   - All features still work
   - No new bugs introduced

5. **Commit**
   - Explain why refactoring was needed
   - Note if performance improved

## Important Patterns

### Session Management

```javascript
// Three states for saves:
1. Normal save (same session) → updateEntryInPlace()
2. After commit (30min) → appendWithTimestamp()
3. External change → appendWithTimestamp()
```

### Day Boundary

```javascript
// Check on EVERY save:
if (currentEntryDate !== formatDate(today)) {
    // Day changed - save to old date, reload new date
}
```

### ETag Tracking

```javascript
// Store ETag when loading
this.todayBaselineETag = response.headers.get('etag')

// Check before saving
if (fileETag !== this.todayBaselineETag) {
    // External change detected
}
```

## Debugging Tips

### Browser Console

Always check for:
- JavaScript errors (red text)
- Network failures (in Network tab)
- CORS errors (specific message pattern)

### Common Issues

**CORS Errors:**
```
Access to fetch at '...' has been blocked by CORS policy
```
→ Check docs/CONNECTION.md for CORS setup

**Authentication Errors:**
```
401 Unauthorized
```
→ Verify credentials, check Nextcloud logs

**File Not Found:**
```
404 Not Found
```
→ Check folder path, verify WebDAV endpoint

### Adding Debug Logs

Temporary logs for development:
```javascript
console.log('Debug: currentEntryDate =', this.currentEntryDate)
console.log('Debug: today =', today)
```

**Important:** Remove or comment debug logs before committing!

## Documentation

### When to Update Docs

Update documentation when:
- Adding user-facing features → README.md
- Changing architecture → docs/TECHNICAL.md
- Modifying auth/connection → docs/CONNECTION.md
- Changing multi-device behavior → docs/MULTI_DEVICE.md
- Changing file format → docs/ENTRY_FORMAT.md

### Documentation Style

- **Clear and concise**
- **Examples for complex topics**
- **Step-by-step instructions**
- **Explain "why" not just "how"**
- **Keep up-to-date** with code changes

## Git Workflow

### Standard Flow

```bash
# 1. Check status
git status

# 2. Stage changes
git add <files>

# 3. Commit with message
git commit -m "Short description"

# 4. Push to remote
git push origin main
```

### Multiple Related Changes

```bash
# Make several commits for logical separation
git commit -m "Add feature X"
git commit -m "Update docs for feature X"
git commit -m "Fix edge case in feature X"
```

### After User Requests Changes

```bash
# User: "Please fix the day boundary bug"
# ... make changes ...
git add app.js
git commit -m "Fix day boundary detection

- Save to old date before reloading
- Handle midnight crossing correctly"

# User: "Also update the docs"
# ... update docs ...
git add docs/MULTI_DEVICE.md
git commit -m "Document day boundary behavior"
```

## Helpful References

### Project Documentation
- [README.md](README.md) - User guide
- [docs/TECHNICAL.md](docs/TECHNICAL.md) - Architecture
- [docs/CONNECTION.md](docs/CONNECTION.md) - Auth & CORS
- [docs/MULTI_DEVICE.md](docs/MULTI_DEVICE.md) - Multi-device sync
- [docs/ENTRY_FORMAT.md](docs/ENTRY_FORMAT.md) - File format

### External References
- [Nextcloud WebDAV](https://docs.nextcloud.com/server/latest/developer_manual/client_apis/WebDAV/)
- [MDN Web Docs](https://developer.mozilla.org/en-US/) - JavaScript/Web APIs
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Contact and Questions

If uncertain about:
- **Architecture decisions** → Check docs/TECHNICAL.md
- **User-facing behavior** → Check README.md
- **Code patterns** → Look at existing similar code
- **Commit message** → Keep it simple and clear

## Summary

**Most Important Rules:**
1. ✅ **Commit after each significant change**
2. ✅ **Write clear, short commit messages**
3. ✅ **Test before committing**
4. ✅ **Follow existing code style**
5. ✅ **Update docs when behavior changes**
6. ✅ **Check browser console for errors**
7. ✅ **Keep commits focused and logical**

Remember: The user can see git history, so clear commits help them understand what changed and why.
