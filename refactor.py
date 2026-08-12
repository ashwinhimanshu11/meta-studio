import os
import re

INDEX = "index.html"
EDITOR_JS = "js/editor.js"
VIDEO_JS = "js/video-editor.js"
IMG_WIN = "image-editor-window.html"
VID_WIN = "video-editor-window.html"

# Extract UI from IMG_WIN
with open(IMG_WIN, 'r') as f:
    img_html = f.read()

img_actions_match = re.search(r'<div class="header-actions">(.*?)</div>\s*</div>\s*<div class="editor-container"', img_html, re.DOTALL)
img_actions = img_actions_match.group(1).strip() if img_actions_match else ""
img_actions = img_actions.replace('id="btn-cancel"', 'id="btn-cancel" style="display: none;"') # Hide original cancel since we use back

# Also extract redact container
redact_container_match = re.search(r'(<div id="redact-review-container".*?</div>\s*</div>)', img_html, re.DOTALL)
redact_container = redact_container_match.group(1) if redact_container_match else ""

# Extract JS from IMG_WIN
img_script_match = re.search(r'<script>\s*let currentFilePath = null;(.*?)</script>\s*</body>', img_html, re.DOTALL)
img_script = img_script_match.group(1) if img_script_match else ""
img_script = img_script.replace('window.electronAPI.onInitEditor(async (payload) => {', 'window.startImageEditor = async function(payload) {')
# Fix variables
img_script = img_script.replace('let currentFilePath = null;', '') # will define in editor.js
img_script = img_script.replace('let isEdited = false;', '')

# Extract UI from VID_WIN
with open(VID_WIN, 'r') as f:
    vid_html = f.read()

vid_actions_match = re.search(r'<div class="header-actions">(.*?)</div>\s*</div>\s*<div class="editor-container"', vid_html, re.DOTALL)
vid_actions = vid_actions_match.group(1).strip() if vid_actions_match else ""
vid_actions = vid_actions.replace('id="btn-cancel"', 'id="btn-cancel-vid" style="display: none;"')
vid_actions = vid_actions.replace('id="btn-save"', 'id="btn-save-vid"')
vid_actions = vid_actions.replace('id="save-dropdown"', 'id="save-dropdown-vid"')
vid_actions = vid_actions.replace('id="btn-save-replace"', 'id="btn-save-replace-vid"')
vid_actions = vid_actions.replace('id="btn-save-new"', 'id="btn-save-new-vid"')

vid_crop_overlay = '<div id="crop-overlay-container" style="display: none; position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; align-items: center; justify-content: center;"><img id="crop-image" style="max-width: 100%; max-height: 100%; display: block;" /></div>'
vid_blur_modal_match = re.search(r'(<!-- Blur Timeframe Modal -->.*?</div>\s*</div>)', vid_html, re.DOTALL)
vid_blur_modal = vid_blur_modal_match.group(1) if vid_blur_modal_match else ""

# Extract JS from VID_WIN
vid_script_match = re.search(r'<script>\s*let currentFilePath = null;(.*?)</script>\s*</body>', vid_html, re.DOTALL)
vid_script = vid_script_match.group(1) if vid_script_match else ""
vid_script = vid_script.replace('window.electronAPI.onInitVideoEditor(async (payload) => {', 'window.startVideoEditor = async function(payload) {')
vid_script = vid_script.replace('let currentFilePath = null;', '')
vid_script = vid_script.replace('let isEdited = false;', '')

vid_script = vid_script.replace('"btn-cancel"', '"btn-cancel-vid"')
vid_script = vid_script.replace('"btn-save"', '"btn-save-vid"')
vid_script = vid_script.replace('"save-dropdown"', '"save-dropdown-vid"')
vid_script = vid_script.replace('"btn-save-replace"', '"btn-save-replace-vid"')
vid_script = vid_script.replace('"btn-save-new"', '"btn-save-new-vid"')


# Read Index HTML
with open(INDEX, 'r') as f:
    index_html = f.read()

# Add CSS link
if 'cropper.min.css' not in index_html:
    index_html = index_html.replace('</head>', '    <link href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.css" rel="stylesheet">\n  </head>')

# Add JS script
if 'cropper.min.js' not in index_html:
    index_html = index_html.replace('</body>', '    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.6.1/cropper.min.js"></script>\n  </body>')

