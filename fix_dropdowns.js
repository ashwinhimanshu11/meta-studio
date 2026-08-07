const fs = require('fs');
let html = fs.readFileSync('image-editor-window.html', 'utf8');

// 1. Remove the old selects
const oldSelects = /<select id="redact-target"[\s\S]*?<\/select>\s*<select id="redact-mode"[\s\S]*?<\/select>/;

const newDropdowns = `
        <!-- Custom Dropdowns -->
        <input type="hidden" id="redact-target" value="faces" />
        <input type="hidden" id="redact-mode" value="blur" />
        
        <div class="custom-dropdown" id="dd-target">
          <button class="action-btn custom-dropdown-btn" id="btn-dd-target" title="Select Target">
            <span class="material-symbols-rounded" id="target-icon" style="font-size:18px">face</span>
            <span id="target-label">Faces</span>
            <span class="material-symbols-rounded" style="font-size:16px">expand_more</span>
          </button>
          <div class="custom-dropdown-content" id="content-dd-target">
            <div class="custom-dropdown-item" data-value="faces"><span class="material-symbols-rounded" style="font-size:18px">face</span> Faces</div>
            <div class="custom-dropdown-item" data-value="plates"><span class="material-symbols-rounded" style="font-size:18px">directions_car</span> Plates</div>
          </div>
        </div>

        <div class="custom-dropdown" id="dd-mode">
          <button class="action-btn custom-dropdown-btn" id="btn-dd-mode" title="Select Mode">
            <span class="material-symbols-rounded" id="mode-icon" style="font-size:18px">blur_on</span>
            <span id="mode-label">Blur</span>
            <span class="material-symbols-rounded" style="font-size:16px">expand_more</span>
          </button>
          <div class="custom-dropdown-content" id="content-dd-mode">
            <div class="custom-dropdown-item" data-value="blur"><span class="material-symbols-rounded" style="font-size:18px">blur_on</span> Blur</div>
            <div class="custom-dropdown-item" data-value="black"><span class="material-symbols-rounded" style="font-size:18px">check_box_outline_blank</span> Black Box</div>
            <div class="custom-dropdown-item" data-value="white"><span class="material-symbols-rounded" style="font-size:18px">check_box_outline_blank</span> White Box</div>
          </div>
        </div>
`;

html = html.replace(oldSelects, newDropdowns);

// 2. Add CSS
const cssCode = `
      .custom-dropdown {
        position: relative;
        display: inline-block;
      }
      .custom-dropdown-btn {
        background-color: var(--bg-surface) !important;
        justify-content: space-between;
        min-width: 100px;
      }
      .custom-dropdown-content {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        margin-top: 6px;
        background-color: var(--bg-panel);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        z-index: 1000;
        min-width: 130px;
        overflow: hidden;
      }
      .custom-dropdown-content.show {
        display: block;
      }
      .custom-dropdown-item {
        padding: 10px 16px;
        cursor: pointer;
        color: var(--text-main);
        font-size: 13px;
        transition: background 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .custom-dropdown-item:hover {
        background-color: var(--bg-hover);
      }
      .custom-dropdown.disabled {
        opacity: 0.5;
        pointer-events: none;
      }
    </style>`;

html = html.replace('</style>', cssCode);

// 3. Add JS Logic for Dropdowns
const jsCode = `
      // Custom Dropdown Logic
      function setupDropdown(id, inputId, labelId, iconId) {
        const btn = document.getElementById('btn-' + id);
        const content = document.getElementById('content-' + id);
        const input = document.getElementById(inputId);
        const label = document.getElementById(labelId);
        const icon = document.getElementById(iconId);
        
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.custom-dropdown-content').forEach(c => {
            if(c !== content) c.classList.remove('show');
          });
          content.classList.toggle('show');
        });
        
        content.querySelectorAll('.custom-dropdown-item').forEach(item => {
          item.addEventListener('click', (e) => {
            input.value = item.dataset.value;
            label.textContent = item.textContent.trim();
            icon.textContent = item.querySelector('.material-symbols-rounded').textContent;
            content.classList.remove('show');
          });
        });
      }
      
      setupDropdown('dd-target', 'redact-target', 'target-label', 'target-icon');
      setupDropdown('dd-mode', 'redact-mode', 'mode-label', 'mode-icon');
      
      document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-content').forEach(c => c.classList.remove('show'));
      });
      
      function setDropdownsDisabled(disabled) {
        const ddt = document.getElementById('dd-target');
        const ddm = document.getElementById('dd-mode');
        if (disabled) {
          ddt.classList.add('disabled');
          ddm.classList.add('disabled');
        } else {
          ddt.classList.remove('disabled');
          ddm.classList.remove('disabled');
        }
      }
`;

// Inject JS just before </script>
html = html.replace('</script>', jsCode + '\n    </script>');

// Update the disabled logic in the apply/cancel block
html = html.replace(/document.getElementById\("redact-mode"\).disabled = true;/g, "setDropdownsDisabled(true);");
html = html.replace(/document.getElementById\("redact-target"\).disabled = true;/g, "");

html = html.replace(/document.getElementById\("redact-mode"\).disabled = false;/g, "setDropdownsDisabled(false);");
html = html.replace(/document.getElementById\("redact-target"\).disabled = false;/g, "");

fs.writeFileSync('image-editor-window.html', html);
console.log("Custom dropdowns injected.");
