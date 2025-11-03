class FolderBrowser {
  constructor(config) {
    this.config = config;
    this.currentPath = "";
    this.folders = [];
    this.setupEventListeners();
  }

  getAuthHeaders() {
    if (this.config.authType === "oauth2" && this.config.accessToken) {
      return {
        Authorization: `Bearer ${this.config.accessToken}`,
      };
    } else {
      return {
        Authorization:
          "Basic " + btoa(`${this.config.username}:${this.config.password}`),
      };
    }
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
      this.showSetupScreen();
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
    // Auth method selection
    document
      .getElementById("select-app-password")
      .addEventListener("click", () => {
        this.selectAuthMethod("app-password");
      });

    document.getElementById("select-oauth2").addEventListener("click", () => {
      this.selectAuthMethod("oauth2");
    });

    // Auth forms
    document
      .getElementById("app-password-form")
      .addEventListener("submit", (e) => {
        e.preventDefault();
        this.handleAppPasswordAuth();
      });

    document.getElementById("oauth2-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleOAuth2Auth();
    });

    document.getElementById("use-token-btn").addEventListener("click", () => {
      this.handleTokenAuth();
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

  selectAuthMethod(method) {
    // Update button states
    document
      .getElementById("select-app-password")
      .classList.toggle("active", method === "app-password");
    document
      .getElementById("select-oauth2")
      .classList.toggle("active", method === "oauth2");

    // Show/hide forms
    document
      .getElementById("app-password-form")
      .classList.toggle("hidden", method !== "app-password");
    document
      .getElementById("oauth2-form")
      .classList.toggle("hidden", method !== "oauth2");
    document.getElementById("oauth2-token-form").classList.add("hidden");
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
          this.saveConfig(finalConfig);
          await this.showMainScreen();
        });
    } catch (error) {
      alert("Connection failed: " + error.message);
    }
  }

  async handleOAuth2Auth() {
    const url = document.getElementById("oauth-nextcloud-url").value;
    const clientId = document.getElementById("client-id").value;
    const clientSecret = document.getElementById("client-secret").value;

    const config = {
      url: url.endsWith("/") ? url.slice(0, -1) : url,
      clientId,
      clientSecret,
      authType: "oauth2",
    };

    try {
      // Generate OAuth2 authorization URL
      const authUrl = this.generateOAuth2Url(config);

      // Open OAuth2 authorization in new window
      const authWindow = window.open(authUrl, "oauth2", "width=600,height=700");

      // Show token input form
      document.getElementById("oauth2-form").classList.add("hidden");
      document.getElementById("oauth2-token-form").classList.remove("hidden");

      // Store config for later use
      this.pendingOAuth2Config = config;

      alert(
        "Please authorize the application in the opened window, then copy and paste the access token below.",
      );
    } catch (error) {
      alert("OAuth2 setup failed: " + error.message);
    }
  }

  generateOAuth2Url(config) {
    const redirectUri = window.location.origin + window.location.pathname;
    const state = Math.random().toString(36).substring(7);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.clientId,
      redirect_uri: redirectUri,
      state: state,
      scope: "read write",
    });

    // Store state for validation
    sessionStorage.setItem("oauth2_state", state);

    return `${config.url}/apps/oauth2/authorize?${params.toString()}`;
  }

  async handleTokenAuth() {
    const token = document.getElementById("access-token").value.trim();

    if (!token) {
      alert("Please enter an access token");
      return;
    }

    const config = {
      ...this.pendingOAuth2Config,
      accessToken: token,
      authType: "oauth2",
    };

    try {
      // Test connection with token
      await this.testConnectionWithToken(config);

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
          finalConfig.authType = "oauth2";
          finalConfig.accessToken = token;
          this.saveConfig(finalConfig);
          await this.showMainScreen();
        });
    } catch (error) {
      alert("Token authentication failed: " + error.message);
    }
  }

  async testConnection(config) {
    const headers = this.getAuthHeaders(config);
    let testUrl;

    if (config.authType === "oauth2") {
      // For OAuth2, test with a simpler endpoint first
      testUrl = `${config.url}/ocs/v2.php/cloud/user`;
    } else {
      testUrl = `${config.url}/remote.php/dav/files/${config.username}/`;
    }

    const response = await fetch(testUrl, {
      method: config.authType === "oauth2" ? "GET" : "PROPFIND",
      headers: {
        ...headers,
        ...(config.authType !== "oauth2" && { Depth: "0" }),
      },
    });

    if (!response.ok) {
      throw new Error("Authentication failed");
    }
  }

  async testConnectionWithToken(config) {
    const response = await fetch(`${config.url}/ocs/v2.php/cloud/user`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "OCS-APIRequest": "true",
      },
    });

    if (!response.ok) {
      throw new Error("Token authentication failed");
    }
  }

  getAuthHeaders(config) {
    if (config.authType === "oauth2" && config.accessToken) {
      return {
        Authorization: `Bearer ${config.accessToken}`,
      };
    } else {
      return {
        Authorization: "Basic " + btoa(`${config.username}:${config.password}`),
      };
    }
  }

  showSetupScreen() {
    document.getElementById("setup-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("folder-browser-screen").classList.add("hidden");

    if (this.config) {
      // Show back button when already connected
      document.getElementById("back-to-diary-btn").classList.remove("hidden");

      document.getElementById("nextcloud-url").value = this.config.url;
      document.getElementById("username").value = this.config.username;

      // For security, don't populate password but indicate it's saved
      if (this.config.password || this.config.accessToken) {
        const passwordField = document.getElementById("app-password");
        passwordField.value = "";
        passwordField.placeholder =
          "Password saved (leave empty to keep current)";
        passwordField.required = false; // Make it optional when editing existing config
      }

      // Select the appropriate auth method
      if (this.config.authType === "oauth2") {
        this.selectAuthMethod("oauth2");
      } else {
        this.selectAuthMethod("app-password");
      }
    } else {
      // Hide back button for initial setup
      document.getElementById("back-to-diary-btn").classList.add("hidden");

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
