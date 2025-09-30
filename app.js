class FolderBrowser {
  constructor(config) {
    this.config = config;
    this.currentPath = "";
    this.folders = [];
    this.setupEventListeners();
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
          Authorization:
            "Basic " + btoa(`${this.config.username}:${this.config.password}`),
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

    responses.forEach((response) => {
      const href = response.querySelector("href")?.textContent;
      const resourceType = response.querySelector("resourcetype");
      const isCollection = resourceType?.querySelector("collection") !== null;

      if (href && isCollection) {
        const pathParts = decodeURIComponent(href).split("/");
        const folderName =
          pathParts[pathParts.length - 2] || pathParts[pathParts.length - 1];

        // Skip the current directory entry
        if (
          folderName &&
          !href.endsWith(`/${this.config.username}/`) &&
          !href.endsWith(`/${this.currentPath}`)
        ) {
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
        headers: {
          Authorization:
            "Basic " + btoa(`${this.config.username}:${this.config.password}`),
        },
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
    // Setup form
    document.getElementById("setup-form").addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleSetup();
    });

    // Settings button
    document.getElementById("settings-btn").addEventListener("click", () => {
      this.showSetupScreen();
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

  async handleSetup() {
    const url = document.getElementById("nextcloud-url").value;
    const username = document.getElementById("username").value;
    const password = document.getElementById("app-password").value;

    const config = {
      url: url.endsWith("/") ? url.slice(0, -1) : url,
      username,
      password,
    };

    try {
      // Test connection
      await this.testConnection(config);

      // Show folder browser
      this.folderBrowser = new FolderBrowser(config);
      await this.folderBrowser.show();

      // Set up folder selection handler (remove existing listener first)
      const selectBtn = document.getElementById("select-current-btn");
      selectBtn.replaceWith(selectBtn.cloneNode(true));

      document
        .getElementById("select-current-btn")
        .addEventListener("click", async () => {
          const finalConfig = this.folderBrowser.selectCurrentFolder();
          this.saveConfig(finalConfig);
          await this.showMainScreen();
        });
    } catch (error) {
      alert("Connection failed: " + error.message);
    }
  }

  async testConnection(config) {
    const response = await fetch(
      `${config.url}/remote.php/dav/files/${config.username}/`,
      {
        method: "PROPFIND",
        headers: {
          Authorization:
            "Basic " + btoa(`${config.username}:${config.password}`),
          Depth: "0",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Authentication failed");
    }
  }

  showSetupScreen() {
    document.getElementById("setup-screen").classList.remove("hidden");
    document.getElementById("main-screen").classList.add("hidden");
    document.getElementById("folder-browser-screen").classList.add("hidden");

    if (this.config) {
      document.getElementById("nextcloud-url").value = this.config.url;
      document.getElementById("username").value = this.config.username;
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

    try {
      const monthFile = this.getMonthFileName(today);
      const content = await this.loadMonthFile(monthFile);
      const todayEntry = this.parseEntryFromContent(content, today);

      if (todayEntry) {
        document.getElementById("custom-title").value =
          todayEntry.customTitle || "";
        document.getElementById("entry-text").value = todayEntry.content || "";
        document.querySelector(".date-header").classList.remove("grayed");
      } else {
        document.querySelector(".date-header").classList.add("grayed");
        document.getElementById("entry-text").focus();
      }
    } catch (error) {
      // Month file doesn't exist yet
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

  async loadMonthFile(filename) {
    const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${this.config.folder}/${filename}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization:
          "Basic " + btoa(`${this.config.username}:${this.config.password}`),
      },
    });

    if (!response.ok) {
      throw new Error(`File not found: ${filename}`);
    }

    return await response.text();
  }

  async saveMonthFile(filename, content) {
    const url = `${this.config.url}/remote.php/dav/files/${this.config.username}/${this.config.folder}/${filename}`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization:
          "Basic " + btoa(`${this.config.username}:${this.config.password}`),
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

    this.autoSaveTimeout = setTimeout(async () => {
      await this.saveTodaysEntry();
    }, 1000);
  }

  async saveTodaysEntry() {
    const customTitle = document.getElementById("custom-title").value.trim();
    const entryText = document.getElementById("entry-text").value.trim();

    if (!entryText) return; // Don't save empty entries

    const today = new Date();
    const monthFile = this.getMonthFileName(today);

    try {
      let content = "";
      try {
        content = await this.loadMonthFile(monthFile);
      } catch (error) {
        // File doesn't exist, start with empty content
      }

      const updatedContent = this.updateEntryInContent(
        content,
        today,
        customTitle,
        entryText,
      );
      await this.saveMonthFile(monthFile, updatedContent);

      this.showAutoSaveIndicator();
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

      let existingContent = lines
        .slice(contentStart, contentEnd)
        .join("\n")
        .trim();

      // If there's existing content, append with timestamp
      let newContent = entryText;
      if (existingContent && existingContent !== entryText) {
        newContent =
          existingContent + "\n\n*" + currentTime + "*\n" + entryText;
      }

      lines[headerIndex] = newHeader;
      lines.splice(contentStart, contentEnd - contentStart, newContent);
    } else {
      // Add new entry at the top
      const newEntry = [newHeader, entryText, ""];
      lines.unshift(...newEntry);
    }

    return lines.join("\n");
  }

  showAutoSaveIndicator() {
    let indicator = document.querySelector(".auto-save");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.className = "auto-save";
      indicator.textContent = "Saved";
      document.body.appendChild(indicator);
    }

    indicator.classList.add("show");
    setTimeout(() => {
      indicator.classList.remove("show");
    }, 2000);
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
