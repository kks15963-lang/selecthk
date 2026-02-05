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
    dom.form.btnAddRow.onclick = () => addProductRow();

    dom.form.btnSave.onclick = saveOrder;
    dom.form.btnClose.onclick = () => navigate('view-list');

    // Customer Intelligence: Auto-fill Address
    const inpCust = document.getElementById('inp-customer');
    if (inpCust) {
        inpCust.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            if (!val) return;
            // Find most recent order for this customer
            const recent = STATE.orders
                .filter(o => o.customer_id === val)
                .sort((a, b) => b.order_date.localeCompare(a.order_date))[0];

            if (recent && recent.address) {
                document.getElementById('inp-address').value = recent.address;
            }
        });
    }

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

    // Order List Date Filters
    const bindListDate = (id, key) => {
        const el = document.getElementById(id);
        if (el) el.onchange = (e) => { STATE.filters[key] = e.target.value; renderOrderList(); };
    };
    bindListDate('filter-date-start', 'startDate');
    bindListDate('filter-date-end', 'endDate');

    document.getElementById('btn-period-today').onclick = () => setListDate(0);
    document.getElementById('btn-period-week').onclick = () => setListDate(7);
    document.getElementById('btn-period-month').onclick = () => setListDate(30);

    document.getElementById('btn-filter-reset').onclick = () => {
        STATE.filters = { customer: '', product: '', status: 'All', startDate: '', endDate: '' };
        ['filter-customer', 'filter-product', 'filter-date-start', 'filter-date-end'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('filter-status').value = 'All';
        renderOrderList();
    };

    // HK Delivery Search
    const hkSearch = document.getElementById('inp-search-hk');
    if (hkSearch) {
        hkSearch.oninput = (e) => {
            STATE.hkQuery = e.target.value.toLowerCase();
            renderHongKongList();
        };
    }

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
        const id = STATE.managementTargetId;
        const allItems = STATE.orders.filter(x => x.order_id === id);
        if (allItems.length > 0) {
            const main = { ...allItems[0] };
            main.items = allItems; // Pass all items for population
            openForm(main, navigate);
        }
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
        const id = STATE.managementTargetId;
        const allItems = STATE.orders.filter(x => x.order_id === id);
        if (allItems.length > 0) {
            const main = { ...allItems[0] };
            main.items = allItems; // Pass all items for receipt
            showReceipt(main);
        }
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
    document.getElementById('btn-lang-ko').onclick = () => setLanguage('ko');
    document.getElementById('btn-lang-cn').onclick = () => setLanguage('cn');
    document.getElementById('btn-curr-krw').onclick = () => setCurrency('KRW');
    document.getElementById('btn-curr-hkd').onclick = () => setCurrency('HKD');
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

function setListDate(days) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    STATE.filters.startDate = d.toISOString().split('T')[0];
    STATE.filters.endDate = new Date().toISOString().split('T')[0];
    document.getElementById('filter-date-start').value = STATE.filters.startDate;
    document.getElementById('filter-date-end').value = STATE.filters.endDate;
    renderOrderList();
}

// Global helper for Customer Intelligence
window.updateCustomerSuggestions = function () {
    const dl = document.getElementById('dl-customers');
    if (!dl) return;
    const unique = [...new Set(STATE.orders.map(o => o.customer_id).filter(Boolean))].sort();
    dl.innerHTML = unique.map(c => `<option value="${c}"></option>`).join('');
};

function setLanguage(lang) {
    STATE.lang = lang;
    document.getElementById('btn-lang-ko').classList.toggle('active', lang === 'ko');
    document.getElementById('btn-lang-cn').classList.toggle('active', lang === 'cn');
    renderDashboard();

    // Update labels if needed
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (TRANS[lang][key]) el.textContent = TRANS[lang][key];
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
        const key = el.dataset.i18nPh;
        if (TRANS[lang][key]) el.placeholder = TRANS[lang][key];
    });
}

function setCurrency(curr) {
    STATE.currencyMode = curr;
    document.getElementById('btn-curr-krw').classList.toggle('active', curr === 'KRW');
    document.getElementById('btn-curr-hkd').classList.toggle('active', curr === 'HKD');
    renderDashboard();
}
