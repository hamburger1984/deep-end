class FolderBrowser {
  constructor(config) {
    this.config = config;
    this.currentPath = "";
    this.folders = [];
    this.setupEventListeners();
  }

  getAuthHeaders() {
    return {
      Authorization:
        "Basic " + btoa(`${this.config.username}:${this.config.password}`),
    };
  }

  setupEventListeners() {
    document.getElementById("breadcrumb-home").addEventListener("click", () => {
      this.navigateToPath("");
    });

    document
      .getElementById("create-folder-btn")
      .addEventListener("click", () => {
        this.showCreateFolderModal();
      });

    document
      .getElementById("select-current-btn")
      .addEventListener("click", () => {
        this.selectCurrentFolder();
      });

    document
      .getElementById("cancel-create-btn")
      .addEventListener("click", () => {
        this.hideCreateFolderModal();
      });

    document
      .getElementById("confirm-create-btn")
      .addEventListener("click", () => {
        this.createNewFolder();
      });

    document
      .getElementById("new-folder-name")
      .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.createNewFolder();
        } else if (e.key === "Escape") {
          this.hideCreateFolderModal();
        }
      });
  }

  async show() {
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("folder-browser-screen").classList.remove("hidden");
    await this.loadFolders();
  }

  async loadFolders() {
    document.getElementById("folder-loading").classList.remove("hidden");

    try {
      const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${this.currentPath}`;

      const response = await fetch(url, {
        method: "PROPFIND",
        headers: {
          ...this.getAuthHeaders(),
          Depth: "1",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load folders");
      }

      const text = await response.text();
      this.folders = this.parseWebDAVResponse(text);
      this.displayFolders();
      this.updateBreadcrumb();
    } catch (error) {
      alert("Error loading folders: " + error.message);
    } finally {
      document.getElementById("folder-loading").classList.add("hidden");
    }
  }

  parseWebDAVResponse(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, "text/xml");
    const responses = doc.querySelectorAll("response");
    const folders = [];

    // Build the expected current directory path
    const currentDirPath = this.currentPath
      ? `/remote.php/dav/files/${this.config.username}/${this.currentPath}/`
      : `/remote.php/dav/files/${this.config.username}/`;

    responses.forEach((response) => {
      const href = response.querySelector("href")?.textContent;
      const resourceType = response.querySelector("resourcetype");
      const isCollection = resourceType?.querySelector("collection") !== null;

      if (href && isCollection) {
        const decodedHref = decodeURIComponent(href);

        // Skip the current directory itself
        if (
          decodedHref === currentDirPath ||
          decodedHref === currentDirPath.slice(0, -1)
        ) {
          return;
        }

        // Extract folder name from the href
        const pathParts = decodedHref.split("/").filter((p) => p);
        const folderName = pathParts[pathParts.length - 1];

        if (folderName) {
          folders.push({
            name: folderName,
            path: this.currentPath
              ? `${this.currentPath}/${folderName}`
              : folderName,
            isFolder: true,
          });
        }
      }
    });

    return folders.sort((a, b) => a.name.localeCompare(b.name));
  }

  displayFolders() {
    const folderList = document.getElementById("folder-list");
    folderList.innerHTML = "";

    // Add parent directory navigation if not at root
    if (this.currentPath) {
      const parentItem = document.createElement("div");
      parentItem.className = "folder-item";
      parentItem.innerHTML = `
        <span class="folder-icon">⬆️</span>
        <span class="folder-name">..</span>
        <span class="folder-type">parent</span>
      `;
      parentItem.addEventListener("click", () => {
        const parentPath = this.currentPath.split("/").slice(0, -1).join("/");
        this.navigateToPath(parentPath);
      });
      folderList.appendChild(parentItem);
    }

    // Add folders
    this.folders.forEach((folder) => {
      const folderItem = document.createElement("div");
      folderItem.className = "folder-item";
      folderItem.innerHTML = `
        <span class="folder-icon">📁</span>
        <span class="folder-name">${folder.name}</span>
        <span class="folder-type">folder</span>
      `;
      folderItem.addEventListener("click", () => {
        this.navigateToPath(folder.path);
      });
      folderList.appendChild(folderItem);
    });

    if (this.folders.length === 0 && !this.currentPath) {
      folderList.innerHTML =
        '<div class="folder-item"><span class="folder-name">No folders found</span></div>';
    }
  }

  async navigateToPath(path) {
    this.currentPath = path;
    await this.loadFolders();
  }

  updateBreadcrumb() {
    const pathSpan = document.getElementById("breadcrumb-path");
    if (this.currentPath) {
      const pathParts = this.currentPath.split("/");
      pathSpan.textContent = " / " + pathParts.join(" / ");
    } else {
      pathSpan.textContent = "";
    }
  }

  showCreateFolderModal() {
    document.getElementById("create-folder-modal").classList.remove("hidden");
    document.getElementById("new-folder-name").focus();
  }

  hideCreateFolderModal() {
    document.getElementById("create-folder-modal").classList.add("hidden");
    document.getElementById("new-folder-name").value = "";
  }

  async createNewFolder() {
    const folderName = document.getElementById("new-folder-name").value.trim();

    if (!folderName) {
      alert("Please enter a folder name");
      return;
    }

    if (!/^[a-zA-Z0-9._-\s]+$/.test(folderName)) {
      alert("Folder name contains invalid characters");
      return;
    }

    try {
      const newPath = this.currentPath
        ? `${this.currentPath}/${folderName}`
        : folderName;
      const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${newPath}`;

      const response = await fetch(url, {
        method: "MKCOL",
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      this.hideCreateFolderModal();
      await this.loadFolders();
    } catch (error) {
      alert("Error creating folder: " + error.message);
    }
  }

  selectCurrentFolder() {
    const selectedPath = this.currentPath || "";

    // Return to main app with selected folder
    return {
      url: this.config.url,
      username: this.config.username,
      password: this.config.password,
      folder: selectedPath,
    };
  }
}

class DiaryApp {
  constructor() {
    this.config = this.loadConfig();
    this.entries = new Map(); // Cache for loaded entries
    this.isLoading = false;
    this.currentMonth = new Date();
    this.oldestLoadedMonth = new Date();
    this.autoSaveTimeout = null;
    this.folderBrowser = null;

    // Session-based commit tracking
    this.todayBaselineContent = null; // Content when entry was loaded
    this.todayBaselineETag = null; // ETag when entry was loaded
    this.currentSessionText = null; // Text written in this session
    this.currentEntryDate = null; // Date of the entry we're currently editing
    this.lastEditTime = null; // Timestamp of last edit
    this.sessionCommitTimer = null; // Timer for auto-committing inactive sessions
    this.sessionCommitDelay = 30 * 60 * 1000; // 30 minutes in milliseconds
    this.sessionCommitted = false; // Flag: was the current session committed?

    this.init();
  }

  init() {
    if (this.config) {
      this.showMainScreen();
    } else {
      // Start with localStorage mode by default (no setup required)
      this.config = { storageType: "local" };
      this.showMainScreen();
    }

    this.setupEventListeners();
    this.setupInfiniteScroll();
  }

  loadConfig() {
    const config = localStorage.getItem("diary-config");
    return config ? JSON.parse(config) : null;
  }

  saveConfig(config) {
    localStorage.setItem("diary-config", JSON.stringify(config));
    this.config = config;
  }

  setupEventListeners() {
    // Auth form
    document
      .getElementById("app-password-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAppPasswordAuth();
      });

    // Settings button
    document.getElementById("settings-btn").addEventListener("click", () => {
      this.showSetupScreen();
    });

    // Back to diary button
    document
      .getElementById("back-to-diary-btn")
      .addEventListener("click", () => {
        this.showMainScreen();
      });

    // Connect to Nextcloud button (from localStorage mode)
    document
      .getElementById("connect-nextcloud-btn")
      .addEventListener("click", () => {
        this.showNextcloudSetup();
      });

    // Auto-save for today's entry
    document.getElementById("entry-text").addEventListener("input", () => {
      this.autoSaveEntry();
    });

    document.getElementById("custom-title").addEventListener("input", () => {
      this.autoSaveEntry();
    });
  }

  setupInfiniteScroll() {
    let ticking = false;

    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (
            window.innerHeight + window.scrollY >=
            document.body.offsetHeight - 1000
          ) {
            this.loadOlderEntries();
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  async handleAppPasswordAuth() {
    const url = document.getElementById("nextcloud-url").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("app-password").value;

    // If password field is empty and we have an existing config, keep the old password
    const finalPassword =
      password || (this.config && this.config.password) || "";

    if (!finalPassword) {
      alert("Please enter an app password");
      return;
    }

    const config = {
      url: url.endsWith("/") ? url.slice(0, -1) : url,
      username,
      password: finalPassword,
      authType: "basic",
    };

    try {
      // Test connection
      await this.testConnection(config);

      // Show folder browser
      this.folderBrowser = new FolderBrowser(config);
      await this.folderBrowser.show();

      // Set up folder selection handler
      const selectBtn = document.getElementById("select-current-btn");
      selectBtn.replaceWith(selectBtn.cloneNode(true));

      document
        .getElementById("select-current-btn")
        .addEventListener("click", async () => {
          const finalConfig = this.folderBrowser.selectCurrentFolder();
          finalConfig.authType = "basic";

          // Check if we're migrating from localStorage
          const wasLocalStorage =
            this.config && this.config.storageType === "local";

          if (wasLocalStorage) {
            // Migrate localStorage files to Nextcloud
            const result = await this.migrateToNextcloud(finalConfig);

            if (result.success) {
              // Migration successful - ask if user wants to clear localStorage
              const shouldClear = confirm(
                `Successfully migrated ${result.migrated} file(s) to Nextcloud!\n\nDo you want to clear the local copies from browser storage?\n\n(Recommended: Yes - Your files are now safely stored in Nextcloud)`,
              );

              if (shouldClear) {
                this.clearLocalStorageFiles();
                alert(
                  "Local files cleared. Your data is now synced with Nextcloud.",
                );
              } else {
                alert("Local files kept as backup.");
              }
            } else if (result.migrated > 0) {
              alert(
                `Partially migrated: ${result.migrated} file(s) succeeded, ${result.failed} file(s) failed.\n\nLocal files kept for safety.`,
              );
            }
          }

          this.saveConfig(finalConfig);
          await this.showMainScreen();
        });
    } catch (error) {
      alert("Connection failed: " + error.message);
    }
  }

  async testConnection(config) {
    const headers = this.getAuthHeaders(config);
    const testUrl = `${config.url}/remote.php/dav/files/${config.username}/`;

    const response = await fetch(testUrl, {
      method: "PROPFIND",
      headers: {
        ...headers,
        Depth: "0",
      },
    });

    if (!response.ok) {
      throw new Error("Authentication failed");
    }
  }

  getAuthHeaders(config) {
    return {
      Authorization: "Basic " + btoa(`${config.username}:${config.password}`),
    };
  }

  showNextcloudSetup() {
    // Show the Nextcloud auth form
    document.getElementById("local-storage-info").classList.add("hidden");
    document.getElementById("app-password-form").classList.remove("hidden");

    // Clear any previous values
    document.getElementById("nextcloud-url").value = "";
    document.getElementById("username").value = "";
    document.getElementById("app-password").value = "";
    document.getElementById("app-password").required = true;
    document.getElementById("app-password").placeholder = "";
  }

  showMigrationProgress(current, total) {
    let progressDiv = document.getElementById("migration-progress");

    if (!progressDiv) {
      progressDiv = document.createElement("div");
      progressDiv.id = "migration-progress";
      progressDiv.className = "migration-progress";
      document.body.appendChild(progressDiv);
    }

    progressDiv.innerHTML = `
      <div class="migration-content">
        <h3>📤 Migrating to Nextcloud</h3>
        <p>Uploading file ${current} of ${total}...</p>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${(current / total) * 100}%"></div>
        </div>
      </div>
    `;
    progressDiv.classList.remove("hidden");
  }

  hideMigrationProgress() {
    const progressDiv = document.getElementById("migration-progress");
    if (progressDiv) {
      progressDiv.classList.add("hidden");
    }
  }

  async migrateToNextcloud(newConfig) {
    // Get all localStorage files
    const filesToMigrate = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("deepend:file:")) {
        const filename = key.replace("deepend:file:", "");
        const content = localStorage.getItem(key);
        filesToMigrate.push({ filename, content });
      }
    }

    if (filesToMigrate.length === 0) {
      // No files to migrate
      return { success: true, migrated: 0, failed: 0 };
    }

    let migrated = 0;
    let failed = 0;

    // Temporarily set config to use Nextcloud
    const oldConfig = this.config;
    this.config = newConfig;

    for (const file of filesToMigrate) {
      try {
        // Show progress
        this.showMigrationProgress(migrated + 1, filesToMigrate.length);

        // Use the Nextcloud save logic
        await this.saveMonthFile(file.filename, file.content);
        migrated++;
        console.log(`Migrated: ${file.filename}`);
      } catch (error) {
        console.error(`Failed to migrate ${file.filename}:`, error);
        failed++;
      }
    }

    // Hide progress indicator
    this.hideMigrationProgress();

    // Keep the new config
    this.config = newConfig;

    return { success: failed === 0, migrated, failed };
  }

  clearLocalStorageFiles() {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith("deepend:file:") || key.startsWith("deepend:meta:")) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`Cleared ${keysToRemove.length} localStorage entries`);
  }

  showSetupScreen() {
    document.getElementById("setup-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("folder-browser-screen").classList.add("hidden");

    if (this.config && this.config.storageType === "local") {
      // localStorage mode - show info and connect option
      document.getElementById("back-to-diary-btn").classList.remove("hidden");
      document.getElementById("local-storage-info").classList.remove("hidden");

      // Hide auth form
      document.getElementById("app-password-form").classList.add("hidden");

      // Show storage mode indicator
      document
        .getElementById("storage-mode-indicator")
        .classList.remove("hidden");
      document.getElementById("storage-mode-text").textContent =
        "💾 Storage: Local (Browser Only)";
    } else if (this.config) {
      // Nextcloud mode - show existing config
      document.getElementById("back-to-diary-btn").classList.remove("hidden");
      document.getElementById("local-storage-info").classList.add("hidden");
      document.getElementById("app-password-form").classList.remove("hidden");

      document.getElementById("nextcloud-url").value = this.config.url;
      document.getElementById("username").value = this.config.username;

      // For security, don't populate password but indicate it's saved
      if (this.config.password) {
        const passwordField = document.getElementById("app-password");
        passwordField.value = "";
        passwordField.placeholder =
          "Password saved (leave empty to keep current)";
        passwordField.required = false; // Make it optional when editing existing config
      }

      // Show storage mode indicator
      document
        .getElementById("storage-mode-indicator")
        .classList.remove("hidden");
      document.getElementById("storage-mode-text").textContent =
        "☁️ Storage: Nextcloud Sync";
    } else {
      // Initial setup - should not happen anymore since we default to localStorage
      document.getElementById("back-to-diary-btn").classList.add("hidden");
      document.getElementById("local-storage-info").classList.add("hidden");
      document.getElementById("app-password-form").classList.remove("hidden");

      // Reset password field to required for initial setup
      const passwordField = document.getElementById("app-password");
      passwordField.required = true;
      passwordField.placeholder = "";
    }
  }

  async showMainScreen() {
    document.getElementById("setup-screen").classList.add("hidden");
    document.getElementById("folder-browser-screen").classList.add("hidden");
    document.getElementById("main-screen").classList.remove("hidden");

    await this.loadTodaysEntry();
    await this.loadOlderEntries();
  }

  async loadTodaysEntry() {
    const today = new Date();
    const todayStr = this.formatDate(today);

    document.getElementById("today-date").textContent = todayStr;

    // Set current entry date
    this.currentEntryDate = this.formatDate(today);

    // Reset session flags when loading entry
    this.sessionCommitted = false;
    this.lastEditTime = null;

    try {
      const monthFile = this.getMonthFileName(today);
      const fileData = await this.loadMonthFile(monthFile, true);
      const todayEntry = this.parseEntryFromContent(fileData.content, today);

      if (todayEntry) {
        // Store baseline for this session
        this.todayBaselineContent = todayEntry.content || "";
        this.todayBaselineETag = fileData.etag;

        // Parse content to separate committed sections from current session
        const { committedSections, currentText } = this.parseContentSections(
          todayEntry.content || "",
        );
        this.currentSessionText = currentText;

        document.getElementById("custom-title").value =
          todayEntry.customTitle || "";

        // Display committed sections (read-only)
        this.displayCommittedSections(committedSections);

        // Display current editable text
        document.getElementById("entry-text").value = currentText;
        document.querySelector(".date-header").classList.remove("grayed");
      } else {
        // No entry exists yet
        this.todayBaselineContent = "";
        this.todayBaselineETag = fileData.etag;
        this.currentSessionText = "";

        // Clear committed sections display
        this.displayCommittedSections([]);
        document.getElementById("entry-text").value = "";

        document.querySelector(".date-header").classList.add("grayed");
        document.getElementById("entry-text").focus();
      }
    } catch (error) {
      // Month file doesn't exist yet
      this.todayBaselineContent = "";
      this.todayBaselineETag = null;
      this.currentSessionText = "";

      // Clear committed sections display
      this.displayCommittedSections([]);
      document.getElementById("entry-text").value = "";

      document.querySelector(".date-header").classList.add("grayed");
      document.getElementById("entry-text").focus();
    }
  }

  async loadOlderEntries() {
    if (this.isLoading) return;

    this.isLoading = true;
    document.getElementById("loading").classList.remove("hidden");

    try {
      // Load previous months
      const monthsToLoad = 3; // Load 3 months at a time
      const promises = [];

      for (let i = 1; i <= monthsToLoad; i++) {
        const targetDate = new Date(this.oldestLoadedMonth);
        targetDate.setMonth(targetDate.getMonth() - i);

        const monthFile = this.getMonthFileName(targetDate);
        promises.push(this.loadAndDisplayMonth(monthFile, targetDate));
      }

      await Promise.all(promises);

      // Update oldest loaded month
      this.oldestLoadedMonth.setMonth(
        this.oldestLoadedMonth.getMonth() - monthsToLoad,
      );
    } catch (error) {
      console.error("Error loading older entries:", error);
    } finally {
      this.isLoading = false;
      document.getElementById("loading").classList.add("hidden");
    }
  }

  async loadAndDisplayMonth(monthFile, monthDate) {
    try {
      const content = await this.loadMonthFile(monthFile);
      const entries = this.parseAllEntriesFromContent(content, monthDate);
      this.displayEntries(entries);
    } catch (error) {
      // Month file doesn't exist, skip
    }
  }

  async loadMonthFile(filename, withMetadata = false) {
    // Check if using localStorage mode
    if (!this.config || this.config.storageType === "local") {
      // localStorage mode
      const content = localStorage.getItem(`deepend:file:${filename}`);

      if (!content) {
        throw new Error(`File not found: ${filename}`);
      }

      if (withMetadata) {
        // No ETag in localStorage mode
        return {
          content,
          etag: null,
          lastModified: localStorage.getItem(
            `deepend:meta:${filename}:lastModified`,
          ),
        };
      }

      return content;
    }

    // Nextcloud mode
    const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${this.config.folder}/${filename}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(this.config),
    });

    if (!response.ok) {
      throw new Error(`File not found: ${filename}`);
    }

    const content = await response.text();

    if (withMetadata) {
      return {
        content,
        etag: response.headers.get("etag"),
        lastModified: response.headers.get("last-modified"),
      };
    }

    return content;
  }

  async saveMonthFile(filename, content) {
    // Check if using localStorage mode
    if (!this.config || this.config.storageType === "local") {
      // localStorage mode
      localStorage.setItem(`deepend:file:${filename}`, content);
      localStorage.setItem(
        `deepend:meta:${filename}:lastModified`,
        new Date().toISOString(),
      );
      return;
    }

    // Nextcloud mode
    const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${this.config.folder}/${filename}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        ...this.getAuthHeaders(this.config),
        "Content-Type": "text/plain",
      },
      body: content,
    });

    if (!response.ok) {
      throw new Error(`Failed to save file: ${filename}`);
    }
  }

  parseEntryFromContent(content, date) {
    const dateStr = this.formatDate(date);
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`## ${dateStr}`)) {
        const headerLine = lines[i];
        const customTitle = headerLine
          .substring(`## ${dateStr}`.length)
          .replace(/^\s*-\s*/, "")
          .trim();

        let entryContent = "";
        i++;
        while (i < lines.length && !lines[i].startsWith("## ")) {
          entryContent += lines[i] + "\n";
          i++;
        }

        return {
          date: date,
          customTitle: customTitle || "",
          content: entryContent.trim(),
        };
      }
    }

    return null;
  }

  parseAllEntriesFromContent(content, monthDate) {
    const entries = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("## ")) {
        const headerLine = lines[i];
        const match = headerLine.match(/^## (\d{4}-\d{2}-\d{2})(.*)$/);

        if (match) {
          const entryDate = new Date(match[1]);
          const customTitle = match[2].replace(/^\s*-\s*/, "").trim();

          let entryContent = "";
          i++;
          while (i < lines.length && !lines[i].startsWith("## ")) {
            entryContent += lines[i] + "\n";
            i++;
          }
          i--; // Back up one since the loop will increment

          entries.push({
            date: entryDate,
            customTitle: customTitle || "",
            content: entryContent.trim(),
          });
        }
      }
    }

    return entries.sort((a, b) => b.date - a.date); // Newest first
  }

  displayEntries(entries) {
    const container = document.getElementById("entries-container");

    entries.forEach((entry) => {
      if (!this.isToday(entry.date) && !this.isYesterday(entry.date)) {
        const entryElement = this.createEntryElement(entry);
        container.appendChild(entryElement);
      }
    });
  }

  createEntryElement(entry) {
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry-item";

    const dateStr = this.formatDate(entry.date);
    const displayTitle = entry.customTitle
      ? `${dateStr} - ${entry.customTitle}`
      : dateStr;

    entryDiv.innerHTML = `
            <div class="entry-date">${displayTitle}</div>
            <div class="entry-content">${this.formatEntryContent(entry.content)}</div>
        `;

    return entryDiv;
  }

  formatEntryContent(content) {
    // Handle time stamps and preserve formatting
    return content
      .replace(/\n/g, "<br>")
      .replace(/\*(\d{2}:\d{2})\*/g, '<span class="entry-time">$1</span>');
  }

  async autoSaveEntry() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    // Update last edit time
    this.lastEditTime = Date.now();

    // Reset the session commit timer
    if (this.sessionCommitTimer) {
      clearTimeout(this.sessionCommitTimer);
    }

    // Set up timer to commit session after inactivity
    this.sessionCommitTimer = setTimeout(async () => {
      await this.commitCurrentSession();
    }, this.sessionCommitDelay);

    this.autoSaveTimeout = setTimeout(async () => {
      await this.saveTodaysEntry();
    }, 1000);
  }

  async commitCurrentSession() {
    // Commit means: next edit will append with timestamp
    // We just need to update the baseline to include current content
    const entryText = document.getElementById("entry-text").value.trim();

    if (!entryText) return; // Nothing to commit

    // Save current content first (without triggering another commit)
    const tempSessionCommitted = this.sessionCommitted;
    this.sessionCommitted = false; // Prevent recursion
    await this.saveTodaysEntry();
    this.sessionCommitted = tempSessionCommitted;

    // Mark session as committed
    this.sessionCommitted = true;

    // Update baseline to mark this content as "committed"
    const today = new Date();
    const monthFile = this.getMonthFileName(today);

    try {
      const fileData = await this.loadMonthFile(monthFile, true);
      const todayEntry = this.parseEntryFromContent(fileData.content, today);

      if (todayEntry) {
        this.todayBaselineContent = todayEntry.content;
        this.todayBaselineETag = fileData.etag;

        // Reload the display to show committed sections
        const { committedSections, currentText } = this.parseContentSections(
          todayEntry.content || "",
        );
        this.displayCommittedSections(committedSections);
        document.getElementById("entry-text").value = currentText;
      }

      console.log("Session committed after inactivity");
    } catch (error) {
      console.error("Error committing session:", error);
    }
  }

  async saveTodaysEntry() {
    const customTitle = document.getElementById("custom-title").value.trim();
    const entryText = document.getElementById("entry-text").value.trim();

    if (!entryText) return; // Don't save empty entries

    const today = new Date();
    const todayStr = this.formatDate(today);

    // Check if the date has changed (day boundary crossed)
    if (this.currentEntryDate && this.currentEntryDate !== todayStr) {
      // Date changed! Need to commit old session and start new entry
      console.log(
        "Day boundary crossed! Moving from",
        this.currentEntryDate,
        "to",
        todayStr,
      );

      // First, append current content to old entry with timestamp
      const oldDate = new Date(this.currentEntryDate);
      const oldMonthFile = this.getMonthFileName(oldDate);

      try {
        const oldFileData = await this.loadMonthFile(oldMonthFile, true);
        const oldUpdatedContent = this.appendEntryWithTimestamp(
          oldFileData.content,
          oldDate,
          customTitle,
          entryText,
        );
        await this.saveMonthFile(oldMonthFile, oldUpdatedContent);
      } catch (error) {
        console.error("Error saving to old date:", error);
      }

      // Now reload today's entry
      await this.loadTodaysEntry();
      return;
    }

    const monthFile = this.getMonthFileName(today);

    try {
      let fileData;
      try {
        fileData = await this.loadMonthFile(monthFile, true);
      } catch (error) {
        // File doesn't exist, start with empty content
        fileData = { content: "", etag: null };
      }

      // Check if file was modified externally (by another device)
      const externalChange =
        this.todayBaselineETag &&
        fileData.etag &&
        this.todayBaselineETag !== fileData.etag;

      if (externalChange || this.sessionCommitted) {
        // File was modified by another device OR session was committed due to inactivity
        // Need to append with timestamp

        // Clear the session committed flag - we're starting a new session now
        if (this.sessionCommitted) {
          this.sessionCommitted = false;
        }
        const updatedContent = this.appendEntryWithTimestamp(
          fileData.content,
          today,
          customTitle,
          entryText,
        );
        await this.saveMonthFile(monthFile, updatedContent);

        // Reload the entry to show the merged content with committed sections
        const newFileData = await this.loadMonthFile(monthFile, true);
        const todayEntry = this.parseEntryFromContent(
          newFileData.content,
          today,
        );

        if (todayEntry) {
          const { committedSections, currentText } = this.parseContentSections(
            todayEntry.content || "",
          );
          this.displayCommittedSections(committedSections);
          document.getElementById("entry-text").value = currentText;
          this.todayBaselineContent = todayEntry.content;
          this.todayBaselineETag = newFileData.etag;
          this.currentSessionText = currentText;
        }

        const saveMessage = externalChange
          ? "Saved (merged with external changes)"
          : "Saved (new session started)";
        this.showAutoSaveIndicator(saveMessage);
      } else {
        // Normal save - just update the entry
        const updatedContent = this.updateEntryInContent(
          fileData.content,
          today,
          customTitle,
          entryText,
        );
        await this.saveMonthFile(monthFile, updatedContent);

        this.showAutoSaveIndicator();
      }

      document.querySelector(".date-header").classList.remove("grayed");
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry: " + error.message);
    }
  }

  updateEntryInContent(content, date, customTitle, entryText) {
    const dateStr = this.formatDate(date);
    const lines = content.split("\n");
    const headerPattern = `## ${dateStr}`;

    // Find existing entry
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(headerPattern)) {
        headerIndex = i;
        break;
      }
    }

    const newHeader = customTitle
      ? `## ${dateStr} - ${customTitle}`
      : `## ${dateStr}`;
    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (headerIndex >= 0) {
      // Update existing entry
      let contentStart = headerIndex + 1;
      let contentEnd = lines.length;

      // Find the end of this entry (next header or end of file)
      for (let i = contentStart; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) {
          contentEnd = i;
          break;
        }
      }

      // Simply replace the content with the current text
      lines[headerIndex] = newHeader;
      lines.splice(contentStart, contentEnd - contentStart, entryText);
    } else {
      // Add new entry at the top
      const newEntry = [newHeader, entryText, ""];
      lines.unshift(...newEntry);
    }

    return lines.join("\n");
  }

  appendEntryWithTimestamp(content, date, customTitle, entryText) {
    const dateStr = this.formatDate(date);
    const lines = content.split("\n");
    const headerPattern = `## ${dateStr}`;

    // Find existing entry
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(headerPattern)) {
        headerIndex = i;
        break;
      }
    }

    const newHeader = customTitle
      ? `## ${dateStr} - ${customTitle}`
      : `## ${dateStr}`;
    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (headerIndex >= 0) {
      // Entry exists - append new content with timestamp
      let contentStart = headerIndex + 1;
      let contentEnd = lines.length;

      // Find the end of this entry (next header or end of file)
      for (let i = contentStart; i < lines.length; i++) {
        if (lines[i].startsWith("## ")) {
          contentEnd = i;
          break;
        }
      }

      let existingContent = lines
        .slice(contentStart, contentEnd)
        .join("\n")
        .trim();

      // Append new content with timestamp
      const newContent = existingContent
        ? `${existingContent}\n\n*${currentTime}*\n${entryText}`
        : entryText;

      lines[headerIndex] = newHeader;
      lines.splice(contentStart, contentEnd - contentStart, newContent);
    } else {
      // Add new entry at the top
      const newEntry = [newHeader, entryText, ""];
      lines.unshift(...newEntry);
    }

    return lines.join("\n");
  }

  showAutoSaveIndicator(message = "Saved") {
    let indicator = document.querySelector(".auto-save");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "auto-save";
      document.body.appendChild(indicator);
    }

    indicator.textContent = message;
    indicator.classList.add("show");
    setTimeout(() => {
      indicator.classList.remove("show");
    }, 2000);
  }

  parseContentSections(content) {
    // Split content by timestamp pattern: *HH:MM*
    const timestampPattern = /\n\*(\d{2}:\d{2})\*\n/g;
    const sections = [];
    let lastIndex = 0;
    let match;

    while ((match = timestampPattern.exec(content)) !== null) {
      const sectionText = content.substring(lastIndex, match.index).trim();
      if (sectionText) {
        sections.push({
          timestamp:
            lastIndex === 0 ? null : sections[sections.length - 1].timestamp,
          text: sectionText,
        });
      }
      lastIndex = match.index + match[0].length;
      sections.push({
        timestamp: match[1],
        text: null,
      });
    }

    // Add remaining content (current session text)
    const currentText = content.substring(lastIndex).trim();

    // Merge timestamps with their following text
    const committedSections = [];
    for (let i = 0; i < sections.length; i++) {
      if (
        sections[i].timestamp &&
        i + 1 < sections.length &&
        sections[i + 1].text
      ) {
        committedSections.push({
          timestamp: sections[i].timestamp,
          text: sections[i + 1].text,
        });
        i++; // Skip next item as we've merged it
      } else if (sections[i].text && !sections[i].timestamp) {
        // First section without timestamp
        committedSections.push({
          timestamp: null,
          text: sections[i].text,
        });
      }
    }

    return { committedSections, currentText };
  }

  displayCommittedSections(sections) {
    const container = document.getElementById("committed-content");

    if (sections.length === 0) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    container.classList.remove("hidden");
    container.innerHTML = "";

    sections.forEach((section) => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "committed-section";

      if (section.timestamp) {
        const timestamp = document.createElement("span");
        timestamp.className = "timestamp";
        timestamp.textContent = section.timestamp;
        sectionDiv.appendChild(timestamp);
      }

      const textNode = document.createTextNode(section.text);
      sectionDiv.appendChild(textNode);

      container.appendChild(sectionDiv);
    });
  }

  getMonthFileName(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}.md`;
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  isToday(date) {
    const today = new Date();
    return this.formatDate(date) === this.formatDate(today);
  }

  isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return this.formatDate(date) === this.formatDate(yesterday);
  }
}

// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError);
      });
  });
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new DiaryApp();
});
