# Multi-Device and Multi-Day Behavior

## Overview

The Diary PWA is designed to work seamlessly across multiple devices and handles writing across day boundaries intelligently. This document explains how these features work.

## Multi-Device Synchronization

### How It Works

The app uses **ETags** (entity tags) to detect when a file has been modified by another device.

#### ETag-Based Change Detection

1. **When loading an entry**:
   ```
   GET /remote.php/dav/files/user/folder/2025-11.md
   Response Headers:
       ETag: "abc123"
   ```
   - Store: `todayBaselineETag = "abc123"`

2. **Before saving**:
   ```
   GET /remote.php/dav/files/user/folder/2025-11.md
   Response Headers:
       ETag: "def456"  // Different!
   ```
   - Compare: `"def456" !== "abc123"`
   - **External change detected!**

3. **Handle conflict**:
   - Append current content with timestamp
   - Don't overwrite the changes
   - Merge instead of replace

### Conflict Resolution Strategy

The app uses an **append-only** strategy for conflicts:

```markdown
## Before (on server, edited by Device A):
## 2025-11-03
Device A wrote this content

## Device B wants to save:
Device B wrote this content

## After merge:
## 2025-11-03
Device A wrote this content

*14:30*
Device B wrote this content
```

#### Why This Works

- **No data loss**: Both devices' content is preserved
- **Chronological order**: Timestamps show when each edit happened
- **Clear attribution**: You can see which edit came later
- **User control**: You can manually edit to resolve if needed

### Real-World Scenarios

#### Scenario 1: Simultaneous Editing

**Timeline:**
1. **10:00** - Device A loads entry (ETag: `"v1"`)
2. **10:05** - Device B loads entry (ETag: `"v1"`)
3. **10:10** - Device A saves "Content A" (ETag becomes `"v2"`)
4. **10:15** - Device B saves "Content B"

**What Happens:**
- Device B loads file before saving
- Detects ETag changed: `"v2" !== "v1"`
- Appends "Content B" with timestamp
- Result:
  ```markdown
  ## 2025-11-03
  Content A
  
  *10:15*
  Content B
  ```

#### Scenario 2: Mobile and Desktop

**Timeline:**
1. **Morning** - Write on desktop, save
2. **Afternoon** - Open on mobile, add more
3. **Evening** - Return to desktop (still open)

**What Happens:**
- Desktop's ETag is stale
- Next save on desktop checks ETag
- Detects mobile's changes
- Appends desktop's new content with timestamp
- Both contents preserved

#### Scenario 3: Network Delay

**Timeline:**
1. **Device A** saves content
2. Network delay - save takes 30 seconds
3. **Device B** saves different content
4. Device A's save completes

**What Happens:**
- Device B might save first (depending on network)
- Device A's save will detect ETag change
- Content from both devices preserved
- Timestamps show actual save order

### User Interface Indicators

When external changes are detected:

```
"Saved (merged with external changes)"
```

This tells you:
- ✅ Your content was saved
- ✅ Changes from another device were detected
- ✅ Content was merged (not overwritten)
- ✅ Check the entry to see all changes

### Limitations

1. **No Real-Time Sync**
   - Changes only detected when saving
   - Not push-based (no WebSocket/polling)
   - Open tabs don't automatically update

2. **Manual Resolution Sometimes Needed**
   - If both devices edit the same paragraph
   - You may need to manually merge text
   - App won't attempt smart text merging

3. **ETag Limitations**
   - Some servers might not support ETags
   - ETag format varies by server
   - Cleared if file is deleted and recreated

## Multi-Day Behavior

### Day Boundary Detection

The app tracks which day's entry you're editing and checks on every save if the date has changed.

#### How It Works

1. **When loading entry**:
   ```javascript
   this.currentEntryDate = "2025-11-03"  // Store current date
   ```

2. **On every save**:
   ```javascript
   const today = formatDate(new Date())  // Get current date
   
   if (this.currentEntryDate !== today) {
       // Day changed!
       handleDayBoundary()
   }
   ```

3. **Handle day boundary**:
   - Save current content to OLD date
   - Reload TODAY's entry
   - Continue editing in new entry

### Cross-Midnight Writing

This is the most complex scenario: you start writing before midnight and continue after.

#### Scenario: 23:55 → 00:10

**Initial State (23:55):**
```javascript
currentEntryDate = "2025-11-02"
Entry text: "Writing late at night..."
```

**User continues typing...**

**Auto-save triggers (00:01):**
```javascript
today = "2025-11-03"  // Midnight passed!
currentEntryDate = "2025-11-02"  // Still set to old date

// Day boundary detected!
if (currentEntryDate !== today) {
    // Save to old date
    saveToFile("2025-11-02", "Writing late at night...")
    
    // Reload today's entry
    loadTodaysEntry()  // Sets currentEntryDate = "2025-11-03"
    
    // Exit save - will be called again for new day
    return
}
```

**Result:**

File `2025-11.md`:
```markdown
## 2025-11-02
Writing late at night...

*00:01*
Continued writing after midnight

## 2025-11-03
Continued writing after midnight
```

