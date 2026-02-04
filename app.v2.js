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
    hkInputContainer: document.getElementById('hk-input-container'),
    btnHkNext: document.getElementById('btn-hk-next'),
    btnSaveHk: document.getElementById('btn-save-hk'),
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
    dom.btnHkNext.onclick = () => {
        dom.hkInputContainer.classList.remove('hidden');
        dom.btnHkNext.classList.add('hidden');
        dom.btnSaveHk.classList.remove('hidden');
    };
    dom.btnSaveHk.onclick = saveHongKongDelivery;

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
    document.getElementById('btn-mng-delivery').onclick = () => {
        const o = STATE.orders.find(x => x.order_id === STATE.managementTargetId);
        if (o) {
            STATE.selectedHkIds.clear();
            STATE.selectedHkIds.add(o.customer_id); // Fix: Add to selection so save works
            openHkDeliveryModal();
        }
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
        // Handle both 'success': true and 'result': 'success' formats
        if (res && (res.success || res.result === 'success')) {
            STATE.orders = res.data || res.orders || [];
            dom.authOverlay.style.display = 'none';
            renderDashboard();
            if (STATE.selectedTab !== 'view-dashboard') navigate(STATE.selectedTab);
        } else {
            // Show detailed error for debugging
            alert("로그인 실패: " + (res.message || "서버 응답 오류") + "\n" + JSON.stringify(res));
            dom.authOverlay.style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
        showToast("데이터 로드 실패: " + e.message);
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

    // Check if any selected order missing address
    const ids = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');

    if (relevantOrders.some(o => !o.address || o.address.length < 5)) {
        return alert("선택한 주문 중 '배송 정보'가 입력되지 않은 항목이 있습니다.\n먼저 정보를 입력해주세요.");
    }

    openHkDeliveryModal('bulk');
}

function openHkDeliveryModal(mode = 'single') {
    const customerIds = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => customerIds.includes(o.customer_id) && o.status === 'Shipped_to_HK');

    if (relevantOrders.length === 0) return alert("해당 조건의 주문이 없습니다.");

    // Store mode for save function
    dom.modals.hk.dataset.mode = mode;

    dom.inpHkAddress.value = relevantOrders[0]?.address || '';
    dom.inpTracking.value = relevantOrders[0]?.tracking_no || '';
    dom.inpLocalFee.value = '';

    // UI Reset based on Mode
    dom.hkInputContainer.classList.add('hidden');
    dom.btnHkNext.classList.add('hidden');
    dom.btnSaveHk.classList.add('hidden');

    if (mode === 'bulk') {
        // Bulk: Detailed Receipt View
        dom.hkCustomerInfo.innerHTML = `<div style="text-align:center; font-weight:bold; margin-bottom:10px;">배송 정보 최종 확인 (${relevantOrders.length}건)</div>`;

        dom.hkItemList.innerHTML = relevantOrders.map(o => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
                <div style="font-weight:bold; font-size:13px; color:#334155;">${o.customer_id}</div>
                <div style="font-size:12px; color:#64748b;">${o.product_name} (${o.option}) x${o.qty}</div>
                <div style="margin-top:5px; font-size:12px;">
                    <span style="display:block;">📍 ${o.address || '<span style="color:var(--danger)">주소 없음</span>'}</span>
                    <span style="display:block;">📦 ${o.tracking_no || '<span style="color:#94a3b8">송장 없음</span>'}</span>
                </div>
            </div>
        `).join('');

        dom.btnSaveHk.classList.remove('hidden');
        dom.btnSaveHk.innerText = "모두 배송 완료 처리 (Complete)";
    } else {
        // Single: Inputs Shown (Edit Mode)
        dom.hkCustomerInfo.innerHTML = `<strong>${customerIds.join(', ')}</strong><br>총 ${relevantOrders.length}개 상품`;
        dom.hkItemList.innerHTML = relevantOrders.map(o => `<div>- ${o.product_name} (${o.option})</div>`).join('');

        dom.hkInputContainer.classList.remove('hidden');
        dom.btnSaveHk.classList.remove('hidden');
        dom.btnSaveHk.innerText = "배송 정보 저장";
    }

    dom.modals.hk.classList.remove('hidden');
}

async function saveHongKongDelivery() {
    const mode = dom.modals.hk.dataset.mode;
    const ids = Array.from(STATE.selectedHkIds);
    if (ids.length === 0) return alert("대상 주문이 없습니다.");

    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');
    if (relevantOrders.length === 0) return;

    let updates = [];

    if (mode === 'bulk') {
        // Bulk Mode: Just Mark as Completed
        updates = relevantOrders.map(o => ({
            order_id: o.order_id,
            status: 'Completed'
        }));

        // Validate Addresses before allowing completion
        if (relevantOrders.some(o => !o.address)) {
            return alert("배송 주소가 없는 주문이 포함되어 있습니다. 정보를 먼저 입력해주세요.");
        }

    } else {
        // Single/Edit Mode: Update Info ONLY (Do NOT complete)
        const address = dom.inpHkAddress.value.trim();
        const tracking = dom.inpTracking.value.trim();
        const localFee = dom.inpLocalFee.value.trim();

        const feePerItem = localFee ? (Number(localFee) / relevantOrders.length) : 0;

        updates = relevantOrders.map(o => ({
            order_id: o.order_id,
            address: address || o.address, // Update if new value provided
            tracking_no: tracking || o.tracking_no,
            local_fee_hkd: feePerItem || o.local_fee_hkd,
            // Status remains Shipped_to_HK
            status: 'Shipped_to_HK',
            remarks: o.remarks + (tracking && !o.remarks.includes(tracking) ? ` [TC: ${tracking}]` : '')
        }));
    }

    showLoading();
    try {
        await sendBatchUpdate(updates);
        showToast(mode === 'bulk' ? "배송 완료 처리됨" : "정보가 저장되었습니다.");
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
        showToast("정산 처리 완료되었습니다.");
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
            // Custom Card for Profit Display
            const el = document.createElement('div');
            el.className = 'card';

            const p = Number(o.price_hkd) || 0;
            const c_krw = Number(o.cost_krw) || 0;
            const s = Number(o.ship_fee_krw) || 0; // Intl Shipping (KRW usually?) Check field... ship_fee_krw is likely intl shipping in KRW?
            // Wait, previous calc used: expense += c + s (if s is in KRW). 
            // Let's assume ship_fee_krw is KRW.
            const l = Number(o.local_fee_hkd) || 0;

            // Convert for display
            const rate = STATE.exchangeRate;
            const c_hkd = rate ? (c_krw / rate) : 0;
            const s_hkd = rate ? (s / rate) : 0;
            const profit = p - c_hkd - s_hkd - l;

            el.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${o.product_name}</span>
                    <span class="badge completed">수익: HKD ${Math.round(profit).toLocaleString()}</span>
                </div>
                <div class="card-subtitle">${o.customer_id} | ${o.order_date}</div>
                <div style="margin-top:8px; font-size:12px; color:#64748b; background:#f8fafc; padding:8px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between;"><span>판매가</span> <span>+ HKD ${p.toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>매입가</span> <span>- HKD ${Math.round(c_hkd).toLocaleString()} (${c_krw.toLocaleString()}원)</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>배대지</span> <span>- HKD ${Math.round(s_hkd).toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>현지배송</span> <span>- HKD ${l.toLocaleString()}</span></div>
                </div>
            `;
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
    if (STATE.selectedBatchIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-purchase').innerText = `선택한 항목 매입 확정하기 (${STATE.selectedBatchIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderPurchaseList, (o) => {
        const has = STATE.selectedBatchIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedBatchIds.delete(o.order_id);
            else STATE.selectedBatchIds.add(o.order_id);
            renderPurchaseList();
        }, has); // Enable long-press for Purchase Tab
    });
}

