const folderInput = document.getElementById('folder-path-input');
const fileTree = document.getElementById('file-tree');
const dragOverlay = document.getElementById('drag-overlay');

const checkedFiles = new Map();
const exifDataCache = new Map();

// GLOBALS FOR TABLE SELECTION & PREVIEW
let selectedTableFiles = new Set(); 
let previewFilePath = null;
let lastClickedNode = null; 
let isBatchUpdating = false; 

// View Toggles
let currentViewMode = 'list';
const viewListBtn = document.getElementById('view-list-btn');
const viewGridBtn = document.getElementById('view-grid-btn');
const tableContainer = document.getElementById('table-container');
const gridContainer = document.getElementById('grid-container');

viewListBtn.addEventListener('click', () => {
    currentViewMode = 'list';
    viewListBtn.classList.add('active'); viewGridBtn.classList.remove('active');
    tableContainer.style.display = 'block'; gridContainer.style.display = 'none';
});
viewGridBtn.addEventListener('click', () => {
    currentViewMode = 'grid';
    viewGridBtn.classList.add('active'); viewListBtn.classList.remove('active');
    tableContainer.style.display = 'none'; gridContainer.style.display = 'grid';
});

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function resetInspector() {
    selectedTableFiles.clear();
    previewFilePath = null;
    document.getElementById('inspector-empty').style.display = 'block';
    document.getElementById('inspector-content').style.display = 'none';
    document.getElementById('inspector-multi').style.display = 'none';
}

function syncSelectionUI() {
    document.querySelectorAll('#details-body tr').forEach(r => {
        const p = r.getAttribute('data-path');
        const cb = r.querySelector('.table-checkbox');
        if (selectedTableFiles.has(p)) { r.classList.add('selected-row'); cb.checked = true; } 
        else if (previewFilePath === p && selectedTableFiles.size === 0) { r.classList.add('selected-row'); cb.checked = false; } 
        else { r.classList.remove('selected-row'); cb.checked = false; }
    });

    document.querySelectorAll('.grid-item').forEach(item => {
        const p = item.getAttribute('data-path');
        const cb = item.querySelector('.grid-checkbox');
        if (selectedTableFiles.has(p)) { item.classList.add('selected-item'); cb.checked = true; } 
        else if (previewFilePath === p && selectedTableFiles.size === 0) { item.classList.add('selected-item'); cb.checked = false; } 
        else { item.classList.remove('selected-item'); cb.checked = false; }
    });

    const isAllSelected = checkedFiles.size > 0 && selectedTableFiles.size === checkedFiles.size;
    
    const tableMasterCb = document.getElementById('master-table-checkbox');
    if (tableMasterCb) tableMasterCb.checked = isAllSelected;

    const globalMasterCb = document.getElementById('global-master-checkbox');
    if (globalMasterCb) globalMasterCb.checked = isAllSelected;

    const fetchExifBtn = document.getElementById('fetch-exif-btn');
    if (fetchExifBtn) {
        fetchExifBtn.style.display = selectedTableFiles.size > 0 ? 'flex' : 'none';
    }
}

