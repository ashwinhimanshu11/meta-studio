export const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "tif", "tiff", "bmp", "heic", "heif", "avif"];
export const videoExtensions = ["mp4", "mov", "mkv", "avi", "webm", "m4v", "mpeg", "mpg", "3gp"];

export function formatSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[char]));
}

export function isMediaFile(fileData) {
    const extension = fileData.extension.toLowerCase();
    return imageExtensions.includes(extension) || videoExtensions.includes(extension);
}

export function mediaKind(fileData) {
    return imageExtensions.includes(fileData.extension.toLowerCase()) ? "Image" : "Video";
}

export function matchesFileFilter(fileData, query) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return true;
    const extensionQuery = cleanQuery.startsWith(".") ? cleanQuery.slice(1) : cleanQuery;
    return (
        fileData.name.toLowerCase().includes(cleanQuery) ||
        fileData.path.toLowerCase().includes(cleanQuery) ||
        fileData.extension.toLowerCase() === extensionQuery
    );
}