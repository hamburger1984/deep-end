# Entry Format Specification

## Overview

Diary entries are stored in monthly markdown files with a specific format that enables parsing, session tracking, and multi-device synchronization.

## File Organization

### Naming Convention

```
yyyy-mm.md
```

Examples:
- `2025-01.md` - January 2025
- `2025-11.md` - November 2025
- `2026-12.md` - December 2026

### Directory Structure

```
Nextcloud Folder/
├── 2024-11.md
├── 2024-12.md
├── 2025-01.md
├── 2025-02.md
└── 2025-11.md
```

### Why Monthly Files?

- **Performance**: Faster to load and parse than yearly files
- **Size Management**: Typically 5-50 KB per month
- **Incremental Loading**: Load only months being viewed
- **Backup**: Easier to backup individual months

## Entry Structure

### Basic Entry

```markdown
## yyyy-mm-dd

Entry content goes here.
```

**Example:**
```markdown
## 2025-11-03

Today was a good day. I worked on my diary app.
```

### Entry with Title

```markdown
## yyyy-mm-dd - Custom Title

Entry content goes here.
```

**Example:**
```markdown
## 2025-11-03 - Productive Sunday

Today was a good day. I worked on my diary app and made great progress.
```

### Entry with Multiple Sessions

```markdown
## yyyy-mm-dd - Title

First session content.

*HH:MM*
Second session content after inactivity or external edit.

*HH:MM*
Third session content.
```

**Example:**
```markdown
## 2025-11-03 - Busy Day

Started my day with coffee and planning.

*14:30*
Had a productive afternoon coding session.

*19:45*
Evening reflections on the day's work.
```

## Format Rules

### Date Header

**Format:** `## yyyy-mm-dd`

**Rules:**
- Must start with `##` (markdown H2)
- Space after `##`
- Date in ISO format: `yyyy-mm-dd`
- Leading zeros required: `2025-01-03` not `2025-1-3`

**Valid:**
```markdown
## 2025-11-03
## 2025-01-15
## 2025-12-31
```

**Invalid:**
```markdown
# 2025-11-03        (H1, not H2)
## 2025-11-3        (no leading zero)
## 11-03-2025       (wrong order)
##2025-11-03        (no space)
```

### Title (Optional)

**Format:** `## yyyy-mm-dd - Title Text`

**Rules:**
- Space-dash-space separator: ` - `
- Title can contain any characters
- Title can be multiple words
- No length limit (but reasonable for display)

**Valid:**
```markdown
## 2025-11-03 - Morning Thoughts
## 2025-11-03 - Day #42: Progress!
## 2025-11-03 - 🎉 Celebration Day
```

**Invalid:**
```markdown
## 2025-11-03- Title      (no space before dash)
## 2025-11-03 -Title      (no space after dash)
## 2025-11-03 : Title     (wrong separator)
```

### Timestamps

**Format:** `*HH:MM*`

**Rules:**
- Surrounded by asterisks: `*HH:MM*`
- 24-hour format: `00:00` to `23:59`
- Leading zeros required
- On its own line
- Blank line before and after recommended

**Valid:**
```markdown
*09:30*
*14:00*
*23:59*
```

**Invalid:**
```markdown
*9:30*          (no leading zero)
*2:30 PM*       (12-hour format)
09:30           (no asterisks)
* 09:30 *       (extra spaces)
```

### Content

**Rules:**
- Plain text (markdown compatible)
- Any characters allowed
- Newlines preserved
- No special escaping needed

