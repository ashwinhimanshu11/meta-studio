const folderInput = document.getElementById('folder-path-input');
const fileTree = document.getElementById('file-tree');
const dragOverlay = document.getElementById('drag-overlay');

// Track all checked files by their full path
const checkedFiles = new Map();

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

let selectedFilePath = null;

function resetInspector() {
    selectedFilePath = null;
    document.getElementById('inspector-empty').style.display = 'block';
    document.getElementById('inspector-content').style.display = 'none';
}

function updateDetailsTable() {
    const tbody = document.getElementById('details-body');
    const countLabel = document.getElementById('file-count');
    tbody.innerHTML = '';
    
    // NEW FIX: If the selected file was unchecked, reset the right sidebar
    if (selectedFilePath && !checkedFiles.has(selectedFilePath)) {
        resetInspector();
    }
    
    checkedFiles.forEach((data) => {
        const row = document.createElement('tr');
        // Restore highlight if this row is the currently selected one
        if (selectedFilePath === data.path) row.classList.add('selected-row');
        
        row.innerHTML = `
            <td title="${data.name}">${data.name}</td>
            <td>${new Date(data.modified).toLocaleString()}</td>
            <td>${data.extension.toUpperCase()} File</td>
            <td>${formatSize(data.size)}</td>
        `;
        
        // Single File Selection Logic
        row.addEventListener('click', () => {
            document.querySelectorAll('#details-body tr').forEach(r => r.classList.remove('selected-row'));
            row.classList.add('selected-row');
            selectedFilePath = data.path;
            loadInspectorData(); // Triggers the right sidebar load
        });

        tbody.appendChild(row);
    });
    
    countLabel.textContent = `${checkedFiles.size} items selected`;
    
    // Safety check: if no files are checked at all, ensure the inspector is closed
    if (checkedFiles.size === 0) resetInspector();
}

async function renderDirectory(path, containerElement, parentIsChecked = false) {
    containerElement.innerHTML = '<div class="tree-item" style="color: #888; padding-left: 25px;">Loading...</div>';
    
    const entries = await window.electronAPI.readDirectory(path);
    if (entries.error) {
        containerElement.innerHTML = `<div class="tree-item" style="color: #f48771; padding-left: 10px;">Error: ${entries.error}</div>`;
        return;
    }
    
    containerElement.innerHTML = '';

    entries.forEach(entry => {
        const node = document.createElement('div');
        node.className = 'tree-node';

        const item = document.createElement('div');
        item.className = `tree-item ${entry.isDirectory ? 'folder' : 'file'}`;
        
        // 1. Create Checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tree-checkbox';
        
        // Cascade check state from parent
        if (parentIsChecked) {
            checkbox.checked = true;
            if (!entry.isDirectory) checkedFiles.set(entry.path, entry);
        }

        // 2. Setup Icons & Name
        const toggle = entry.isDirectory ? '<span class="material-symbols-rounded folder-toggle">chevron_right</span>' : '<span class="folder-toggle empty"></span>';
        let iconName = 'draft';
        if (entry.isDirectory) {
            iconName = 'folder';
        } else {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) iconName = 'image';
            else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) iconName = 'movie';
            else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) iconName = 'audio_file';
            else if (['pdf'].includes(ext)) iconName = 'picture_as_pdf';
            else if (['txt', 'csv', 'json', 'xml'].includes(ext)) iconName = 'description';
        }

        const content = document.createElement('div');
        content.className = 'item-content';
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        content.style.flex = '1';
        content.style.minWidth = '0';
        content.innerHTML = `${toggle}<span class="material-symbols-rounded icon">${iconName}</span><span class="name" title="${entry.name}">${entry.name}</span>`;

        item.appendChild(checkbox);
        item.appendChild(content);
        node.appendChild(item);

        if (entry.isDirectory) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            node.appendChild(childrenContainer);
            let isLoaded = false;

            // FOLDER CHECKBOX LOGIC
            checkbox.addEventListener('change', async () => {
                const isChecked = checkbox.checked;
                
                // Update visually rendered children
                const childCheckboxes = childrenContainer.querySelectorAll('.tree-checkbox');
                childCheckboxes.forEach(cb => cb.checked = isChecked);

                if (isChecked) {
                    document.body.style.cursor = 'wait';
                    // Fetch all nested files securely
                    const allFiles = await window.electronAPI.readDirectoryRecursive(entry.path);
                    if (!allFiles.error) {
                        allFiles.forEach(file => checkedFiles.set(file.path, file));
                    }
                    document.body.style.cursor = 'default';
                } else {
                    // Safe slash detection directly in UI
                    const sep = entry.path.includes('\\') ? '\\' : '/';
                    const prefix = entry.path + sep;
                    for (const filePath of checkedFiles.keys()) {
                        if (filePath.startsWith(prefix)) checkedFiles.delete(filePath);
                    }
                }
                updateDetailsTable();
            });

            content.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (!item.classList.contains('open')) {
                    item.classList.add('open');
                    childrenContainer.classList.add('open');
                    if (!isLoaded) {
                        await renderDirectory(entry.path, childrenContainer, checkbox.checked);
                        isLoaded = true;
                    }
                } else {
                    item.classList.remove('open');
                    childrenContainer.classList.remove('open');
                }
            });
        } else {
            // FILE CHECKBOX LOGIC
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) checkedFiles.set(entry.path, entry);
                else checkedFiles.delete(entry.path);
                updateDetailsTable();
            });

            content.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            });
        }
        containerElement.appendChild(node);
    });
    
    if (parentIsChecked) updateDetailsTable(); 
}

