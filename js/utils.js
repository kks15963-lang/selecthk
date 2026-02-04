

let loadingInterval;

function showLoading() {
    if (dom.loadingOverlay) {
        dom.loadingOverlay.classList.remove('hidden');
        dom.loadingOverlay.innerHTML = ''; // Clear previous content

        // Create Initial Center Item
        createLoadingItem(50, 50, true);

        // Spawn random items every 0.5s
        loadingInterval = setInterval(() => {
            const top = Math.random() * 80 + 10; // 10% ~ 90%
            const left = Math.random() * 80 + 10;
            createLoadingItem(top, left, false);
        }, 500);
    }
}

function hideLoading() {
    if (dom.loadingOverlay) {
        dom.loadingOverlay.classList.add('hidden');
        clearInterval(loadingInterval);
        dom.loadingOverlay.innerHTML = '';
    }
}

function createLoadingItem(top, left, isCenter) {
    // Container for positioning
    const container = document.createElement('div');
    const size = isCenter ? 60 : 40;

    container.style.position = 'absolute';
    container.style.left = `${left}%`;
    container.style.top = `${top}%`;
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    container.style.transform = 'translate(-50%, -50%)';
    container.style.zIndex = '1001';
    container.style.pointerEvents = 'none'; // Ensure clicks pass through if needed

    // Image for rotation
    const img = document.createElement('img');
    img.src = 'loading.png'; // Uses loading.png from root
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.animation = 'spin 1s linear infinite';

    container.appendChild(img);

    // Pop-in animation
    container.animate([
        { opacity: 0, transform: 'translate(-50%, -50%) scale(0.5)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' }
    ], { duration: 300, easing: 'ease-out' });

    dom.loadingOverlay.appendChild(container);
}

function showToast(msg) {
    if (!dom.toastContainer) return;
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}
