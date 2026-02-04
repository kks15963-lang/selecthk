

function showLoading() {
    if (dom.loadingOverlay) dom.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    if (dom.loadingOverlay) dom.loadingOverlay.classList.add('hidden');
}

function showToast(msg) {
    if (!dom.toastContainer) return;
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
