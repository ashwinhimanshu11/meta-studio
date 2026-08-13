export function initUI() {
  const viewListBtn = document.getElementById("view-list-btn");
  const viewGridBtn = document.getElementById("view-grid-btn");
  const tableContainer = document.getElementById("table-container");
  const gridContainer = document.getElementById("grid-container");

  viewListBtn.addEventListener("click", () => {
    viewListBtn.classList.add("active");
    viewGridBtn.classList.remove("active");
    tableContainer.style.display = "block";
    gridContainer.style.display = "none";
  });

  viewGridBtn.addEventListener("click", () => {
    viewGridBtn.classList.add("active");
    viewListBtn.classList.remove("active");
    tableContainer.style.display = "none";
    gridContainer.style.display = "grid";
  });

  function setAppMode(mode) {
    if (mode) document.body.dataset.mode = mode;
    else document.body.removeAttribute("data-mode");
  }

  document
    .getElementById("open-metadata-mode")
    .addEventListener("click", () => setAppMode("metadata"));
  document
    .getElementById("open-converter-mode")
    .addEventListener("click", () => setAppMode("converter"));
  document
    .getElementById("open-editor-mode")
    .addEventListener("click", () => setAppMode("editor"));
  document
    .getElementById("open-video-editor-mode")
    .addEventListener("click", () => setAppMode("video-editor"));
  document
    .getElementById("converter-back-btn")
    .addEventListener("click", () => setAppMode(""));
  document
    .getElementById("metadata-back-btn")
    .addEventListener("click", () => setAppMode(""));
  document
    .getElementById("editor-back-btn")
    .addEventListener("click", () => setAppMode(""));
  document
    .getElementById("video-back-btn")
    .addEventListener("click", () => setAppMode(""));

  const globalSettingsBtn = document.getElementById("global-settings-btn");
  if (globalSettingsBtn) {
    globalSettingsBtn.addEventListener("click", () => setAppMode("settings"));
  }

  const settingsBackBtn = document.getElementById("settings-back-btn");
  if (settingsBackBtn) {
    settingsBackBtn.addEventListener("click", () => setAppMode(""));
  }

  // Windows First Time Setup Logic
  window.electronAPI.onShowSetupScreen(() => {
    setAppMode("setup");
  });

  const startSetupBtn = document.getElementById("start-setup-btn");
  const setupProgressContainer = document.getElementById("setup-progress-container");
  const setupProgressBar = document.getElementById("setup-progress-bar");
  const setupStatusText = document.getElementById("setup-status-text");
  const setupProgressPercent = document.getElementById("setup-progress-percent");

  if (startSetupBtn) {
    startSetupBtn.addEventListener("click", async () => {
      startSetupBtn.style.display = "none";
      setupProgressContainer.style.display = "block";
      
      const result = await window.electronAPI.startWindowsSetup();
      if (result.success) {
        setupStatusText.innerText = "Setup Complete!";
        setupProgressBar.style.width = "100%";
        setupProgressPercent.innerText = "100%";
        setTimeout(() => {
          setAppMode(""); // Go to main launcher
        }, 1500);
      } else {
        setupStatusText.innerText = "Error: " + result.error;
        setupStatusText.style.color = "#ef4444";
        startSetupBtn.style.display = "flex";
        startSetupBtn.innerText = "Retry Setup";
      }
    });
  }

  window.electronAPI.onSetupProgress(({ task, percent }) => {
    if (setupStatusText) setupStatusText.innerText = task;
    if (setupProgressBar) setupProgressBar.style.width = `${Math.round(percent * 100)}%`;
    if (setupProgressPercent) setupProgressPercent.innerText = `${Math.round(percent * 100)}%`;
  });


  // ==========================================
  // PERSISTENT THEME LOGIC
  // ==========================================
  const root = document.documentElement;
  const themeCheckbox = document.getElementById("theme-switch-checkbox");

  // Sync the checkbox with whatever was instantly loaded by the <head> script
  if (root.getAttribute("data-theme") === "dark") {
    themeCheckbox.checked = true;
  }

  // Handle Theme Checkbox Changes
  themeCheckbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("gts-theme", "dark"); // Save to memory
    } else {
      root.removeAttribute("data-theme");
      localStorage.setItem("gts-theme", "light"); // Save to memory
    }
  });

  // ==========================================
  // UNIVERSAL RESIZER LOGIC
  // ==========================================
  let isResizingLeft = false,
    isResizingRight = false;
  let activeLeftSidebar = null,
    activeRightSidebar = null;

  document.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resizer")) {
      // Check if this resizer is attached to a left or right sidebar
      const isLeft =
        e.target.previousElementSibling?.classList.contains("sidebar-left");

      if (isLeft) {
        isResizingLeft = true;
        activeLeftSidebar = e.target.previousElementSibling;
      } else {
        isResizingRight = true;
        activeRightSidebar = e.target.nextElementSibling;
      }

      document.body.style.cursor = "col-resize";
      e.target.classList.add("active");
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (isResizingLeft && activeLeftSidebar) {
      let w = Math.max(200, Math.min(e.clientX, 600));
      activeLeftSidebar.style.width = `${w}px`;
    }
    if (isResizingRight && activeRightSidebar) {
      let w = Math.max(
        200,
        Math.min(document.body.clientWidth - e.clientX, 600),
      );
      activeRightSidebar.style.width = `${w}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isResizingLeft = false;
    isResizingRight = false;
    activeLeftSidebar = null;
    activeRightSidebar = null;
    document.body.style.cursor = "default";
    document
      .querySelectorAll(".resizer.active")
      .forEach((r) => r.classList.remove("active"));
  });
}
