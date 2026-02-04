'use strict';

/**
 * Purchase Manager 2.0 Refactored
 * Strict Mode, DOM Caching, Modular Functions
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbxCoxgLFrRlLehBdcjnLkF8h5-a9NTopYibonQ7E_uTa_ZoIilazv0lWIRXZt7oAzisnA/exec",
    EXCHANGE_API: "https://open.er-api.com/v6/latest/HKD",
    IS_MOCK: false,
    DEFAULT_RATE: 175
};

const TRANS = {
    ko: {
        btn_save: "주문 정보 저장하고 목록으로 돌아가기",
        status_pending: "매입필요", status_ordered: "발송대기", status_shipped_to_hk: "배송대기",
        status_completed: "정산대기", status_settled: "정산완료", status_cancelled: "주문취소"
    },
    cn: {
        btn_save: "保存订单并返回列表",
        status_pending: "待处理", status_ordered: "已采购", status_shipped_to_hk: "已发货",
        status_completed: "已完成", status_settled: "已结算", status_cancelled: "Cancelled"
    }
};

let STATE = {
    orders: [],
    filters: { customer: '', product: '', status: 'All', startDate: '', endDate: '' },
    dashFilters: { startDate: '', endDate: '' },
    auth: null,
    lang: 'ko',
    currencyMode: 'KRW',
    exchangeRate: CONFIG.DEFAULT_RATE,
    selectedTab: 'view-dashboard',

    // Batch Selections
    selectedBatchIds: new Set(),
    selectedKoreaIds: new Set(),
    selectedHkIds: new Set(),
    selectedFinanceIds: new Set(),

    // Pagination
    pagination: { currentPage: 1, itemsPerPage: 10 },

    // UI Helpers
    managementTargetId: null
};

// --- DOM CACHE ---
const dom = {
    authOverlay: document.getElementById('auth-overlay'),
    authCode: document.getElementById('auth-code'),
    btnAuthConfirm: document.getElementById('btn-auth-confirm'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),

    // Navigation
    sections: document.querySelectorAll('.section'),
    navItems: document.querySelectorAll('.nav-item'),

    // Dashboard
    statRevenue: document.getElementById('stat-revenue'),
    statProfit: document.getElementById('stat-profit'),
    statCost: document.getElementById('stat-cost'),
    badges: {
        pending: document.getElementById('badge-pending'),
        ordered: document.getElementById('badge-ordered'),
        shippedKr: document.getElementById('badge-shipped-kr'),
        completed: document.getElementById('badge-completed')
    },
    profitList: document.getElementById('dashboard-profit-list'),

    // Form
    form: {
        id: document.getElementById('inp-order-id'),
        date: document.getElementById('inp-date'),
        customer: document.getElementById('inp-customer'),
        address: document.getElementById('inp-address'),
        remarks: document.getElementById('inp-remarks'),
        container: document.getElementById('product-rows-container'),
        btnSave: document.getElementById('btn-save-order'),
        btnClose: document.getElementById('btn-close-form')
    },

    // Lists
    lists: {
        all: document.getElementById('order-list-container'),
        purchase: document.getElementById('purchase-list-container'),
        korea: document.getElementById('korea-list-container'),
        hk: document.getElementById('hongkong-list-container'),
        finance: document.getElementById('finance-list-container')
    },

    // Modals
    modals: {
        purchase: document.getElementById('purchase-modal'),
        korea: document.getElementById('korea-modal'),
        hk: document.getElementById('hk-modal'),
        settlement: document.getElementById('settlement-modal'),
        receipt: document.getElementById('receipt-modal')
    },

    // Modal Inputs
    modalInpKrw: document.getElementById('modal-inp-krw'),
    inpShipTotal: document.getElementById('inp-ship-total'),
    inpSettleTotal: document.getElementById('inp-settle-total'),

    // HK Modal specific
    hkCustomerInfo: document.getElementById('hk-customer-info'),
    hkItemList: document.getElementById('hk-item-list'),
    inpHkAddress: document.getElementById('inp-hk-address'),
    inpTracking: document.getElementById('inp-tracking'),
    inpLocalFee: document.getElementById('inp-local-fee'),
    selDeliveryMethod: document.getElementById('sel-delivery-method'),

    // Action Sheets
    mngSheet: document.getElementById('order-management-sheet'),
    prodSheet: document.getElementById('product-action-sheet')
};

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', init);

async function init() {
    console.log('App Init');
    setupEvents();

    // Make global for onclick
    window.toggleCurrencyMode = toggleCurrencyMode;
    window.saveOrder = saveOrder; // Just in case

    // Show Auth
    if (!STATE.auth) {
        dom.authOverlay.style.display = 'flex';
        dom.authCode.focus();
    } else {
        loadData();
    }

    fetchExchangeRate();
}

function setupEvents() {
    // Auth
    dom.btnAuthConfirm.onclick = attemptAuth;
    dom.authCode.onkeyup = (e) => { if (e.key === 'Enter') attemptAuth(); };

    // Nav
    dom.navItems.forEach(btn => {
        btn.onclick = () => navigate(btn.dataset.target);
    });

    // Form
    document.getElementById('fab-add').onclick = () => openForm();
    dom.form.btnSave.onclick = saveOrder;
    dom.form.btnClose.onclick = () => navigate('view-list');

    // Dashboard Filters
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

    // List Filters
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

    // Bulk Modals
    document.getElementById('btn-bulk-purchase').onclick = () => openBatchModal('purchase');
    document.getElementById('btn-save-cost').onclick = savePurchaseCost;

    document.getElementById('btn-bulk-korea').onclick = () => openBatchModal('korea');
    document.getElementById('btn-save-korea').onclick = saveKoreaShipping;

    document.getElementById('btn-bulk-hk').onclick = saveBulkHongKongDelivery;
    document.getElementById('btn-save-hk').onclick = saveHongKongDelivery;

    document.getElementById('btn-bulk-settle').onclick = () => openBatchModal('settlement');
    document.getElementById('btn-save-settle').onclick = saveBulkSettlement;

    // Management Sheet Actions (Bound ONCE)
    document.getElementById('btn-mng-edit').onclick = () => {
        const o = STATE.orders.find(x => x.order_id === STATE.managementTargetId);
        if (o) openForm(o);
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


    // Settings
    document.getElementById('btn-lang-ko').onclick = () => setLang('ko');
    document.getElementById('btn-lang-cn').onclick = () => setLang('cn');
    document.getElementById('btn-curr-krw').onclick = () => setCurrency('KRW');
    document.getElementById('btn-curr-hkd').onclick = () => setCurrency('HKD');
    document.getElementById('btn-refresh-manual').onclick = loadData;

    // Global Dismiss
    document.addEventListener('click', (e) => {
        // Modal Dismiss
        if (e.target.classList.contains('modal')) e.target.classList.add('hidden');
        if (e.target.classList.contains('action-sheet-overlay')) closeProductActionSheet();

        // Management Sheet Dismiss (Clicking outside)
        if (!dom.mngSheet.classList.contains('hidden') && !dom.mngSheet.contains(e.target)) {
            // Check if we didn't just click a card to open it
            const pressing = document.querySelector('.card.pressing');
            if (!pressing) dom.mngSheet.classList.add('hidden');
        }
    });

    // Receipt Close
    document.getElementById('btn-close-receipt').onclick = () => dom.modals.receipt.classList.add('hidden');

    // Receipt Long Press Save
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

// --- DATA LOGIC ---
async function attemptAuth() {
    if (!dom.authCode.value) return showToast("인증코드를 입력하세요");
    showLoading();
    STATE.auth = dom.authCode.value;
    await loadData();
}

async function loadData() {
    showLoading();
    try {
        const res = await sendData({ action: 'getOrders', auth: STATE.auth });
        if (res.success) {
            STATE.orders = res.data;
            dom.authOverlay.style.display = 'none';
            renderDashboard();
            if (STATE.selectedTab !== 'view-dashboard') navigate(STATE.selectedTab);
        } else {
            alert(res.message || "Auth Failed");
            dom.authOverlay.style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
        showToast("데이터 로드 실패");
    } finally {
        hideLoading();
    }
}

async function sendData(payload) {
    if (CONFIG.IS_MOCK) return { success: true, data: [] };
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST', body: JSON.stringify(payload)
    });
    return await res.json();
}

async function sendBatchUpdate(updates) {
    return await sendData({ action: 'updateOrders', auth: STATE.auth, data: updates });
}

// --- SAVE ACTIONS (RESTORED) ---
async function savePurchaseCost() {
    const cost = dom.modalInpKrw.value;
    if (!cost) return alert("매입가(KRW)를 입력해주세요");

    if (STATE.selectedBatchIds.size === 0) return alert("선택된 주문이 없습니다.");

    const updates = Array.from(STATE.selectedBatchIds).map(id => ({
        order_id: id,
        cost_krw: Number(cost),
        status: 'Ordered'
    }));

    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert("매입 처리 완료");
        STATE.selectedBatchIds.clear();
        dom.modals.purchase.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); alert("오류 발생"); }
    finally { hideLoading(); }
}

async function saveKoreaShipping() {
    const fee = dom.inpShipTotal.value;
    if (!fee) return alert("배송비(HKD)를 입력해주세요");

    // Distribute fee among selected items
    const count = STATE.selectedKoreaIds.size;
    if (count === 0) return alert("선택된 주문이 없습니다.");

    const feePerItem = Number(fee) / count;

    const updates = Array.from(STATE.selectedKoreaIds).map(id => ({
        order_id: id,
        ship_fee_krw: feePerItem,
        status: 'Shipped_to_HK'
    }));

    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert("발송 처리 완료");
        STATE.selectedKoreaIds.clear();
        dom.modals.korea.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); alert("오류 발생"); }
    finally { hideLoading(); }
}

async function saveBulkHongKongDelivery() {
    if (STATE.selectedHkIds.size === 0) return alert("배송할 고객/주문을 선택해주세요");

    const ids = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');

    dom.hkCustomerInfo.innerHTML = `<strong>${ids.join(', ')}</strong><br>총 ${relevantOrders.length}개 상품`;
    dom.hkItemList.innerHTML = relevantOrders.map(o => `<div>- ${o.product_name} (${o.option})</div>`).join('');

    dom.inpHkAddress.value = relevantOrders[0]?.address || '';
    dom.inpTracking.value = '';
    dom.inpLocalFee.value = '';

    dom.modals.hk.classList.remove('hidden');
}

async function saveHongKongDelivery() {
    const address = dom.inpHkAddress.value;
    const tracking = dom.inpTracking.value;
    const localFee = dom.inpLocalFee.value;

    // Distribute local fee
    const ids = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');

    if (relevantOrders.length === 0) return;

    const feePerItem = localFee ? (Number(localFee) / relevantOrders.length) : 0;

    const updates = relevantOrders.map(o => ({
        order_id: o.order_id,
        address: address,
        tracking_no: tracking,
        local_fee_hkd: feePerItem,
        status: 'Completed',
        remarks: o.remarks + (tracking ? ` [Tracking: ${tracking}]` : '')
    }));

    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert("배송 완료 처리됨");
        STATE.selectedHkIds.clear();
        dom.modals.hk.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); }
    finally { hideLoading(); }
}

async function saveBulkSettlement() {
    if (STATE.selectedFinanceIds.size === 0) return alert("정산할 주문을 선택해주세요");

    const updates = Array.from(STATE.selectedFinanceIds).map(id => ({
        order_id: id,
        status: 'Settled'
    }));

    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert("정산 완료");
        STATE.selectedFinanceIds.clear();
        dom.modals.settlement.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); }
    finally { hideLoading(); }
}

// --- RENDERERS ---
function navigate(targetId) {
    STATE.selectedTab = targetId;
    STATE.pagination.currentPage = 1;
    dom.sections.forEach(s => s.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');
    dom.navItems.forEach(n => n.classList.toggle('active', n.dataset.target === targetId));

    if (targetId === 'view-dashboard') renderDashboard();
    else if (targetId === 'view-list') renderOrderList();
    else if (targetId === 'view-purchase') renderPurchaseList();
    else if (targetId === 'view-korea') renderKoreaList();
    else if (targetId === 'view-hongkong') renderHongKongList();
    else if (targetId === 'view-finance') renderFinanceList();
}

function toggleCurrencyMode() {
    STATE.currencyMode = STATE.currencyMode === 'KRW' ? 'HKD' : 'KRW';
    renderDashboard();

    const lbl = document.getElementById('label-curr-mode');
    if (lbl) {
        lbl.textContent = STATE.currencyMode;
        // Visual feedback
        lbl.style.background = STATE.currencyMode === 'KRW' ? 'rgba(0,0,0,0.05)' : '#dbeafe';
        lbl.style.color = STATE.currencyMode === 'KRW' ? 'black' : 'var(--primary)';
    }
}

function renderDashboard() {
    let profit = 0, revenue = 0, cost = 0;

    // Filter logic
    const f = STATE.dashFilters;
    const filtered = STATE.orders.filter(o => {
        if (o.status === 'Cancelled') return false;
        if (f.startDate && o.order_date < f.startDate) return false;
        if (f.endDate && o.order_date > f.endDate) return false;
        return true;
    });

    const counts = { pending: 0, ordered: 0, shipped: 0, completed: 0 };

    filtered.forEach(o => {
        if (o.status === 'Pending') counts.pending++;
        if (o.status === 'Ordered') counts.ordered++;
        if (o.status === 'Shipped_to_HK') counts.shipped++;
        if (o.status === 'Completed' || o.status === 'Settled') counts.completed++;

        // Calc Financials
        if (o.status === 'Settled') {
            const p = Number(o.price_hkd) || 0;
            const c = Number(o.cost_krw) || 0;
            const s = Number(o.ship_fee_krw) || 0;
            const l = Number(o.local_fee_hkd) || 0;

            revenue += p;
            cost += c;

            if (STATE.currencyMode === 'KRW') {
                profit += (p * STATE.exchangeRate) - (c + (s * STATE.exchangeRate) + (l * STATE.exchangeRate));
            } else {
                profit += p - (c / STATE.exchangeRate) - s - l;
            }
        }
    });

    dom.statProfit.textContent = Math.round(profit).toLocaleString();
    dom.statRevenue.textContent = revenue.toLocaleString();
    dom.statCost.textContent = Math.round(cost).toLocaleString();

    dom.badges.pending.textContent = counts.pending;
    dom.badges.ordered.textContent = counts.ordered;
    dom.badges.shippedKr.textContent = counts.shipped;
    dom.badges.completed.textContent = counts.completed;

    const lbl = document.getElementById('label-curr-mode');
    if (lbl) lbl.textContent = STATE.currencyMode;

    // Render Settled Cards
    const settled = filtered.filter(o => o.status === 'Settled').slice(0, 20); // Limit to recent 20 for perf
    dom.profitList.innerHTML = '';

    if (settled.length > 0) {
        const title = document.createElement('h3');
        title.style.margin = '20px 0 10px 0';
        title.style.fontSize = '14px';
        title.style.color = '#64748b';
        title.textContent = `최근 정산 내역 (${settled.length})`;
        dom.profitList.appendChild(title);

        settled.forEach(o => {
            const el = createCard(o);
            dom.profitList.appendChild(el);
        });
    }
}

function renderOrderList() {
    const list = dom.lists.all;
    list.innerHTML = '';

    const f = STATE.filters;
    const items = STATE.orders.filter(o => {
        if (f.customer && !o.customer_id.toLowerCase().includes(f.customer.toLowerCase())) return false;
        if (f.product && !o.product_name.toLowerCase().includes(f.product.toLowerCase())) return false;
        if (f.status !== 'All' && o.status !== f.status) return false;
        if (f.startDate && o.order_date < f.startDate) return false;
        if (f.endDate && o.order_date > f.endDate) return false;
        return true;
    }).sort((a, b) => b.order_id.localeCompare(a.order_id));

    renderPagination(list, items, renderOrderList);
}

function renderPurchaseList() {
    const list = dom.lists.purchase;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Pending');

    const batchBtn = document.getElementById('action-bar-purchase');
    if (items.length > 0) batchBtn.classList.remove('hidden'); else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderPurchaseList, (o) => {
        const has = STATE.selectedBatchIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedBatchIds.delete(o.order_id);
            else STATE.selectedBatchIds.add(o.order_id);
            renderPurchaseList();
        }, has);
    });
}

function renderKoreaList() {
    const list = dom.lists.korea;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Ordered');

    const batchBtn = document.getElementById('action-bar-korea');
    if (items.length > 0) batchBtn.classList.remove('hidden'); else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderKoreaList, (o) => {
        const has = STATE.selectedKoreaIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedKoreaIds.delete(o.order_id);
            else STATE.selectedKoreaIds.add(o.order_id);
            renderKoreaList();
        }, has);
    });
}

function renderHongKongList() {
    const list = dom.lists.hk;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Shipped_to_HK');

    const batchBtn = document.getElementById('action-bar-hongkong');
    if (items.length > 0) batchBtn.classList.remove('hidden'); else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderHongKongList, (o) => {
        const has = STATE.selectedHkIds.has(o.customer_id);
        return createCard(o, () => {
            toggleHkSelection(o);
        }, STATE.selectedHkIds.has(o.customer_id));
    });
}

function renderFinanceList() {
    const list = dom.lists.finance;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Completed');

    const batchBtn = document.getElementById('action-bar-finance');
    if (items.length > 0) batchBtn.classList.remove('hidden'); else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderFinanceList, (o) => {
        const has = STATE.selectedFinanceIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedFinanceIds.delete(o.order_id);
            else STATE.selectedFinanceIds.add(o.order_id);
            renderFinanceList();
        }, has);
    });
}

// --- PAGINATION COMPONENT ---
function renderPagination(container, items, renderFunc, createItemOverride = null) {
    const { currentPage, itemsPerPage } = STATE.pagination;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    pageItems.forEach(o => {
        const card = createItemOverride ? createItemOverride(o) : createCard(o);
        container.appendChild(card);
    });

    const wrapper = document.createElement('div');
    wrapper.className = 'pagination-wrapper';

    const select = document.createElement('select');
    [10, 30, 50].forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.text = `${n}개씩`;
        if (itemsPerPage === n) opt.selected = true;
        select.appendChild(opt);
    });
    select.onchange = (e) => {
        STATE.pagination.itemsPerPage = Number(e.target.value);
        STATE.pagination.currentPage = 1;
        renderFunc();
    };

    const btns = document.createElement('div');
    btns.className = 'pagination-controls';

    const createBtn = (lbl, p, active, disabled) => {
        const b = document.createElement('button');
        b.className = `pagination-btn ${active ? 'active' : ''}`;
        b.innerHTML = lbl;
        b.disabled = disabled;
        if (!disabled) b.onclick = () => {
            STATE.pagination.currentPage = p;
            renderFunc();
            container.previousElementSibling?.scrollIntoView({ behavior: 'smooth' });
        };
        return b;
    };

    btns.appendChild(createBtn('&lt;', currentPage - 1, false, currentPage <= 1));

    let sp = Math.max(1, currentPage - 2);
    let ep = Math.min(totalPages, sp + 4);
    if (ep - sp < 4) sp = Math.max(1, ep - 4);

    for (let i = sp; i <= ep; i++) {
        if (i < 1) continue;
        btns.appendChild(createBtn(String(i), i, i === currentPage, false));
    }

    btns.appendChild(createBtn('&gt;', currentPage + 1, false, currentPage >= totalPages));

    wrapper.append(select, btns);
    container.appendChild(wrapper);
}

// --- CARD & INPUTSHelpers ---
function createCard(o, onClick, isSelected) {
    const el = document.createElement('div');
    el.className = `card ${isSelected ? 'selected-glow' : ''}`;

    const statusText = TRANS[STATE.lang][`status_${o.status.toLowerCase()}`] || o.status;

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${o.product_name}</span>
            <span class="badge ${o.status.toLowerCase()}">${statusText}</span>
        </div>
        <div class="card-subtitle" style="color:#64748b; font-size:13px;">${o.customer_id} | ${o.option} (x${o.qty})</div>
        <div class="card-details">
            <span>HKD ${Number(o.price_hkd).toLocaleString()}</span>
            <span style="color:#94a3b8">${o.order_date}</span>
        </div>
    `;

    if (onClick) el.onclick = onClick;

    // Long Press
    let timer;
    const start = () => {
        el.classList.add('pressing');
        timer = setTimeout(() => {
            el.classList.remove('pressing');
            if (navigator.vibrate) navigator.vibrate(50);
            openManagementMenu(o);
        }, 600);
    };
    const end = () => { clearTimeout(timer); el.classList.remove('pressing'); };

    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchend', end);
    el.addEventListener('touchmove', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);

    return el;
}

function openForm(data = null) {
    navigate('view-form');
    dom.form.id.value = data ? data.order_id : '';
    dom.form.date.value = data ? data.order_date : new Date().toISOString().split('T')[0];
    dom.form.customer.value = data ? data.customer_id : '';
    dom.form.address.value = data ? data.address : '';
    dom.form.remarks.value = data ? data.remarks : '';
    dom.form.container.innerHTML = '';

    if (data) {
        addProductRow({ product: data.product_name, qty: data.qty, price: data.price_hkd, option: data.option });
    } else {
        addProductRow();
    }
}

function addProductRow(data = null) {
    const row = document.createElement('div');
    row.className = 'product-card';
    const uid = `list-opt-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    row.innerHTML = `
        <div style="margin-bottom:12px;">
            <label class="form-label">상품명 <span style="color:var(--danger)">*</span></label>
            <input class="form-input inp-product" list="list-products" placeholder="상품명 검색" value="${data ? data.product : ''}">
        </div>
        <div class="row">
            <div style="flex:1;">
                <label class="form-label">수량 <span style="color:var(--danger)">*</span></label>
                <input class="form-input inp-qty" type="number" placeholder="1" value="${data ? data.qty : '1'}">
            </div>
            <div style="flex:1;">
                <label class="form-label">단가 (HKD)</label>
                <input class="form-input inp-price" type="number" placeholder="0" value="${data ? data.price : ''}">
            </div>
        </div>
        <div style="margin-top:12px;">
             <label class="form-label">옵션/사이즈 <span style="color:var(--danger)">*</span></label>
             <input class="form-input inp-option" list="${uid}" placeholder="옵션 정보" value="${data ? data.option : ''}">
             <datalist id="${uid}"></datalist>
        </div>
    `;

    const inpProd = row.querySelector('.inp-product');
    const inpOpt = row.querySelector('.inp-option');
    const dlOpt = row.querySelector('datalist');

    ensureProductDatalist();

    const handleUpdate = () => {
        const val = inpProd.value.trim();
        if (val) updateOptionDatalist(dlOpt, val);
    };

    inpProd.addEventListener('input', handleUpdate);
    inpProd.addEventListener('change', handleUpdate);
    inpProd.addEventListener('focus', ensureProductDatalist);

    inpOpt.addEventListener('focus', handleUpdate);
    inpOpt.addEventListener('click', handleUpdate);

    if (data && data.product) handleUpdate();
    bindRowActions(row);
    dom.form.container.appendChild(row);
}

function ensureProductDatalist() {
    const dl = document.getElementById('list-products');
    if (!dl) return;
    const unique = [...new Set(STATE.orders.map(o => o.product_name).filter(Boolean))];
    dl.innerHTML = '';
    unique.sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        dl.appendChild(opt);
    });
}

function updateOptionDatalist(dl, prodName) {
    if (!dl) return;
    dl.innerHTML = '';
    const relevant = STATE.orders.filter(o => o.product_name.toLowerCase() === prodName.toLowerCase()).map(o => o.option).filter(Boolean);
    [...new Set(relevant)].sort().forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        dl.appendChild(opt);
    });
}

function bindRowActions(row) {
    let timer;
    const start = () => {
        row.classList.add('pressing');
        timer = setTimeout(() => {
            row.classList.remove('pressing');
            if (navigator.vibrate) navigator.vibrate(50);
            openProductSheet(row);
        }, 600);
    };
    const end = () => { clearTimeout(timer); row.classList.remove('pressing'); };

    row.addEventListener('touchstart', start, { passive: true });
    row.addEventListener('touchend', end);
    row.addEventListener('touchmove', end);
    row.addEventListener('mousedown', start);
    row.addEventListener('mouseup', end);
    row.addEventListener('mouseleave', end);
}

// --- SHEET & MENUS ---
let currentRow = null;
function openProductSheet(row) {
    currentRow = row;
    dom.prodSheet.classList.add('active');
}
function closeProductActionSheet() {
    dom.prodSheet.classList.remove('active');
    currentRow = null;
}

document.getElementById('btn-action-add').onclick = () => {
    addProductRow();
    closeProductActionSheet();
};
document.getElementById('btn-action-copy').onclick = () => {
    if (!currentRow) return;
    const inputs = currentRow.querySelectorAll('input');
    addProductRow({ product: inputs[0].value, qty: inputs[1].value, price: inputs[2].value, option: inputs[3].value });
    closeProductActionSheet();
};
document.getElementById('btn-action-delete').onclick = () => {
    if (currentRow && dom.form.container.children.length > 1) currentRow.remove();
    else if (currentRow) currentRow.querySelectorAll('input').forEach(i => i.value = '');
    closeProductActionSheet();
};
document.getElementById('btn-action-cancel').onclick = closeProductActionSheet;


// --- SAVE LOGIC ---
async function saveOrder() {
    const cust = dom.form.customer.value.trim();
    if (!cust) return alert("고객명을 입력해주세요");

    const rows = Array.from(dom.form.container.children);
    const orders = [];

    for (const r of rows) {
        const p = r.querySelector('.inp-product').value.trim();
        const q = r.querySelector('.inp-qty').value;
        const price = r.querySelector('.inp-price').value;
        const opt = r.querySelector('.inp-option').value.trim();

        if (!p || !q || Number(q) <= 0 || !opt) return alert("상품명, 수량(1이상), 옵션을 모두 입력해주세요");

        orders.push({
            customer_id: cust,
            product_name: p,
            option: opt,
            qty: Number(q),
            price_hkd: Number(price) || 0,
            order_date: dom.form.date.value,
            status: 'Pending',
            address: dom.form.address.value.trim(),
            remarks: dom.form.remarks.value.trim()
        });
    }

    showLoading();
    try {
        const res = await sendData({ action: 'createOrder', orders: orders });
        if (res) {
            alert('저장되었습니다.');
            navigate('view-list');
            loadData();
        }
    } catch (e) { console.error(e); alert('저장 실패'); }
    finally { hideLoading(); }
}


// --- UTILS ---
function toggleHkSelection(o) {
    if (STATE.selectedHkIds.has(o.customer_id)) STATE.selectedHkIds.delete(o.customer_id);
    else STATE.selectedHkIds.add(o.customer_id);
    renderHongKongList();
}

function openBatchModal(type) {
    if (type === 'purchase') dom.modals.purchase.classList.remove('hidden');
    if (type === 'korea') dom.modals.korea.classList.remove('hidden');
    if (type === 'settlement') dom.modals.settlement.classList.remove('hidden');
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

function showLoading() { dom.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { dom.loadingOverlay.classList.add('hidden'); }
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.innerText = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

async function fetchExchangeRate() {
    try {
        const res = await fetch(CONFIG.EXCHANGE_API);
        const d = await res.json();
        if (d && d.rates && d.rates.KRW) {
            STATE.exchangeRate = Number(d.rates.KRW.toFixed(2));
            const inp = document.getElementById('inp-exchange-rate');
            if (inp) inp.value = STATE.exchangeRate;
        }
    } catch (e) { console.warn("Rate Fetch Failed"); }
}

function setLang(l) { STATE.lang = l; renderDashboard(); }
function setCurrency(c) { STATE.currencyMode = c; renderDashboard(); }

// --- MANAGEMENT MENU ---
function openManagementMenu(order) {
    STATE.managementTargetId = order.order_id;
    dom.mngSheet.classList.remove('hidden');
}

// Receipt Logic
function showReceipt(order) {
    dom.modals.receipt.classList.remove('hidden');

    document.getElementById('rcpt-date').innerText = order.order_date;
    document.getElementById('rcpt-id').innerText = '#' + order.order_id.slice(-5);

    // If order is singular (from list), just one item
    document.getElementById('rcpt-items').innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
            <span>${order.product_name} (${order.option}) x${order.qty}</span>
            <span>$${order.price_hkd}</span>
        </div>
    `;

    document.getElementById('rcpt-total').innerText = 'HKD ' + order.price_hkd;
}

function saveReceiptImage() {
    const paper = document.getElementById('receipt-paper');
    if (typeof html2canvas === 'undefined') {
        return alert("이미지 저장 라이브러리가 로드되지 않았습니다.");
    }

    showLoading();
    html2canvas(paper, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Receipt_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
        hideLoading();
        showToast("이미지가 저장되었습니다.");
    }).catch(err => {
        console.error(err);
        hideLoading();
        alert("이미지 저장 실패");
    });
}