# Update Image Editor Workspace
img_options_html = f"""
      <div class="resizer" id="editor-right-resizer" style="display: none;"></div>
      <div class="sidebar-right" id="editor-options-panel" style="display: none; flex-direction: column; overflow-y: auto; gap: 10px; padding: 20px;">
        <button id="editor-back-normal-btn" class="action-btn" style="align-self: flex-start; margin-bottom: 10px;"><span class="material-symbols-rounded">arrow_back</span> Back to normal</button>
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Edit Options</h3>
        {img_actions}
      </div>
    </div>
"""
# find end of editor-workspace
index_html = index_html.replace('      </div>\n    </div>\n\n    <div\n      id="video-workspace"', f'      </div>{img_options_html}\n\n    <div\n      id="video-workspace"')
# add redact container to editor preview
index_html = index_html.replace('id="editor-preview-img" style="max-width: 100%; max-height: 80%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />', f'id="editor-preview-img" style="max-width: 100%; max-height: 80%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />\n          {redact_container}')


# Update Video Editor Workspace
vid_options_html = f"""
      <div class="resizer" id="video-right-resizer" style="display: none;"></div>
      <div class="sidebar-right" id="video-options-panel" style="display: none; flex-direction: column; overflow-y: auto; gap: 10px; padding: 20px;">
        <button id="video-back-normal-btn" class="action-btn" style="align-self: flex-start; margin-bottom: 10px;"><span class="material-symbols-rounded">arrow_back</span> Back to normal</button>
        <h3 style="margin: 0 0 10px 0; font-size: 15px; color: var(--text-main);">Video Edit Options</h3>
        {vid_actions}
      </div>
    </div>
"""
# find end of video-workspace, usually right before <div id="hover-card"
index_html = index_html.replace('      </div>\n    </div>\n\n    <div id="hover-card"', f'      </div>{vid_options_html}\n{vid_blur_modal}\n\n    <div id="hover-card"')

# add crop overlay to video preview
index_html = index_html.replace('<video id="video-preview-vid" style="max-width: 100%; max-height: 80%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" controls></video>', f'<video id="video-preview-vid" style="max-width: 100%; max-height: 80%; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" controls></video>\n          {vid_crop_overlay}')

with open(INDEX, 'w') as f:
    f.write(index_html)


# Update editor.js
with open(EDITOR_JS, 'r') as f:
    editor_js = f.read()

editor_js = editor_js.replace('window.electronAPI.openImageEditorWindow({\n        filePath: currentSelectedImagePath,\n        extension: currentSelectedImageExtension,\n        theme: document.documentElement.getAttribute("data-theme") || "light"\n      });', """
      document.getElementById('editor-edit-btn').style.display = 'none';
      document.getElementById('editor-right-resizer').style.display = 'block';
      document.getElementById('editor-options-panel').style.display = 'flex';
      window.startImageEditor({ filePath: currentSelectedImagePath });
""")

js_additions = """
let isEdited = false;

// --- Injected Image Editor Logic ---
""" + img_script + """

document.getElementById('editor-back-normal-btn').addEventListener('click', () => {
    document.getElementById('editor-right-resizer').style.display = 'none';
    document.getElementById('editor-options-panel').style.display = 'none';
    document.getElementById('editor-edit-btn').style.display = 'flex';
    if(cropper) {
        cropper.destroy();
        cropper = null;
    }
    const btnCancel = document.getElementById("btn-cancel");
    if(btnCancel) btnCancel.click(); // Reset state
});

"""
editor_js = editor_js + js_additions
with open(EDITOR_JS, 'w') as f:
    f.write(editor_js)


# Update video-editor.js
with open(VIDEO_JS, 'r') as f:
    video_js = f.read()

video_js = video_js.replace('window.electronAPI.openVideoEditorWindow({\n        filePath: currentSelectedVideoPath,\n        extension: currentSelectedVideoExtension,\n        theme: document.documentElement.getAttribute("data-theme") || "light"\n      });', """
      document.getElementById('video-edit-btn').style.display = 'none';
      document.getElementById('video-right-resizer').style.display = 'block';
      document.getElementById('video-options-panel').style.display = 'flex';
      window.startVideoEditor({ filePath: currentSelectedVideoPath });
""")

vid_js_additions = """
let isEdited = false;

// --- Injected Video Editor Logic ---
""" + vid_script + """

document.getElementById('video-back-normal-btn').addEventListener('click', () => {
    document.getElementById('video-right-resizer').style.display = 'none';
    document.getElementById('video-options-panel').style.display = 'none';
    document.getElementById('video-edit-btn').style.display = 'flex';
    
    // reset UI
    const btnCancel = document.getElementById("btn-cancel-vid");
    if(btnCancel) btnCancel.click();
});

"""
video_js = video_js + vid_js_additions
with open(VIDEO_JS, 'w') as f:
    f.write(video_js)

print("Refactoring complete.")
