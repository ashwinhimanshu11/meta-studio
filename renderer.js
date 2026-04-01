const folderInput = document.getElementById('folder-path-input');
const fileTree = document.getElementById('file-tree');
const dragOverlay = document.getElementById('drag-overlay');

// Helper to create the DOM for a directory level
async function renderDirectory(path, containerElement) {
    containerElement.innerHTML = '<div class="tree-item" style="color: #888; padding-left: 25px;">Loading...</div>';

    const entries = await window.electronAPI.readDirectory(path);
    
    if (entries.error) {
        containerElement.innerHTML = `<div class="tree-item" style="color: #f48771; padding-left: 10px;">Error: ${entries.error}</div>`;
        return;
    }

    containerElement.innerHTML = ''; // Clear loading text

    entries.forEach(entry => {
        // 1. Create the wrapper for this item and its potential children
        const node = document.createElement('div');
        node.className = 'tree-node';

        // 2. Create the clickable item row
        const item = document.createElement('div');
        item.className = `tree-item ${entry.isDirectory ? 'folder' : 'file'}`;
        item.title = entry.path;

        // 3. Set up the dynamic Material Icons
        const toggle = entry.isDirectory ? '<span class="material-symbols-rounded folder-toggle">chevron_right</span>' : '<span class="folder-toggle empty"></span>';
        
        let iconName = 'draft'; // The default generic file icon
        
        if (entry.isDirectory) {
            iconName = 'folder';
        } else {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
                iconName = 'image';
            } else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) {
                iconName = 'movie';
            } else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
                iconName = 'audio_file';
            } else if (['pdf'].includes(ext)) {
                iconName = 'picture_as_pdf';
            } else if (['txt', 'csv', 'json', 'xml'].includes(ext)) {
                iconName = 'description';
            }
        }

        item.innerHTML = `${toggle}<span class="material-symbols-rounded icon">${iconName}</span><span class="name">${entry.name}</span>`;

        node.appendChild(item);

        // 4. Handle logic if it's a folder
        if (entry.isDirectory) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            node.appendChild(childrenContainer);

            let isLoaded = false;

            item.addEventListener('click', async (e) => {
                e.stopPropagation(); 
                
                const isOpen = item.classList.contains('open');
                
                if (!isOpen) {
                    item.classList.add('open');
                    childrenContainer.classList.add('open');
                    
                    if (!isLoaded) {
                        await renderDirectory(entry.path, childrenContainer);
                        isLoaded = true;
                    }
                } else {
                    item.classList.remove('open');
                    childrenContainer.classList.remove('open');
                }
            });
        } 
        // 5. Handle logic if it's a file
        else {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                
                document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                
                console.log(`Selected file: ${entry.path}`);
            });
        }

        containerElement.appendChild(node);
    });
}

// The main entry point when a new root folder is dropped/entered
async function loadRootDirectory(path) {
    folderInput.value = path;
    await renderDirectory(path, fileTree);
}

// ==========================================
// EVENT LISTENERS
// ==========================================

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
    if (e.relatedTarget === null || e.target === dragOverlay) {
        dragOverlay.classList.remove('active');
    }
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

// ==========================================
// RESIZER LOGIC
// ==========================================
const resizerLeft = document.getElementById('resizer-left');
const sidebarLeft = document.querySelector('.sidebar-left');
const resizerRight = document.getElementById('resizer-right');
const sidebarRight = document.querySelector('.sidebar-right');

let isResizingLeft = false;
let isResizingRight = false;

// Left Resizer
resizerLeft.addEventListener('mousedown', () => {
    isResizingLeft = true;
    document.body.style.cursor = 'col-resize';
    resizerLeft.classList.add('active');
});

// Right Resizer
resizerRight.addEventListener('mousedown', () => {
    isResizingRight = true;
    document.body.style.cursor = 'col-resize';
    resizerRight.classList.add('active');
});

// Mouse Move (Handles the actual resizing)
document.addEventListener('mousemove', (e) => {
    if (!isResizingLeft && !isResizingRight) return;

    if (isResizingLeft) {
        // e.clientX is the mouse position.
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200; // Minimum width
        if (newWidth > 600) newWidth = 600; // Maximum width
        sidebarLeft.style.width = `${newWidth}px`;
    }

    if (isResizingRight) {
        // Window width - mouse position = right sidebar width
        let newWidth = document.body.clientWidth - e.clientX;
        if (newWidth < 200) newWidth = 200; // Minimum width
        if (newWidth > 600) newWidth = 600; // Maximum width
        sidebarRight.style.width = `${newWidth}px`;
    }
});

// Mouse Up (Stops the resizing)
document.addEventListener('mouseup', () => {
    if (isResizingLeft || isResizingRight) {
        isResizingLeft = false;
        isResizingRight = false;
        document.body.style.cursor = 'default';
        resizerLeft.classList.remove('active');
        resizerRight.classList.remove('active');
    }
});