**User Experience:**
- ✅ Content before midnight saved to Nov 2
- ✅ Content after midnight saved to Nov 3
- ✅ Timestamp shows when day changed
- ✅ Editor reloads with Nov 3 entry
- ✅ User continues writing seamlessly

### Month Boundary

Similar handling for month changes:

**Scenario: Nov 30 23:55 → Dec 1 00:10**

**What Happens:**
- Content saved to `2025-11.md` for Nov 30
- New entry created in `2025-12.md` for Dec 1
- Both files updated correctly
- User sees new month's entry

### Edge Cases

#### Rapid Day Change

**Scenario:** User writing at 23:59:58, continues typing

**Handling:**
- Multiple saves might occur during minute change
- First save after midnight detects boundary
- Subsequent saves go to new date
- No duplicates, clean split

#### Time Zone Changes

**Scenario:** Traveling across time zones

**Behavior:**
- Uses device's local time
- Date calculation based on local time
- If device time changes, treated as day change
- Handles daylight saving time correctly

#### System Clock Adjusted

**Scenario:** System clock set backward

**Behavior:**
- If clock goes back to previous day
- Treated as day boundary in reverse
- Saves to "new" (actually old) day
- Might create confusion - avoid manual clock changes

## Session Management Across Days

### Session Commits and Day Changes

Sessions commit based on **inactivity** (30 minutes) OR **day change**, whichever comes first.

#### Scenario: Long Writing Session Across Midnight

**Timeline:**
- **23:30** - Start writing session
- **23:59** - Still typing (no 30-min gap)
- **00:01** - Continue typing

**What Happens:**
1. Auto-save at 00:01 detects day change
2. Saves to old date with timestamp
3. Reloads new date
4. Session for new date starts fresh
5. No inactivity timeout needed

**Result:**
```markdown
## 2025-11-02 (in 2025-11.md)
Evening writing...

*23:59*
Last thoughts before midnight

## 2025-11-03 (in 2025-12.md)
First thoughts of new day
```

### Committed Sections Across Days

Committed sections are **per-entry**, not global:

- Nov 2 entry has its own committed sections
- Nov 3 entry starts with no committed sections
- Each day is independent
- Timestamps restart for each day

## Best Practices

### For Multi-Device Usage

1. **Save Regularly**
   - Auto-save handles this automatically
   - Reduces risk of conflicts

2. **Check for Merge Indicators**
   - Look for "merged with external changes"
   - Review entry to see all content

3. **Avoid Simultaneous Editing**
   - Try to use one device at a time
   - If conflict occurs, manually merge if needed

4. **Close Inactive Tabs**
   - Stale tabs might have old ETags
   - Refresh if you haven't used tab in a while

### For Cross-Midnight Writing

1. **No Special Action Needed**
   - App handles automatically
   - Just keep writing

2. **Check Date Display**
   - Date shown in UI updates automatically
   - Confirms which day you're editing

3. **Review After Midnight**
   - Your content splits across two days
   - Check both entries if needed

### For Teams/Shared Accounts

**Not Recommended** - The app is designed for single-user personal diaries, not collaborative editing.

If multiple people share an account:
- High risk of conflicts
- Manual merging required often
- Consider separate folders or accounts
- Or use different diary apps

## Technical Implementation

### ETag Tracking

```javascript
// On load
this.todayBaselineETag = response.headers.get('etag')

// Before save
const currentETag = (await loadFile()).etag

if (this.todayBaselineETag !== currentETag) {
    // External change detected
    appendWithTimestamp()
}
```

### Day Boundary Check

```javascript
// On save
const today = this.formatDate(new Date())

if (this.currentEntryDate !== today) {
    // Day changed
    await saveToDate(this.currentEntryDate, content)
    await this.loadTodaysEntry()
    return  // Exit save, will be called again
}
```

### Merge Strategy

```javascript
function appendEntryWithTimestamp(content, date, title, newText) {
    const timestamp = formatTime(new Date())  // "HH:MM"
    
    // Find existing entry for date
    const existingContent = extractEntryContent(content, date)
    
    // Append with timestamp
    return `${existingContent}\n\n*${timestamp}*\n${newText}`
}
```

## Troubleshooting

### Content Disappeared

**Possible Causes:**
- Conflict resolution appended instead of showing
- Wrong date being viewed
- File permissions issue

**Solutions:**
- Check previous day's entry
- Look for timestamps in entry
- Check Nextcloud logs

### Duplicate Content

**Possible Causes:**
- Multiple saves from different devices
- Network retry caused duplicate

**Solutions:**
- Manually remove duplicates
- Usually doesn't happen with proper ETag handling

### Time Stamps Incorrect

**Possible Causes:**
- Device clock wrong
- Time zone mismatch

**Solutions:**
- Check device time settings
- Ensure clock is accurate
- Check time zone configuration

### Day Not Changing

**Possible Causes:**
- Auto-save not triggering
- Date format issue
- JavaScript Date() issue

**Solutions:**
- Check browser console for errors
- Verify system date/time
- Try refreshing page
