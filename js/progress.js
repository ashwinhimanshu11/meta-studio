export const progressState = { isCancelled: false };

export function initProgress() {
    const progModal = document.getElementById("progress-modal");
    const progTitle = document.getElementById("progress-title");
    const progFill = document.getElementById("progress-fill");
    const progPercent = document.getElementById("progress-percent");
    const progCount = document.getElementById("progress-count");
    const progDetail = document.getElementById("progress-detail");

    document.getElementById('cancel-progress-btn').addEventListener('click', () => {
        progressState.isCancelled = true;
        progTitle.textContent = "Cancelling...";
        progDetail.textContent = "Cleaning up files and restoring backups...";
        window.electronAPI.cancelTask();
    });

    window.showProgress = function(title) {
        progressState.isCancelled = false;
        progTitle.textContent = title;
        progFill.style.width = "0%";
        progPercent.textContent = "0%";
        progCount.textContent = "";
        progDetail.textContent = "Starting...";
        progModal.classList.add("active");
    };

    window.updateProgress = function(current, total, detail) {
        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        progFill.style.width = `${percent}%`;
        progPercent.textContent = `${percent}%`;
        progCount.textContent = `${Math.floor(current)} / ${total}`;
        if (detail) progDetail.textContent = detail;
    };

    window.hideProgress = function() {
        progModal.classList.remove("active");
    };

    window.electronAPI.onTaskProgress((payload) => {
        if (!progModal.classList.contains("active")) window.showProgress(payload.title);
        window.updateProgress(payload.current, payload.total, payload.detail);
    });
}