async function loadRootDirectory(path) {
    folderInput.value = path;
    checkedFiles.clear(); 
    updateDetailsTable();
    
    // NEW: Hide the welcome banner and show the table view
    document.getElementById('main-empty-state').style.display = 'none';
    document.getElementById('main-table-view').style.display = 'flex';
    
    await renderDirectory(path, fileTree);
}

// EVENT LISTENERS
folderInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const path = folderInput.value.trim();
        if (path) loadRootDirectory(path);
    }
});

document.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('active');
});

document.addEventListener('dragleave', (e) => {
    e.preventDefault();
    if (e.relatedTarget === null || e.target === dragOverlay) dragOverlay.classList.remove('active');
});

document.addEventListener('drop', (e) => {
    e.preventDefault(); 
    dragOverlay.classList.remove('active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const droppedPath = window.electronAPI.getFilePath(files[0]);
        loadRootDirectory(droppedPath);
    }
});

// RESIZER LOGIC
const resizerLeft = document.getElementById('resizer-left');
const sidebarLeft = document.querySelector('.sidebar-left');
const resizerRight = document.getElementById('resizer-right');
const sidebarRight = document.querySelector('.sidebar-right');

let isResizingLeft = false;
let isResizingRight = false;

resizerLeft.addEventListener('mousedown', () => { isResizingLeft = true; document.body.style.cursor = 'col-resize'; resizerLeft.classList.add('active'); });
resizerRight.addEventListener('mousedown', () => { isResizingRight = true; document.body.style.cursor = 'col-resize'; resizerRight.classList.add('active'); });

document.addEventListener('mousemove', (e) => {
    if (!isResizingLeft && !isResizingRight) return;
    if (isResizingLeft) {
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        sidebarLeft.style.width = `${newWidth}px`;
    }
    if (isResizingRight) {
        let newWidth = document.body.clientWidth - e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        sidebarRight.style.width = `${newWidth}px`;
    }
});

document.addEventListener('mouseup', () => {
    if (isResizingLeft || isResizingRight) {
        isResizingLeft = false;
        isResizingRight = false;
        document.body.style.cursor = 'default';
        resizerLeft.classList.remove('active');
        resizerRight.classList.remove('active');
    }
});

// ==========================================
// RIGHT SIDEBAR INSPECTOR LOGIC
// ==========================================
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const inspectorEmpty = document.getElementById('inspector-empty');
const inspectorContent = document.getElementById('inspector-content');

let isInspectorOpen = true;

// Toggle Button Logic
toggleSidebarBtn.addEventListener('click', () => {
    isInspectorOpen = !isInspectorOpen;
    
    if (isInspectorOpen) {
        sidebarRight.style.display = 'block';
        resizerRight.style.display = 'block';
        toggleSidebarBtn.classList.add('active');
        if (selectedFilePath) loadInspectorData(); // Load data only if we opened it
    } else {
        sidebarRight.style.display = 'none';
        resizerRight.style.display = 'none';
        toggleSidebarBtn.classList.remove('active');
    }
});

// Load the elaborate metadata from backend
async function loadInspectorData() {
    if (!isInspectorOpen || !selectedFilePath) return; // Smart Lazy Loading

    inspectorEmpty.style.display = 'none';
    inspectorContent.style.display = 'none';
    
    document.body.style.cursor = 'wait';
    const details = await window.electronAPI.getFileDetails(selectedFilePath);
    document.body.style.cursor = 'default';

    if (details.error) {
        console.error("Inspector error:", details.error);
        return;
    }

    // Handle Thumbnail vs Generic Icon
    const imgEl = document.getElementById('meta-img');
    const iconEl = document.getElementById('meta-icon');
    
    if (details.thumbnail) {
        imgEl.src = details.thumbnail;
        imgEl.style.display = 'block';
        iconEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        iconEl.style.display = 'block';
        iconEl.textContent = ['jpg','png','jpeg','gif'].includes(details.extension) ? 'image' : 
                             ['mp4','mov'].includes(details.extension) ? 'movie' : 'draft';
    }

    // Populate Text Data
    document.getElementById('meta-name').textContent = details.name;
    document.getElementById('meta-kind').textContent = details.extension.toUpperCase() + ' File';
    document.getElementById('meta-size').textContent = formatSize(details.size);
    document.getElementById('meta-created').textContent = new Date(details.created).toLocaleString();
    document.getElementById('meta-modified').textContent = new Date(details.modified).toLocaleString();
    document.getElementById('meta-path').textContent = details.path;

    inspectorContent.style.display = 'flex';
}