function updateDetailsTable() {
    const tbody = document.getElementById('details-body');
    const gridBody = document.getElementById('grid-container');
    const countLabel = document.getElementById('file-count');
    
    let hc = document.getElementById('hover-card');
    if (!hc) {
        hc = document.createElement('div');
        hc.id = 'hover-card';
        hc.className = 'hover-card';
        hc.style.display = 'none';
        document.body.appendChild(hc);
    }

    tbody.innerHTML = '';
    gridBody.innerHTML = '';
    
    let selectionChanged = false;
    for (const path of selectedTableFiles) {
        if (!checkedFiles.has(path)) { selectedTableFiles.delete(path); selectionChanged = true; }
    }
    if (previewFilePath && !checkedFiles.has(previewFilePath)) {
        previewFilePath = null; selectionChanged = true;
    }
    if (selectionChanged) loadInspectorData();
    
    const displayFiles = Array.from(checkedFiles.values());
    
    displayFiles.forEach((data) => {
        const ext = data.extension.toUpperCase();
        let iconName = 'draft';
        if (['JPG', 'JPEG', 'PNG', 'GIF', 'SVG', 'WEBP'].includes(ext)) iconName = 'image';
        else if (['MP4', 'MKV', 'AVI', 'MOV'].includes(ext)) iconName = 'movie';
        else if (['MP3', 'WAV', 'OGG', 'FLAC'].includes(ext)) iconName = 'audio_file';
        else if (['PDF'].includes(ext)) iconName = 'picture_as_pdf';
        else if (['TXT', 'CSV', 'JSON', 'XML'].includes(ext)) iconName = 'description';

        const row = document.createElement('tr');
        row.setAttribute('data-path', data.path); 
        row.innerHTML = `
            <td style="text-align: center;"><input type="checkbox" class="table-checkbox"></td>
            <td title="${data.name}"><span style="overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%;">${data.name}</span></td>
            <td>${new Date(data.modified).toLocaleString()}</td>
            <td>${ext} File</td>
            <td>${formatSize(data.size)}</td>
        `;

        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';
        gridItem.setAttribute('data-path', data.path);
        gridItem.innerHTML = `
            <input type="checkbox" class="grid-checkbox">
            <span class="material-symbols-rounded grid-icon">${iconName}</span>
            <span class="grid-name" title="${data.name}">${data.name}</span>
        `;

        gridItem.addEventListener('mouseenter', () => {
            hc.innerHTML = `
                <div class="hover-card-title">${data.name}</div>
                <div class="hover-card-row"><span>Type:</span><span>${ext} File</span></div>
                <div class="hover-card-row"><span>Size:</span><span>${formatSize(data.size)}</span></div>
                <div class="hover-card-row"><span>Modified:</span><span>${new Date(data.modified).toLocaleString()}</span></div>
                ${exifDataCache.has(data.path) ? '<div class="hover-card-row" style="margin-top: 6px; justify-content: center;"><span style="color:var(--gts-purple); font-weight: 600;">★ EXIF Extracted</span></div>' : ''}
            `;
            hc.style.display = 'flex';
            setTimeout(() => hc.style.opacity = '1', 10);
        });
        gridItem.addEventListener('mousemove', (e) => {
            hc.style.left = (e.clientX + 15) + 'px'; 
            hc.style.top = (e.clientY + 15) + 'px';
        });
        gridItem.addEventListener('mouseleave', () => {
            hc.style.opacity = '0';
            setTimeout(() => hc.style.display = 'none', 150);
        });

        const handleInteraction = (e) => {
            if (e.button !== 0) return; 
            const isCheckboxClick = e.target.classList.contains('table-checkbox') || e.target.classList.contains('grid-checkbox');
            if (isCheckboxClick) e.preventDefault();

            let shouldToggleCheck = false;
            if (isCheckboxClick || e.metaKey || e.ctrlKey || selectedTableFiles.size > 0) shouldToggleCheck = true;

            if (shouldToggleCheck) {
                if (selectedTableFiles.has(data.path)) {
                    selectedTableFiles.delete(data.path);
                    if (selectedTableFiles.size === 0) previewFilePath = data.path;
                } else {
                    selectedTableFiles.add(data.path);
                    previewFilePath = null;
                }
            } else {
                previewFilePath = data.path;
            }
            
            syncSelectionUI();
            loadInspectorData(); 
        };

        row.addEventListener('mousedown', handleInteraction);
        gridItem.addEventListener('mousedown', handleInteraction);

        tbody.appendChild(row);
        gridBody.appendChild(gridItem);
    });
    
    syncSelectionUI(); 
    countLabel.textContent = `${checkedFiles.size} items listed`;
    
    const unselectAllBtn = document.getElementById('unselect-all-btn');
    const globalSelectContainer = document.getElementById('global-select-all-container');
    
    if (checkedFiles.size > 0) {
        unselectAllBtn.style.display = 'flex';
        globalSelectContainer.style.display = 'flex';
    } else {
        unselectAllBtn.style.display = 'none';
        globalSelectContainer.style.display = 'none';
    }
    
    if (checkedFiles.size === 0) resetInspector();
}

