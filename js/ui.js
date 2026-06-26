export function initUI() {
    const viewListBtn = document.getElementById("view-list-btn");
    const viewGridBtn = document.getElementById("view-grid-btn");
    const tableContainer = document.getElementById("table-container");
    const gridContainer = document.getElementById("grid-container");

    viewListBtn.addEventListener("click", () => {
        viewListBtn.classList.add("active"); viewGridBtn.classList.remove("active");
        tableContainer.style.display = "block"; gridContainer.style.display = "none";
    });

    viewGridBtn.addEventListener("click", () => {
        viewGridBtn.classList.add("active"); viewListBtn.classList.remove("active");
        tableContainer.style.display = "none"; gridContainer.style.display = "grid";
    });

    function setAppMode(mode) {
        if (mode) document.body.dataset.mode = mode;
        else document.body.removeAttribute("data-mode");
    }

    document.getElementById("open-metadata-mode").addEventListener("click", () => setAppMode("metadata"));
    document.getElementById("open-converter-mode").addEventListener("click", () => setAppMode("converter"));
    document.getElementById("converter-back-btn").addEventListener("click", () => setAppMode(""));
    document.getElementById("metadata-back-btn").addEventListener("click", () => setAppMode(""));

    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const themeIcon = document.getElementById("theme-icon");
    themeToggleBtn.addEventListener("click", () => {
        const root = document.documentElement;
        if (root.getAttribute("data-theme") === "dark") {
            root.removeAttribute("data-theme"); themeIcon.textContent = "dark_mode";
        } else {
            root.setAttribute("data-theme", "dark"); themeIcon.textContent = "light_mode";
        }
    });

    const resizerLeft = document.getElementById("resizer-left"), sidebarLeft = document.querySelector(".sidebar-left");
    const resizerRight = document.getElementById("resizer-right"), sidebarRight = document.querySelector(".sidebar-right");
    let isResizingLeft = false, isResizingRight = false;

    resizerLeft.addEventListener("mousedown", () => { isResizingLeft = true; document.body.style.cursor = "col-resize"; resizerLeft.classList.add("active"); });
    resizerRight.addEventListener("mousedown", () => { isResizingRight = true; document.body.style.cursor = "col-resize"; resizerRight.classList.add("active"); });

    document.addEventListener("mousemove", (e) => {
        if (isResizingLeft) { let w = Math.max(200, Math.min(e.clientX, 600)); sidebarLeft.style.width = `${w}px`; }
        if (isResizingRight) { let w = Math.max(200, Math.min(document.body.clientWidth - e.clientX, 600)); sidebarRight.style.width = `${w}px`; }
    });
    
    document.addEventListener("mouseup", () => {
        isResizingLeft = false; isResizingRight = false;
        document.body.style.cursor = "default";
        resizerLeft.classList.remove("active"); resizerRight.classList.remove("active");
    });
}