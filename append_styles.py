import os

css_to_append = """
/* Editor sidebar styles injected during refactor */
.action-btn {
  padding: 8px 16px;
  font-family: "Poppins", sans-serif;
  font-size: 13px;
  font-weight: 300;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-base);
  color: var(--text-main);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  white-space: nowrap;
  width: 100%;
  justify-content: center;
}
.action-btn:hover {
  background: var(--bg-hover);
}
.action-btn.primary {
  background: var(--gts-gradient);
  color: #fff;
  border: none;
}
.action-btn.primary:hover {
  opacity: 0.9;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(100%);
}
#editor-back-normal-btn, #video-back-normal-btn {
  justify-content: flex-start;
  width: auto;
  border: none;
  background: transparent;
  padding: 0;
}
#editor-back-normal-btn:hover, #video-back-normal-btn:hover {
  background: transparent;
  color: var(--gts-blue);
}
/* Trim inputs styling */
.trim-inputs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; width: 100%; }
.trim-inputs input { flex: 1; min-width: 50px; padding: 4px 8px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-base); color: var(--text-main); font-size: 12px; box-sizing: border-box; }

/* Save Dropdown from original files */
.custom-dropdown { position: relative; display: inline-block; width: 100%; }
.custom-dropdown-content {
  display: none; position: absolute; top: 100%; right: 0;
  background: var(--bg-panel); min-width: 160px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2); border-radius: 6px;
  z-index: 100; border: 1px solid var(--border-color);
  padding: 4px 0; width: 100%;
}
.custom-dropdown.show .custom-dropdown-content { display: block; }
.custom-dropdown-item, .dropdown-item {
  padding: 8px 16px; cursor: pointer; color: var(--text-main); font-size: 13px; display: flex; align-items: center; gap: 8px;
  background: none; border: none; width: 100%; text-align: left; box-sizing: border-box; font-family: "Poppins", sans-serif;
}
.custom-dropdown-item:hover, .dropdown-item:hover { background: var(--bg-hover); }

/* Dropdown Menu wrapper */
.dropdown-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}
.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: var(--bg-panel);
  display: none;
  width: 100%;
  z-index: 1000;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.dropdown-wrapper.show .dropdown-menu {
  display: block;
}
"""

with open('styles.css', 'a') as f:
    f.write(css_to_append)

print("Styles appended successfully.")