**Recommended:**
- Use blank lines between paragraphs
- Avoid markdown headers (##, ###) within content
- Timestamps should be on separate lines

## Complete File Example

```markdown
## 2025-11-03 - Productive Sunday

Woke up early and had a great breakfast. Spent the morning working on my diary app. Made significant progress on the session management feature.

*14:30*
Afternoon break. Went for a walk and got some coffee. Feeling refreshed.

*19:45*
Evening wrap-up. The day was very productive. Tomorrow I'll work on documentation.

## 2025-11-02 - Saturday Adventures

Went hiking in the mountains. The weather was perfect and the views were stunning.

*20:00*
Back home now. Tired but happy. Great day overall.

## 2025-11-01

Standard entry without a title. Just a regular day with regular things happening.
```

## Parsing Logic

### Entry Detection

The parser looks for lines starting with `## ` followed by a date pattern:

```javascript
const headerPattern = /^## (\d{4}-\d{2}-\d{2})(.*)$/;
```

### Title Extraction

If text follows the date, parse it as title:

```javascript
if (match[2]) {
    const titleText = match[2].replace(/^\s*-\s*/, '').trim();
}
```

### Content Extraction

Content is everything from the header line until:
- Next header (`## `)
- End of file

```javascript
while (i < lines.length && !lines[i].startsWith('## ')) {
    content += lines[i] + '\n';
    i++;
}
```

### Session Splitting

Content is split by timestamp pattern:

```javascript
const timestampPattern = /\n\*(\d{2}:\d{2})\*\n/g;
```

Each timestamp marks a new session boundary.

## Storage Considerations

### File Size

Typical sizes:
- **Light use**: 1-10 KB per month
- **Regular use**: 10-50 KB per month
- **Heavy use**: 50-200 KB per month

### Character Encoding

- **UTF-8** encoding
- Supports all Unicode characters
- Emojis supported: 🎉 ✨ 📝

### Line Endings

- **Unix (LF)**: `\n` - preferred
- **Windows (CRLF)**: `\r\n` - also supported
- Parser handles both automatically

## Compatibility

### Markdown Compatibility

Files are **valid markdown** and can be:
- Viewed in any markdown viewer
- Edited in any text editor
- Rendered on GitHub/GitLab
- Converted to other formats

### Human Readable

Files are designed to be human-readable:
```markdown
## 2025-11-03 - Great Day

Today was amazing!

*14:30*
Even better in the afternoon!
```

Anyone can read and understand the format without the app.

## Editing Guidelines

### Manual Editing

You can manually edit files with any text editor:

1. **Add Entries**:
   ```markdown
   ## 2025-11-10 - New Entry
   
   Content goes here.
   ```

2. **Modify Content**:
   - Edit any text
   - Add/remove paragraphs
   - Change titles

3. **Add Sessions**:
   ```markdown
   existing content
   
   *15:00*
   new session
   ```

### Best Practices

1. **Keep Date Format**:
   - Always use `yyyy-mm-dd`
   - Leading zeros required

2. **Preserve Structure**:
   - Keep `## ` for entries
   - Keep `*HH:MM*` format for timestamps

3. **Blank Lines**:
   - Use blank line after header
   - Use blank lines around timestamps
   - Improves readability

4. **Chronological Order**:
   - Newest entries at top
   - Within entry, sessions in chronological order

## Migration and Import

### From Plain Text

```python
# Convert plain text diary to format
with open('old_diary.txt') as f:
    lines = f.readlines()

output = []
for line in lines:
    if line.startswith('Date: '):
        date = parse_date(line)
        output.append(f'## {date}\n\n')
    else:
        output.append(line)

with open('2025-11.md', 'w') as f:
    f.writelines(output)
```

### From Other Apps

Many diary apps support export to markdown or text. Convert to this format:

1. Export entries as markdown/text
2. Parse dates and content
3. Reformat to `## yyyy-mm-dd` structure
4. Add to monthly files

### Validation

Check format validity:

```javascript
function validateEntry(text) {
    // Check for valid date header
    const hasHeader = /^## \d{4}-\d{2}-\d{2}/.test(text);
    
    // Check for valid timestamps (if any)
    const timestamps = text.match(/\*\d{2}:\d{2}\*/g);
    const validTimestamps = timestamps?.every(t => 
        /^\*([01]\d|2[0-3]):[0-5]\d\*$/.test(t)
    ) ?? true;
    
    return hasHeader && validTimestamps;
}
```

## Future Extensions

Possible format additions (backward compatible):

### Tags
```markdown
## 2025-11-03 - Title
#work #personal #ideas

Content here.
```

### Metadata
```markdown
## 2025-11-03 - Title
mood: happy
weather: sunny

Content here.
```

### Attachments
```markdown
## 2025-11-03 - Title

Content here.

![photo](attachments/2025-11-03-photo.jpg)
```

These would be optional additions that don't break the current parser.

## Appendix: Regular Expressions

### Date Header
```regex
^## (\d{4}-\d{2}-\d{2})(.*)$
```

### Timestamp
```regex
\*(\d{2}:\d{2})\*
```

### Complete Entry
```regex
^## (\d{4}-\d{2}-\d{2})(?:\s*-\s*(.+?))?\n((?:(?!^##)[\s\S])*?)(?=^##|\Z)
```

### Valid Time
```regex
^([01]\d|2[0-3]):[0-5]\d$
```

## File Example with All Features

```markdown
## 2025-11-15 - The Complete Example

This entry demonstrates all features of the format.

First paragraph with some content. It can span multiple lines and include any characters: åäö, emojis 🎉, and special chars !@#$%.

Second paragraph after a blank line.

*09:30*
Morning session after initial writing. This was added 30 minutes later after the inactivity timer expired.

More content in the morning session.

*14:00*
Afternoon session. This was written after coming back from lunch.

*18:45*
Evening session after another device made edits. External changes were detected and this content was appended with a timestamp.

## 2025-11-14

Previous day without a title. Just regular content.

*20:00*
An evening addition.

## 2025-11-13 - Older Entry

The oldest entry in this monthly file. Shows that entries are in reverse chronological order (newest first).
```
