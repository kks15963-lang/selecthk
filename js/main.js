// Main Entry Point
// All dependencies are now loaded globally via index.html scripts

// Global exports for onClick compatibility (if needed)
window.toggleCurrencyMode = () => {
    STATE.currencyMode = STATE.currencyMode === 'KRW' ? 'HKD' : 'KRW';
    renderDashboard();
    const lbl = document.getElementById('label-curr-mode');
    if (lbl) {
        lbl.textContent = STATE.currencyMode;
        lbl.style.background = STATE.currencyMode === 'KRW' ? 'rgba(0,0,0,0.05)' : '#dbeafe';
        lbl.style.color = STATE.currencyMode === 'KRW' ? 'black' : 'var(--primary)';
    }
};

window.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('App Module Init');
    initDom(); // Initialize DOM elements
    setupEvents();

    if (!STATE.auth) {
        dom.authOverlay.style.display = 'flex';
        dom.authCode.focus();
    } else {
        loadData();
    }
    fetchExchangeRate();
}

function setupEvents() {
    dom.btnAuthConfirm.onclick = attemptAuth;
    dom.authCode.onkeyup = (e) => { if (e.key === 'Enter') attemptAuth(); };

    dom.navItems.forEach(btn => {
        btn.onclick = () => navigate(btn.dataset.target);
    });

    document.getElementById('fab-add').onclick = () => openForm(null, navigate);
    dom.form.btnSave.onclick = saveOrder;
    dom.form.btnClose.onclick = () => navigate('view-list');

    // Filters
    const bindDashDate = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.onchange = (e) => { STATE.dashFilters[key] = e.target.value; renderDashboard(); };
    };
    bindDashDate('dash-date-start', 'startDate');
    bindDashDate('dash-date-end', 'endDate');

    document.getElementById('btn-dash-today').onclick = () => setDashDate(0);
    document.getElementById('btn-dash-week').onclick = () => setDashDate(7);
    document.getElementById('btn-dash-month').onclick = () => setDashDate(30);
    document.getElementById('btn-dash-reset').onclick = () => {
        STATE.dashFilters = { startDate: '', endDate: '' };
        document.getElementById('dash-date-start').value = '';
        document.getElementById('dash-date-end').value = '';
        renderDashboard();
    };

    const bindFilter = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.oninput = (e) => { STATE.filters[key] = e.target.value; renderOrderList(); };
    };
    bindFilter('filter-customer', 'customer');
    bindFilter('filter-product', 'product');
    document.getElementById('filter-status').onchange = (e) => { STATE.filters.status = e.target.value; renderOrderList(); };
    document.getElementById('btn-filter-reset').onclick = () => {
        STATE.filters = { customer: '', product: '', status: 'All', startDate: '', endDate: '' };
        ['filter-customer', 'filter-product', 'filter-date-start', 'filter-date-end'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('filter-status').value = 'All';
        renderOrderList();
    };

    // Bulk Buttons
    document.getElementById('btn-bulk-purchase').onclick = () => openBatchModal('purchase');
    document.getElementById('btn-save-cost').onclick = savePurchaseCost;
    document.getElementById('btn-bulk-korea').onclick = () => openBatchModal('korea');
    document.getElementById('btn-save-korea').onclick = saveKoreaShipping;
    document.getElementById('btn-bulk-hk').onclick = saveBulkHongKongDelivery;

    dom.btnHkNext.onclick = () => {
        dom.hkInputContainer.classList.remove('hidden');
        dom.btnHkNext.classList.add('hidden');
        dom.btnSaveHk.classList.remove('hidden');
    };
    dom.btnSaveHk.onclick = saveHongKongDelivery;
    document.getElementById('btn-bulk-settle').onclick = () => openBatchModal('settlement');
    document.getElementById('btn-save-settle').onclick = saveBulkSettlement;

    // Management Sheet actions
    document.getElementById('btn-mng-edit').onclick = () => {
        const o = STATE.orders.find(x => x.order_id === STATE.managementTargetId);
        if (o) openForm(o, navigate);
        dom.mngSheet.classList.add('hidden');
    };
    document.getElementById('btn-mng-refund').onclick = async () => {
        if (confirm("환불 처리하고 주문 취소하시겠습니까?")) {
            await sendBatchUpdate([{ order_id: STATE.managementTargetId, status: 'Cancelled' }]);
            alert("환불 처리되었습니다.");
            loadData();
        }
        dom.mngSheet.classList.add('hidden');
    };
    document.getElementById('btn-mng-delete').onclick = async () => {
        if (confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            await sendData({ action: 'deleteOrder', order_id: STATE.managementTargetId, auth: STATE.auth });
            loadData();
        }
        dom.mngSheet.classList.add('hidden');
    };
    document.getElementById('btn-mng-receipt').onclick = () => {
        const o = STATE.orders.find(x => x.order_id === STATE.managementTargetId);
        if (o) showReceipt(o);
        dom.mngSheet.classList.add('hidden');
    };
    document.getElementById('btn-mng-delivery').onclick = () => {
        const o = STATE.orders.find(x => x.order_id === STATE.managementTargetId);
        if (o) {
            STATE.selectedHkIds.clear();
            STATE.selectedHkIds.add(o.customer_id);
            openHkDeliveryModal();
        }
        dom.mngSheet.classList.add('hidden');
    };


    // Settings
    document.getElementById('btn-lang-ko').onclick = () => { STATE.lang = 'ko'; renderDashboard(); };
    document.getElementById('btn-lang-cn').onclick = () => { STATE.lang = 'cn'; renderDashboard(); };
    document.getElementById('btn-curr-krw').onclick = () => { STATE.currencyMode = 'KRW'; renderDashboard(); };
    document.getElementById('btn-curr-hkd').onclick = () => { STATE.currencyMode = 'HKD'; renderDashboard(); };
    document.getElementById('btn-refresh-manual').onclick = loadData;

    // Global Dismiss
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) e.target.classList.add('hidden');
        if (e.target.classList.contains('action-sheet-overlay')) closeProductActionSheet();
        if (!dom.mngSheet.classList.contains('hidden') && !dom.mngSheet.contains(e.target)) {
            const pressing = document.querySelector('.card.pressing');
            if (!pressing) dom.mngSheet.classList.add('hidden');
        }
    });

    document.getElementById('btn-close-receipt').onclick = () => dom.modals.receipt.classList.add('hidden');

    // Product Action Sheet
    document.getElementById('btn-action-add').onclick = () => {
        addProductRow();
        closeProductActionSheet();
    };
    document.getElementById('btn-action-copy').onclick = () => {
        const currentRow = getCurrentRow();
        if (!currentRow) return;
        const inputs = currentRow.querySelectorAll('input');
        addProductRow({ product: inputs[0].value, qty: inputs[1].value, price: inputs[2].value, option: inputs[3].value });
        closeProductActionSheet();
    };
    document.getElementById('btn-action-delete').onclick = () => {
        const currentRow = getCurrentRow();
        if (currentRow && dom.form.container.children.length > 1) currentRow.remove();
        else if (currentRow) currentRow.querySelectorAll('input').forEach(i => i.value = '');
        closeProductActionSheet();
    };
    document.getElementById('btn-action-cancel').onclick = closeProductActionSheet;

    // Receipt Long Press
    const paper = document.getElementById('receipt-paper');
    if (paper) {
        let timer;
        const start = () => {
            paper.classList.add('saving');
            timer = setTimeout(() => {
                paper.classList.remove('saving');
                if (navigator.vibrate) navigator.vibrate(50);
                saveReceiptImage();
            }, 800);
        };
        const end = () => { clearTimeout(timer); paper.classList.remove('saving'); };
        paper.addEventListener('touchstart', start, { passive: true });
        paper.addEventListener('touchend', end);
        paper.addEventListener('touchmove', end);
        paper.addEventListener('mousedown', start);
        paper.addEventListener('mouseup', end);
        paper.addEventListener('mouseleave', end);
    }
}

function setDashDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    STATE.dashFilters.startDate = d.toISOString().split('T')[0];
    STATE.dashFilters.endDate = new Date().toISOString().split('T')[0];
    document.getElementById('dash-date-start').value = STATE.dashFilters.startDate;
    document.getElementById('dash-date-end').value = STATE.dashFilters.endDate;
    renderDashboard();
}