function renderKoreaList() {
    const list = dom.lists.korea;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Ordered');

    const batchBtn = document.getElementById('action-bar-korea');
    if (STATE.selectedKoreaIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-korea').innerText = `선택한 항목 홍콩으로 발송하기 (${STATE.selectedKoreaIds.size})`;
    } else batchBtn.classList.add('hidden');

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

    // Sort: Items with address first, then others
    const items = STATE.orders.filter(o => o.status === 'Shipped_to_HK').sort((a, b) => {
        const hasA = (a.address && a.address.length > 5) ? 1 : 0;
        const hasB = (b.address && b.address.length > 5) ? 1 : 0;
        return hasB - hasA; // Descending order of "has address"
    });

    const batchBtn = document.getElementById('action-bar-hongkong');
    if (STATE.selectedHkIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-hk').innerText = `선택한 항목 배송 완료 처리 (${STATE.selectedHkIds.size})`;
    } else batchBtn.classList.add('hidden');

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
    if (STATE.selectedFinanceIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-settle').innerText = `선택한 항목 수익 정산하기 (${STATE.selectedFinanceIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderFinanceList, (o) => {
        const has = STATE.selectedFinanceIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedFinanceIds.delete(o.order_id);
            else STATE.selectedFinanceIds.add(o.order_id);
            renderFinanceList();
        }, has, true); // Disable long-press for Finance Tab
    });
}