async function renderDirectory(path, containerElement, parentIsChecked = false) {
    containerElement.innerHTML = '<div class="tree-item" style="color: #888; padding-left: 25px;">Loading...</div>';
    const entries = await window.electronAPI.readDirectory(path);
    if (entries.error) { containerElement.innerHTML = `<div class="tree-item" style="color: #f48771; padding-left: 10px;">Error: ${entries.error}</div>`; return; }
    containerElement.innerHTML = '';

    entries.forEach(entry => {
        const node = document.createElement('div');
        node.className = 'tree-node';
        const item = document.createElement('div');
        item.className = `tree-item ${entry.isDirectory ? 'folder' : 'file'}`;
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tree-checkbox';
        
        if (parentIsChecked) {
            checkbox.checked = true;
            if (!entry.isDirectory) checkedFiles.set(entry.path, entry);
        }

        const toggle = entry.isDirectory ? '<span class="material-symbols-rounded folder-toggle">chevron_right</span>' : '<span class="folder-toggle empty"></span>';
        let iconName = 'draft';
        if (entry.isDirectory) iconName = 'folder';
        else {
            const ext = entry.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) iconName = 'image';
            else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) iconName = 'movie';
            else if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) iconName = 'audio_file';
            else if (['pdf'].includes(ext)) iconName = 'picture_as_pdf';
            else if (['txt', 'csv', 'json', 'xml'].includes(ext)) iconName = 'description';
        }

        const content = document.createElement('div');
        content.className = 'item-content';
        content.style.display = 'flex'; content.style.alignItems = 'center'; content.style.flex = '1'; content.style.minWidth = '0';
        content.innerHTML = `${toggle}<span class="material-symbols-rounded icon">${iconName}</span><span class="name" title="${entry.name}">${entry.name}</span>`;

        item.appendChild(checkbox); item.appendChild(content); node.appendChild(item);

        if (entry.isDirectory) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'children-container';
            node.appendChild(childrenContainer);
            let isLoaded = false;

            checkbox.addEventListener('change', async () => {
                const isChecked = checkbox.checked;
                childrenContainer.querySelectorAll('.tree-checkbox').forEach(cb => cb.checked = isChecked);

                if (isChecked) {
                    document.body.style.cursor = 'wait';
                    const allFiles = await window.electronAPI.readDirectoryRecursive(entry.path);
                    if (!allFiles.error) allFiles.forEach(file => checkedFiles.set(file.path, file));
                    document.body.style.cursor = 'default';
                } else {
                    const sep = entry.path.includes('\\') ? '\\' : '/';
                    const prefix = entry.path + sep;
                    for (const filePath of checkedFiles.keys()) {
                        if (filePath.startsWith(prefix)) checkedFiles.delete(filePath);
                    }
                }
                updateDetailsTable();
            });

            content.addEventListener('mousedown', async (e) => {
                if (e.button !== 0) return; 
                e.stopPropagation();
                lastClickedNode = item; 

                if (!item.classList.contains('open')) {
                    item.classList.add('open'); childrenContainer.classList.add('open');
                    if (!isLoaded) { await renderDirectory(entry.path, childrenContainer, checkbox.checked); isLoaded = true; }
                } else {
                    item.classList.remove('open'); childrenContainer.classList.remove('open');
                }
            });
        } else {
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) checkedFiles.set(entry.path, entry);
                else checkedFiles.delete(entry.path);
                if (!isBatchUpdating) updateDetailsTable();
            });

            content.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return; 
                e.stopPropagation();
                const isChecking = !checkbox.checked;

                if (e.shiftKey && lastClickedNode) {
                    const visibleNodes = Array.from(document.querySelectorAll('.tree-item'));
                    const currentIndex = visibleNodes.indexOf(item);
                    const lastIndex = visibleNodes.indexOf(lastClickedNode);

                    if (currentIndex !== -1 && lastIndex !== -1) {
                        const start = Math.min(currentIndex, lastIndex);
                        const end = Math.max(currentIndex, lastIndex);
                        isBatchUpdating = true; 
                        for (let i = start; i <= end; i++) {
                            const targetItem = visibleNodes[i];
                            if (targetItem.classList.contains('file')) {
                                const targetCb = targetItem.querySelector('.tree-checkbox');
                                if (targetCb && targetCb.checked !== isChecking) {
                                    targetCb.checked = isChecking; targetCb.dispatchEvent(new Event('change'));
                                }
                            }
                        }
                        isBatchUpdating = false; updateDetailsTable();    
                    }
                } else {
                    checkbox.checked = isChecking; checkbox.dispatchEvent(new Event('change'));
                }

                lastClickedNode = item; 
                document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
            });
        }
        containerElement.appendChild(node);
    });
    
    if (parentIsChecked && !isBatchUpdating) updateDetailsTable(); 
}

async function loadRootDirectory(path) {
    folderInput.value = path;
    checkedFiles.clear(); 
    selectedTableFiles.clear();
    previewFilePath = null;
    lastClickedNode = null; 
    updateDetailsTable();
    
    document.getElementById('main-empty-state').style.display = 'none';
    document.getElementById('main-table-view').style.display = 'flex';
    
    await renderDirectory(path, fileTree);
}

