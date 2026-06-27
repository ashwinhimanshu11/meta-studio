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
    .getElementById("converter-back-btn")
    .addEventListener("click", () => setAppMode(""));
  document
    .getElementById("metadata-back-btn")
    .addEventListener("click", () => setAppMode(""));

  // ==========================================
  // SETTINGS & PERSISTENT THEME LOGIC
  // ==========================================
  const root = document.documentElement;
  const themeCheckbox = document.getElementById("theme-switch-checkbox");
  const settingsModal = document.getElementById("settings-modal");

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

  // Open Settings Modal (Listens to all gear icons)
  document.querySelectorAll(".global-settings-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      settingsModal.classList.add("active");
    });
  });

  // Close Settings Modal
  document
    .getElementById("close-settings-btn")
    .addEventListener("click", () => {
      settingsModal.classList.remove("active");
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