// --- PAGINATION COMPONENT ---
function renderPagination(container, items, renderFunc, createItemOverride = null) {
    const { currentPage, itemsPerPage } = STATE.pagination;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    // 4. Wrapper: Create Buttons/Select
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
            // Scroll to the top of the container (wrapper itself)
            wrapper.scrollIntoView({ behavior: 'smooth' });
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

    // 5. Append Wrapper FIRST (Top)
    container.appendChild(wrapper);

    // 6. Append Cards
    pageItems.forEach(o => {
        const card = createItemOverride ? createItemOverride(o) : createCard(o);
        container.appendChild(card);
    });
}

// --- CARD & INPUTSHelpers ---
function createCard(o, onClick, isSelected, disableLongPress = false) {
    const el = document.createElement('div');
    el.className = `card ${isSelected ? 'selected-glow' : ''}`;

    const statusText = (o.status === 'Shipped_to_HK' && o.address && o.address.length > 5)
        ? "배송정보 입력완료"
        : (TRANS[STATE.lang][`status_${o.status.toLowerCase()}`] || o.status);

    // Delivery Info Validation Badge (Hong Kong Tab specific logic)
    let warning = '';
    if (o.status === 'Shipped_to_HK' && (!o.address || o.address.length < 5)) {
        warning = `<div style="color:var(--danger); font-size:12px; font-weight:bold; margin-top:4px;">⚠️ 배송 정보/주소 필요</div>`;
    }

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${o.product_name}</span>
            <span class="badge ${o.status.toLowerCase()}">${statusText}</span>
        </div>
        <div class="card-subtitle" style="color:#64748b; font-size:13px;">${o.customer_id} | ${o.option} (x${o.qty})</div>
        ${warning}
        <div class="card-details">
            <span>HKD ${Number(o.price_hkd).toLocaleString()}</span>
            <span style="color:#94a3b8">${o.order_date}</span>
        </div>
    `;

    // Long Press Logic
    let isLongPress = false;

    // Always attach click handler to intercept Long Press clicks
    el.onclick = (e) => {
        if (isLongPress) {
            // Prevent click if it was a long press
            e.stopImmediatePropagation();
            e.preventDefault();
            isLongPress = false; // Reset
            return;
        }
        if (onClick) onClick(e);
    };

    if (!disableLongPress) {
        let timer;
        const end = () => { clearTimeout(timer); el.classList.remove('pressing'); };
        const start = () => {
            isLongPress = false;
            el.classList.add('pressing');
            timer = setTimeout(() => {
                isLongPress = true; // Flag for click blocking
                el.classList.remove('pressing');
                if (navigator.vibrate) navigator.vibrate(50);
                openManagementMenu(o);
            }, 600);
        };

        el.addEventListener('touchstart', start, { passive: true });
        el.addEventListener('touchend', end, { passive: false });
        el.addEventListener('touchmove', end);
        el.addEventListener('mousedown', start);
        el.addEventListener('mouseup', end);
        el.addEventListener('mouseleave', end);
    }

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

    row.innerHTML = `
        <div style="margin-bottom:12px;">
            <label class="form-label">상품명 <span style="color:var(--danger)">*</span></label>
            <div class="autocomplete-wrapper">
                <input class="form-input inp-product" placeholder="상품명 검색" value="${data ? data.product : ''}" autocomplete="off">
                <div class="suggestion-box"></div>
            </div>
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
             <div class="autocomplete-wrapper">
                 <input class="form-input inp-option" placeholder="옵션 정보" value="${data ? data.option : ''}" autocomplete="off">
                 <div class="suggestion-box"></div>
             </div>
        </div>
    `;

    const inpProd = row.querySelector('.inp-product');
    const boxProd = row.querySelector('.inp-product + .suggestion-box');

    const inpOpt = row.querySelector('.inp-option');
    const boxOpt = row.querySelector('.inp-option + .suggestion-box');

    setupAutocomplete(inpProd, boxProd, 'product_name');
    setupAutocomplete(inpOpt, boxOpt, 'option', () => inpProd.value.trim());

    bindRowActions(row);
    dom.form.container.appendChild(row);
}

function setupAutocomplete(input, box, key, filterFn = null) {
    input.addEventListener('input', () => {
        const val = input.value.trim().toLowerCase();
        if (!val) { box.classList.remove('active'); return; }

        let source = STATE.orders;
        if (filterFn) {
            const filterVal = filterFn();
            if (filterVal) source = source.filter(o => o.product_name === filterVal);
        }

        const unique = [...new Set(source.map(o => o[key]).filter(Boolean))];
        const matches = unique.filter(txt => txt.toLowerCase().includes(val));

        if (matches.length > 0) {
            box.innerHTML = matches.map(txt => {
                const idx = txt.toLowerCase().indexOf(val);
                const pre = txt.substring(0, idx);
                const match = txt.substring(idx, idx + val.length);
                const post = txt.substring(idx + val.length);
                return `<div class="suggestion-item"><span class="icon">🔍</span> ${pre}<span class="match">${match}</span>${post}</div>`;
            }).join('');

            box.querySelectorAll('.suggestion-item').forEach((item, i) => {
                item.onclick = () => {
                    input.value = matches[i];
                    box.classList.remove('active');
                };
            });

            box.classList.add('active');
        } else {
            box.classList.remove('active');
        }
    });

    // Hide on blur (delayed to allow click)
    input.addEventListener('blur', () => setTimeout(() => box.classList.remove('active'), 200));
    input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));
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

    if (order.status === 'Shipped_to_HK') {
        // Direct Action: Open Delivery Modal immediately
        STATE.selectedHkIds.clear();
        STATE.selectedHkIds.add(order.customer_id);
        openHkDeliveryModal();
        return;
    }

    const btnDelivery = document.getElementById('btn-mng-delivery');
    const btnReceipt = document.getElementById('btn-mng-receipt');
    const btnRefund = document.getElementById('btn-mng-refund');
    const btnEdit = document.getElementById('btn-mng-edit');
    const btnDelete = document.getElementById('btn-mng-delete');

    // Normal Context: Show standard actions, hide Delivery Edit
    btnDelivery?.classList.add('hidden');
    btnReceipt?.classList.remove('hidden');
    btnRefund?.classList.remove('hidden');
    btnEdit?.classList.remove('hidden');
    btnDelete?.classList.remove('hidden');

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