// EVENT LISTENERS & UI CONTROLS
folderInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const path = folderInput.value.trim(); if (path) loadRootDirectory(path); } });
document.addEventListener('dragover', (e) => { e.preventDefault(); dragOverlay.classList.add('active'); });
document.addEventListener('dragleave', (e) => { e.preventDefault(); if (e.relatedTarget === null || e.target === dragOverlay) dragOverlay.classList.remove('active'); });
document.addEventListener('drop', (e) => { e.preventDefault(); dragOverlay.classList.remove('active'); const files = e.dataTransfer.files; if (files.length > 0) loadRootDirectory(window.electronAPI.getFilePath(files[0])); });

document.getElementById('unselect-all-btn').addEventListener('click', () => {
    checkedFiles.clear();
    selectedTableFiles.clear();
    previewFilePath = null;
    document.querySelectorAll('.tree-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.tree-item.selected').forEach(el => el.classList.remove('selected'));
    updateDetailsTable();
});

// UNIFIED MASTER CHECKBOX LOGIC
const handleMasterCheckbox = (e) => {
    if (e.target.checked) {
        checkedFiles.forEach((data, path) => selectedTableFiles.add(path));
        previewFilePath = null;
    } else {
        selectedTableFiles.clear();
    }
    syncSelectionUI();
    loadInspectorData(); 
};

document.getElementById('master-table-checkbox').addEventListener('change', handleMasterCheckbox);
document.getElementById('global-master-checkbox').addEventListener('change', handleMasterCheckbox);


// BATCH EXIF FETCH LOGIC
document.getElementById('fetch-exif-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    
    btn.style.pointerEvents = 'none';
    btn.innerHTML = `<span class="material-symbols-rounded spinning" style="font-size: 14px; margin-right: 4px;">hourglass_empty</span> Fetching...`;
    document.body.style.cursor = 'wait';
    
    const promises = Array.from(selectedTableFiles).map(async (path) => {
        if (!exifDataCache.has(path)) {
            const result = await window.electronAPI.getExifData(path);
            if (!result.error) {
                exifDataCache.set(path, result);
            }
        }
    });
    
    await Promise.all(promises);
    
    document.body.style.cursor = 'default';
    btn.innerHTML = `<span class="material-symbols-rounded" style="font-size: 14px; margin-right: 4px;">manage_search</span> Fetch EXIF`;
    btn.style.pointerEvents = 'auto';
    
    loadInspectorData();
});

// RESIZER LOGIC
const resizerLeft = document.getElementById('resizer-left'), sidebarLeft = document.querySelector('.sidebar-left');
const resizerRight = document.getElementById('resizer-right'), sidebarRight = document.querySelector('.sidebar-right');
let isResizingLeft = false, isResizingRight = false;

resizerLeft.addEventListener('mousedown', () => { isResizingLeft = true; document.body.style.cursor = 'col-resize'; resizerLeft.classList.add('active'); });
resizerRight.addEventListener('mousedown', () => { isResizingRight = true; document.body.style.cursor = 'col-resize'; resizerRight.classList.add('active'); });

document.addEventListener('mousemove', (e) => {
    if (!isResizingLeft && !isResizingRight) return;
    if (isResizingLeft) { let newWidth = e.clientX; if (newWidth < 200) newWidth = 200; if (newWidth > 600) newWidth = 600; sidebarLeft.style.width = `${newWidth}px`; }
    if (isResizingRight) { let newWidth = document.body.clientWidth - e.clientX; if (newWidth < 200) newWidth = 200; if (newWidth > 600) newWidth = 600; sidebarRight.style.width = `${newWidth}px`; }
});
document.addEventListener('mouseup', () => {
    if (isResizingLeft || isResizingRight) { isResizingLeft = false; isResizingRight = false; document.body.style.cursor = 'default'; resizerLeft.classList.remove('active'); resizerRight.classList.remove('active'); }
});

// RIGHT SIDEBAR INSPECTOR LOGIC
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const inspectorEmpty = document.getElementById('inspector-empty');
const inspectorContent = document.getElementById('inspector-content');
const inspectorMulti = document.getElementById('inspector-multi');

let isInspectorOpen = true;

toggleSidebarBtn.addEventListener('click', () => {
    isInspectorOpen = !isInspectorOpen;
    if (isInspectorOpen) {
        sidebarRight.style.display = 'block'; resizerRight.style.display = 'block'; toggleSidebarBtn.classList.add('active');
        loadInspectorData(); 
    } else {
        sidebarRight.style.display = 'none'; resizerRight.style.display = 'none'; toggleSidebarBtn.classList.remove('active');
    }
});

async function loadInspectorData() {
    if (!isInspectorOpen) return; 

    inspectorEmpty.style.display = 'none';
    inspectorContent.style.display = 'none';
    inspectorMulti.style.display = 'none';
    
    // STATE 1: Multi Selection Summary
    if (selectedTableFiles.size > 1) {
        let totalSize = 0;
        const typeCounts = {};

        selectedTableFiles.forEach(path => {
            const data = checkedFiles.get(path);
            if (data) {
                totalSize += data.size;
                const kind = data.extension.toUpperCase() + ' File';
                typeCounts[kind] = (typeCounts[kind] || 0) + 1;
            }
        });

        document.getElementById('multi-count').textContent = `${selectedTableFiles.size} Files Selected`;
        document.getElementById('multi-size').textContent = `Total Size: ${formatSize(totalSize)}`;

        const typesHtml = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1]) 
            .map(([type, count]) => `
                <div style="display: flex; justify-content: space-between; font-size: 13px; padding: 5px 0; border-bottom: 1px solid rgba(0,0,0,0.05); color: var(--text-main);">
                    <span>${type}</span>
                    <span style="font-weight: 600; color: var(--gts-blue);">${count}</span>
                </div>
            `).join('');

        document.getElementById('multi-types').innerHTML = typesHtml;
        inspectorMulti.style.display = 'flex';
    }
    // STATE 2: Single Selection OR Active Preview
    else if (selectedTableFiles.size === 1 || (selectedTableFiles.size === 0 && previewFilePath)) {
        document.body.style.cursor = 'wait';
        
        const targetPath = selectedTableFiles.size === 1 ? Array.from(selectedTableFiles)[0] : previewFilePath;
        const details = await window.electronAPI.getFileDetails(targetPath);
        document.body.style.cursor = 'default';

        if (details.error) return;

        const imgEl = document.getElementById('meta-img');
        const iconEl = document.getElementById('meta-icon');
        
        if (details.thumbnail) { imgEl.src = details.thumbnail; imgEl.style.display = 'block'; iconEl.style.display = 'none'; } 
        else { imgEl.style.display = 'none'; iconEl.style.display = 'block'; iconEl.textContent = ['jpg','png','jpeg','gif'].includes(details.extension) ? 'image' : ['mp4','mov'].includes(details.extension) ? 'movie' : 'draft'; }

        document.getElementById('meta-name').textContent = details.name;
        document.getElementById('meta-kind').textContent = details.extension.toUpperCase() + ' File';
        document.getElementById('meta-size').textContent = formatSize(details.size);
        document.getElementById('meta-created').textContent = new Date(details.created).toLocaleString();
        document.getElementById('meta-modified').textContent = new Date(details.modified).toLocaleString();
        document.getElementById('meta-path').textContent = details.path;

        const exifSection = document.getElementById('exif-section');
        const exifList = document.getElementById('exif-data-list');
        
        if (exifDataCache.has(targetPath)) {
            const exifData = exifDataCache.get(targetPath);
            exifList.innerHTML = ''; 
            
            const ignoredKeys = ['SourceFile', 'ExifToolVersion', 'FileName', 'Directory', 'FileSize', 'FileModifyDate', 'FileAccessDate', 'FileInodeChangeDate'];
            
            for (const [key, value] of Object.entries(exifData)) {
                if (!ignoredKeys.includes(key) && typeof value !== 'object') {
                    exifList.innerHTML += `<div class="exif-item"><span>${key}</span><span>${value}</span></div>`;
                }
            }
            exifSection.style.display = 'block';

            const expandBtn = document.getElementById('expand-exif-btn');
            expandBtn.onclick = () => {
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                window.electronAPI.openExifWindow({
                    filename: details.name,
                    exifData: exifData,
                    theme: currentTheme
                });
            };

        } else {
            exifSection.style.display = 'none';
        }

        inspectorContent.style.display = 'flex';
    } 
    // STATE 3: Empty State
    else {
        inspectorEmpty.style.display = 'block';
    }
}

// THEME TOGGLE LOGIC
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

themeToggleBtn.addEventListener('click', () => {
    const root = document.documentElement;
    
    if (root.getAttribute('data-theme') === 'dark') {
        root.removeAttribute('data-theme');
        themeIcon.textContent = 'dark_mode';
    } else {
        root.setAttribute('data-theme', 'dark');
        themeIcon.textContent = 'light_mode'; 
    }
});