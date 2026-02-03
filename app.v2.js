/**
 * Purchase Manager Global Refactor
 * Rules: Antigravity Global Rules (Layout, Text, Hierarchy)
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbxCoxgLFrRlLehBdcjnLkF8h5-a9NTopYibonQ7E_uTa_ZoIilazv0lWIRXZt7oAzisnA/exec",
    EXCHANGE_API: "https://open.er-api.com/v6/latest/HKD",
    IS_MOCK: false,
    DEFAULT_RATE: 175 // Safe fallback
};

// --- SERVER UTILS ---
async function sendData(payload) {
    if (CONFIG.IS_MOCK) {
        console.log("Mock Send:", payload);
        return new Promise(r => setTimeout(() => r(true), 500));
    }

    // Google Apps Script usually requires 'text/plain' to skip preflight or handle simple requests comfortably
    // And CORS might be an issue. 
    try {
        const res = await fetch(CONFIG.API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.result === 'success' || data.statis === 'success' || data.status === 'success') return true;
        else throw new Error(data.message || "Server Error");
    } catch (e) {
        console.error("Send Failed:", e);
        // If it's a CORS opaque error, we might not get JSON.
        // But assuming the GAS is deployed properly for 'Any user', it should work.
        throw e;
    }
}

const TRANS = {
    ko: {
        btn_new_order: "새 주문 등록하고 시작하기",
        btn_add_product: "+ 상품 추가하기",
        btn_save: "주문 정보 저장하고 목록으로 돌아가기",
        btn_save_changes: "매입 가격 저장하고 발송 대기 상태로 변경",
        btn_shipped: "배송비 저장하고 홍콩으로 발송 처리",
        btn_complete: "배송 정보 저장하고 완료 처리",
        btn_settle: "수익 정산 확정하기",
        status_pending: "매입필요",
        status_ordered: "발송대기",
        status_shipped_to_hk: "배송대기",
        status_completed: "정산대기",
        status_settled: "정산완료",
        status_cancelled: "주문취소"
    },
    cn: {
        btn_new_order: "创建新订单",
        btn_add_product: "+ 添加商品",
        btn_save: "保存订单并返回列表",
        btn_save_changes: "保存采购价并转入发货等待",
        btn_shipped: "保存运费并确认发货",
        btn_complete: "保存派送信息并完成订单",
        btn_settle: "确认结算收益",
        status_pending: "待处理",
        status_ordered: "已采购",
        status_shipped: "已发货",
        status_completed: "已完成",
        status_settled: "已结算"
    }
};

let STATE = {
    orders: [],
    filters: {
        customer: '',
        product: '',
        status: 'All',
        startDate: '',
        endDate: ''
    },
    dashFilters: {
        startDate: '',
        endDate: ''
    },
    auth: null,
    lang: 'ko',
    currencyMode: 'KRW',
    exchangeRate: CONFIG.DEFAULT_RATE,
    selectedTab: 'view-dashboard',
    // Selections
    selectedBatchIds: new Set(),
    selectedKoreaIds: new Set(),
    selectedFinanceIds: new Set(),
    selectedHkIds: new Set(), // Customer IDs

    // Management Selection
    managementTargetId: null,

    // Pagination
    pagination: {
        currentPage: 1,
        itemsPerPage: 10
    }
};

// DOM Map
const dom = {
    authOverlay: document.getElementById('auth-overlay'),
    authCode: document.getElementById('auth-code'),
    btnAuthConfirm: document.getElementById('btn-auth-confirm'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container'),

    // Views
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

    // Lists
    lists: {
        all: document.getElementById('order-list-container'),
        purchase: document.getElementById('purchase-list-container'),
        korea: document.getElementById('korea-list-container'),
        hk: document.getElementById('hongkong-list-container'),
        finance: document.getElementById('finance-list-container')
    },

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

    // Modals & Actions
    modals: {
        purchase: document.getElementById('purchase-modal'),
        korea: document.getElementById('korea-modal'),
        hk: document.getElementById('hk-modal'),
        settlement: document.getElementById('settlement-modal'),
        list: document.getElementById('list-modal')
    },

    // Modal Inputs & Buttons
    modalInpKrw: document.getElementById('modal-inp-krw'),
    purchaseItemName: document.getElementById('purchase-item-name'),
    btnSaveCost: document.getElementById('btn-save-cost'),
    btnSaveCost: document.getElementById('btn-save-cost'),
    // btnCloseModal Removed

    inpShipTotal: document.getElementById('inp-ship-total'),
    btnSaveKorea: document.getElementById('btn-save-korea'),
    btnSaveKorea: document.getElementById('btn-save-korea'),
    // btnCloseKorea Removed

    inpTracking: document.getElementById('inp-tracking'),
    inpLocalFee: document.getElementById('inp-local-fee'),
    selDeliveryMethod: document.getElementById('sel-delivery-method'),
    // HK Revamp Elements
    hkCustomerInfo: document.getElementById('hk-customer-info'),
    hkItemList: document.getElementById('hk-item-list'),
    inpHkAddress: document.getElementById('inp-hk-address'),

    btnSaveHk: document.getElementById('btn-save-hk'),
    // btnCloseHk Removed

    inpSettleTotal: document.getElementById('inp-settle-total'),
    btnSaveSettle: document.getElementById('btn-save-settle'),
    inpSettleTotal: document.getElementById('inp-settle-total'),
    btnSaveSettle: document.getElementById('btn-save-settle'),
    // btnCloseSettle Removed

    // Settings
    btnLangKo: document.getElementById('btn-lang-ko'),
    btnLangCn: document.getElementById('btn-lang-cn'),
    btnCurrKrw: document.getElementById('btn-curr-krw'),
    btnCurrHkd: document.getElementById('btn-curr-hkd'),
    btnRefreshManual: document.getElementById('btn-refresh-manual'),

    // FABs / Global Actions
    btnFabRegister: document.getElementById('fab-add'),
    mngSheet: {
        container: document.getElementById('order-management-sheet'),
        btnEdit: document.getElementById('btn-mng-edit'),
        btnReceipt: document.getElementById('btn-mng-receipt'),
        btnRefund: document.getElementById('btn-mng-refund'),
        btnDelete: document.getElementById('btn-mng-delete')
    },
    actions: {
        purchase: document.getElementById('action-bar-purchase'),
        korea: document.getElementById('action-bar-korea'),
        hk: document.getElementById('action-bar-hongkong'),
        finance: document.getElementById('action-bar-finance')
    },
    bulkBtns: {
        purchase: document.getElementById('btn-bulk-purchase'),
        korea: document.getElementById('btn-bulk-korea'),
        hk: document.getElementById('btn-bulk-hk'),
        settle: document.getElementById('btn-bulk-settle')
    },
    receipt: {
        modal: document.getElementById('receipt-modal'),
        paper: document.getElementById('receipt-paper'),
        date: document.getElementById('rcpt-date'),
        id: document.getElementById('rcpt-id'),
        items: document.getElementById('rcpt-items'),
        total: document.getElementById('rcpt-total'),
        btnClose: document.getElementById('btn-close-receipt')
    }
};

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Antigravity Refactor Init');
    if (STATE.auth) loadData();
    else dom.authOverlay.style.display = 'flex';

    setupEvents();
});

function setupEvents() {
    // Auth
    dom.btnAuthConfirm.onclick = attemptAuth;
    dom.authCode.addEventListener('keyup', (e) => { if (e.key === 'Enter') attemptAuth(); });

    // Nav
    dom.navItems.forEach(btn => {
        btn.onclick = () => navigate(btn.dataset.target);
    });

    // Form
    dom.btnFabRegister.onclick = () => openForm();
    dom.form.btnSave.onclick = saveOrder;
    dom.form.btnClose.onclick = () => navigate('view-list');

    // Help Button
    const btnHelp = document.getElementById('btn-form-help');
    if (btnHelp) btnHelp.onclick = () => alert("💡 상품 카드를 꾹 누르면 추가/복사/삭제 메뉴가 나타납니다.");

    // Modals (Purchase)
    // Modals (Purchase)
    dom.btnSaveCost.onclick = savePurchaseCost;
    // Close handled by global dismiss
    // Bulk Button triggers Modal
    dom.bulkBtns.purchase.onclick = () => {
        if (STATE.selectedBatchIds.size === 0) return alert("상품을 선택해주세요");
        dom.modals.purchase.classList.remove('hidden');
        dom.modalInpKrw.value = '';
        dom.modalInpKrw.focus();
        // Update Title or Hint
        const title = dom.modals.purchase.querySelector('h3') || dom.modals.purchase.querySelector('.modal-title');
        if (title) title.innerText = `일괄 매입 처리 (${STATE.selectedBatchIds.size}개)`;
    };

    // Modals (Korea)
    // Modals (Korea)
    dom.btnSaveKorea.onclick = saveKoreaShipping;
    // Close handled by global dismiss
    dom.bulkBtns.korea.onclick = () => {
        if (STATE.selectedKoreaIds.size === 0) return alert("발송할 상품을 선택해주세요");
        dom.modals.korea.classList.remove('hidden');
        dom.inpShipTotal.value = '';
        dom.inpShipTotal.focus();
        // Update Title
        const title = dom.modals.korea.querySelector('h3');
        if (title) title.innerText = `일괄 배송 처리 (${STATE.selectedKoreaIds.size}개) - 배송비(HKD) 입력`;
    };

    // Modals (HK)
    // Modals (HK)
    dom.btnSaveHk.onclick = saveHongKongDelivery;
    // Close handled by global dismiss
    dom.bulkBtns.hk.onclick = saveBulkHongKongDelivery;

    // Modals (Settlement)
    // Modals (Settlement)
    dom.btnSaveSettle.onclick = saveBulkSettlement;
    // Close handled by global dismiss
    dom.bulkBtns.settle.onclick = openSettlementModal;

    // Filter Bindings (Order List)
    document.getElementById('filter-customer').oninput = (e) => { STATE.filters.customer = e.target.value; renderOrderList(); };
    document.getElementById('filter-product').oninput = (e) => { STATE.filters.product = e.target.value; renderOrderList(); };
    document.getElementById('filter-status').onchange = (e) => { STATE.filters.status = e.target.value; renderOrderList(); };
    document.getElementById('filter-date-start').onchange = (e) => { STATE.filters.startDate = e.target.value; renderOrderList(); };
    document.getElementById('filter-date-end').onchange = (e) => { STATE.filters.endDate = e.target.value; renderOrderList(); };

    // HK Delivery Search
    const searchHk = document.getElementById('inp-search-hk');
    if (searchHk) searchHk.oninput = renderHongKongList;

    // Filter Buttons

    // Filter Buttons
    document.getElementById('btn-period-today').onclick = () => setDateFilter(0);
    document.getElementById('btn-period-week').onclick = () => setDateFilter(7);
    document.getElementById('btn-period-month').onclick = () => setDateFilter(30);
    document.getElementById('btn-filter-reset').onclick = resetFilters;

    // Dashboard Filter Bindings
    document.getElementById('dash-date-start').onchange = (e) => { STATE.dashFilters.startDate = e.target.value; renderDashboard(); };
    document.getElementById('dash-date-end').onchange = (e) => { STATE.dashFilters.endDate = e.target.value; renderDashboard(); };
    document.getElementById('btn-dash-today').onclick = () => setDashDateFilter(0);
    document.getElementById('btn-dash-week').onclick = () => setDashDateFilter(7);
    document.getElementById('btn-dash-month').onclick = () => setDashDateFilter(30);
    document.getElementById('btn-dash-reset').onclick = () => {
        STATE.dashFilters.startDate = ''; STATE.dashFilters.endDate = '';
        document.getElementById('dash-date-start').value = '';
        document.getElementById('dash-date-end').value = '';
        renderDashboard();
    };

    // Settings
    dom.btnLangKo.onclick = () => setLang('ko');
    dom.btnLangCn.onclick = () => setLang('cn');
    dom.btnCurrKrw.onclick = () => setCurrency('KRW');
    dom.btnCurrHkd.onclick = () => setCurrency('HKD');
    dom.btnRefreshManual.onclick = loadData;

    // Exchange Rate
    const rateInput = document.getElementById('inp-exchange-rate');
    const rateBtn = document.getElementById('btn-fetch-rate');
    if (rateInput) {
        rateInput.value = STATE.exchangeRate;
        rateInput.onchange = (e) => {
            const val = Number(e.target.value);
            if (val > 0) {
                STATE.exchangeRate = val;
                renderDashboard();
                showToast(`환율이 ${val}원으로 설정되었습니다`);
            }
        };
    }
    if (rateBtn) rateBtn.onclick = fetchExchangeRate;

    // Detail List
    const btnDateGo = document.getElementById('btn-date-go');
    if (btnDateGo) btnDateGo.onclick = renderDashboard;

    // Receipt Close
    if (dom.receipt.btnClose) dom.receipt.btnClose.onclick = () => dom.receipt.modal.classList.add('hidden');
    // Long Press Receipt to Save
    if (dom.receipt.paper) {
        let rcptTimer;
        const startSave = () => {
            dom.receipt.paper.classList.add('saving');
            rcptTimer = setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate([50, 50, 50]);

                // Real Image Save with html2canvas
                html2canvas(dom.receipt.paper, { scale: 2, useCORS: true }).then(canvas => {
                    const link = document.createElement('a');
                    link.download = `Receipt_${new Date().toISOString().slice(0, 10)}.png`;
                    link.href = canvas.toDataURL("image/png");
                    link.click();
                    alert("🖼️ 영수증이 저장되었습니다!");
                }).catch(err => {
                    console.error(err);
                    alert("저장 실패: " + err.message);
                });

                dom.receipt.paper.classList.remove('saving');
            }, 800);
        };
        const endSave = () => {
            clearTimeout(rcptTimer);
            dom.receipt.paper.classList.remove('saving');
        };
        dom.receipt.paper.addEventListener('touchstart', startSave);
        dom.receipt.paper.addEventListener('touchend', endSave);
        dom.receipt.paper.addEventListener('touchmove', endSave);
        dom.receipt.paper.addEventListener('mousedown', startSave);
        dom.receipt.paper.addEventListener('mouseup', endSave);
        dom.receipt.paper.addEventListener('mouseleave', endSave);
    }

    // Global Dismissal (Clicking background to exit Management Mode OR Modals)
    document.addEventListener('click', (e) => {
        // 1. Management Sheet Dismissal
        if (!dom.mngSheet.container.classList.contains('hidden')) {
            const isSheet = dom.mngSheet.container.contains(e.target);
            const isCard = e.target.closest('.card') && e.target.closest('.card').getAttribute('data-id') === STATE.managementTargetId;
            if (!isSheet && !isCard) {
                exitManagementMode();
            }
        }

        // 2. Generic Modal Dismissal (Clicking Overlay)
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });

    // Management Sheet Events
    if (dom.mngSheet.btnEdit) dom.mngSheet.btnEdit.onclick = () => {
        const order = getManagementOrder();
        if (order) openForm(order);
        exitManagementMode();
    };
    if (dom.mngSheet.btnReceipt) dom.mngSheet.btnReceipt.onclick = () => {
        const order = getManagementOrder();
        if (order) {
            showReceipt(order);
        }
        exitManagementMode();
    };
    if (dom.mngSheet.btnRefund) dom.mngSheet.btnRefund.onclick = () => {
        const order = getManagementOrder();
        if (order && confirm("환불 처리하고 주문 취소하시겠습니까?")) {
            order.status = 'Cancelled'; // Update local state for visual
            renderOrderList();
            alert("환불 처리되었습니다.");
        }
        exitManagementMode();
    };
    if (dom.mngSheet.btnDelete) dom.mngSheet.btnDelete.onclick = () => {
        const order = getManagementOrder();
        if (order && confirm("정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
            // Delete Logic
            STATE.orders = STATE.orders.filter(o => o.order_id !== order.order_id);
            renderOrderList();
            alert("삭제되었습니다.");
        }
        exitManagementMode();
    };

    dom.btnFabRegister.onclick = () => {
        exitManagementMode();
        openForm();
    };
}

// ENTRY POINT
async function init() {
    showLoading();
    try {
        await fetchExchangeRate(); // Get Rate Immediately
    } catch (e) {
        console.error("Exchange rate init failed", e);
    }

    // Check if we have a stored auth or just show auth screen
    // For now, straightforward: Hide loading, show Auth Overlay (which is default visible in HTML?)
    // Actually, HTML usually has main content hidden or overlay on top.

    // If Auth Overlay is visible by default in HTML, we just need to hide the loading spinner.
    hideLoading();

    // If we want to auto-login (optional feature not yet requested), we'd do it here.
}


// ================= LOGIC =================
async function attemptAuth() {
    if (!dom.authCode.value) return alert("인증코드를 입력해주세요");

    showLoading(); // Show spinner while checking
    STATE.auth = dom.authCode.value;

    // Try to load data to verify auth
    await loadData();
}

async function loadData() {
    showLoading();
    // Refresh Exchange Rate on manual load
    fetchExchangeRate();
    try {
        const res = await fetch(CONFIG.API_URL + '?t=' + Date.now(), {
            method: 'POST',
            body: JSON.stringify({ action: 'getOrders', auth: STATE.auth })
        });
        const json = await res.json();
        if (json.success) {
            STATE.orders = json.data;
            dom.authOverlay.style.display = 'none'; // Explicitly hide Auth Overlay
            renderDashboard();
            if (STATE.selectedTab !== 'view-dashboard') navigate(STATE.selectedTab);
        } else {
            alert(json.message);
        }
    } catch (e) {
        console.error(e);
        showToast("데이터 로드 실패");
    } finally { hideLoading(); }
}

async function sendBatchUpdate(updates) {
    if (CONFIG.IS_MOCK) return;
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'updateOrders', auth: STATE.auth, data: updates })
    });
    return await res.json();
}

// ================= RENDERING =================
function navigate(targetId) {
    STATE.selectedTab = targetId;
    STATE.pagination.currentPage = 1; // Reset pagination on tab switch
    dom.sections.forEach(s => s.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    dom.navItems.forEach(n => n.classList.toggle('active', n.dataset.target === targetId));

    if (targetId === 'view-dashboard') renderDashboard();
    if (targetId === 'view-list') renderOrderList();
    if (targetId === 'view-purchase') renderPurchaseList();
    if (targetId === 'view-korea') renderKoreaList();
    if (targetId === 'view-hongkong') renderHongKongList();
    if (targetId === 'view-finance') renderFinanceList();
}

function renderDashboard() {
    // Calc Metrics
    let profit = 0, revenue = 0, cost = 0;

    const f = STATE.dashFilters;
    // Filter by Date for Metrics
    const filteredOrders = STATE.orders.filter(o => {
        if (o.status === 'Cancelled') return false;
        if (f.startDate || f.endDate) {
            const d = o.order_date;
            if (f.startDate && d < f.startDate) return false;
            if (f.endDate && d > f.endDate) return false;
        }
        return true;
    });

    const pending = STATE.orders.filter(o => o.status === 'Pending').length;
    const ordered = STATE.orders.filter(o => o.status === 'Ordered').length;
    const shipped = STATE.orders.filter(o => o.status === 'Shipped_to_HK').length;
    const completed = STATE.orders.filter(o => o.status === 'Completed').length;

    filteredOrders.forEach(o => {
        // Metrics only for SETTLED (Completed) orders
        if (o.status === 'Settled') {
            const p = Number(o.price_hkd) || 0; // Revenue (HKD
            const c = Number(o.cost_krw) || 0; // Purchase Cost (KRW)
            const s_hkd = Number(o.ship_fee_krw) || 0; // Ship Fee (Stored in KRW col, but Value is HKD)
            const l_hkd = Number(o.local_fee_hkd) || 0; // Local Fee (HKD)

            revenue += p; // HKD Revenue
            cost += c;    // KRW Cost (Purchase only)

            const rate = STATE.exchangeRate;

            // Profit Calculation
            if (STATE.currencyMode === 'KRW') {
                const income_krw = p * rate;
                // Expenses: c (KRW) + s_hkd (HKD->KRW) + l_hkd (HKD->KRW)
                const expense_krw = c + (s_hkd * rate) + (l_hkd * rate);
                profit += (income_krw - expense_krw);
            } else {
                // Profit in HKD
                const cost_hkd = c / rate;
                profit += (p - cost_hkd - s_hkd - l_hkd);
            }
        }
    });

    // Update UI
    dom.statProfit.textContent = Math.round(profit).toLocaleString();
    dom.statRevenue.textContent = revenue.toLocaleString(); // HKD
    dom.statCost.textContent = Math.round(cost).toLocaleString(); // KRW

    // Badges stay total count
    dom.badges.pending.textContent = pending;
    dom.badges.ordered.textContent = ordered;
    dom.badges.shippedKr.textContent = shipped;
    dom.badges.completed.textContent = completed;

    // Toggle Label Update
    const label = document.getElementById('label-curr-mode');
    if (label) label.textContent = STATE.currencyMode;

    // Render Profit Breakdown List
    const profitContainer = document.getElementById('dashboard-profit-list');
    profitContainer.innerHTML = ''; // Clear

    filteredOrders.forEach(o => {
        if (o.status === 'Settled') {
            const el = document.createElement('div');
            el.className = 'card';
            el.style.marginBottom = '10px';
            el.style.borderLeft = '4px solid #10b981'; // Green accent for profit

            const p = Number(o.price_hkd) || 0;
            const c = Number(o.cost_krw) || 0;
            const s_hkd = Number(o.ship_fee_krw) || 0; // Value is HKD
            const l_hkd = Number(o.local_fee_hkd) || 0;
            const rate = STATE.exchangeRate;

            // Individual Calc
            let profitVal = 0;
            if (STATE.currencyMode === 'KRW') {
                const income_krw = p * rate;
                // Cost (KRW) + Ship(HKD->KRW) + Local(HKD->KRW)
                const expense_krw = c + (s_hkd * rate) + (l_hkd * rate);
                profitVal = income_krw - expense_krw;
            } else {
                const cost_hkd = c / rate;
                profitVal = p - cost_hkd - s_hkd - l_hkd;
            }

            el.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-weight:600; font-size:14px; margin-bottom:4px;">
                    <span>${o.product_name}</span>
                    <span style="color:${profitVal > 0 ? '#10b981' : '#ef4444'}">${Math.round(profitVal).toLocaleString()} ${STATE.currencyMode}</span>
                </div>
                <div style="font-size:11px; color:#64748b; display:flex; flex-direction:column; gap:2px;">
                    <div>매출: HKD ${p.toLocaleString()}</div>
                    <div>비용: KRW ${c.toLocaleString()} (상품) + HKD ${s_hkd.toLocaleString()} (배대지) + HKD ${l_hkd.toLocaleString()} (현지)</div>
                    <div>(환율 적용: ${rate.toFixed(2)})</div>
                </div>
            `;
            profitContainer.appendChild(el);
        }
    });

}

function toggleCurrencyMode() {
    STATE.currencyMode = STATE.currencyMode === 'KRW' ? 'HKD' : 'KRW';
    // dom.btnCurrKrw... logic removed as buttons are gone
    renderDashboard();
}

// --- GENERIC LIST RENDERER ---
function createCard(o, onClick) {
    const el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('data-id', o.order_id);

    // Interaction: 0.5s Long Press -> Management Mode
    let pressTimer;
    let isPressing = false;

    const startPress = (e) => {
        isPressing = true;
        pressTimer = setTimeout(() => {
            if (isPressing) {
                enterManagementMode(o.order_id);
                isPressing = false;
            }
        }, 500);
    };

    const cancelPress = () => {
        isPressing = false;
        clearTimeout(pressTimer);
    };

    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchend', cancelPress);
    el.addEventListener('touchmove', cancelPress);
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);

    // Short Click (Enabled for Selection)
    el.onclick = (e) => {
        // Prevent if clicking checkbox directly (handled by its own event)
        if (e.target.type === 'checkbox') return;
        if (onClick) onClick();
    };

    const rate = STATE.exchangeRate;
    const p = Number(o.price_hkd) || 0;
    const c = Number(o.cost_krw) || 0;

    const statusText = TRANS[STATE.lang][`status_${o.status.toLowerCase()}`] || o.status;

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${o.product_name}</span>
            <span class="badge ${o.status.toLowerCase()}">${statusText}</span>
        </div>
        <div class="card-subtitle" style="color:#64748b; font-size:13px;">${o.customer_id} | ${o.option} (x${o.qty})</div>
        <div class="card-details">
            <span>HKD ${p}</span>
            <span style="color:#94a3b8">${o.order_date}</span>
        </div>
    `;
    return el;
}

// Helper for Date Filter
function setDateFilter(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    // Format YYYY-MM-DD
    const fmt = (d) => d.toISOString().split('T')[0];

    STATE.filters.startDate = fmt(start);
    STATE.filters.endDate = fmt(end);

    document.getElementById('filter-date-start').value = STATE.filters.startDate;
    document.getElementById('filter-date-end').value = STATE.filters.endDate;
    document.getElementById('filter-date-end').value = STATE.filters.endDate;
    renderOrderList();
}

function setDashDateFilter(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    const fmt = (d) => d.toISOString().split('T')[0];
    STATE.dashFilters.startDate = fmt(start);
    STATE.dashFilters.endDate = fmt(end);
    document.getElementById('dash-date-start').value = STATE.dashFilters.startDate;
    document.getElementById('dash-date-end').value = STATE.dashFilters.endDate;
    renderDashboard();
}

function resetFilters() {
    STATE.filters = { customer: '', product: '', status: 'All', startDate: '', endDate: '' };
    document.getElementById('filter-customer').value = '';
    document.getElementById('filter-product').value = '';
    document.getElementById('filter-status').value = 'All';
    document.getElementById('filter-date-start').value = '';
    document.getElementById('filter-date-end').value = '';
    renderOrderList();
}

function renderOrderList() {
    dom.lists.all.innerHTML = '';

    // Apply Advanced Filters
    const f = STATE.filters;
    const filtered = STATE.orders.filter(o => {
        // Customer
        if (f.customer && !o.customer_id.toLowerCase().includes(f.customer.toLowerCase())) return false;
        // Product
        if (f.product && !o.product_name.toLowerCase().includes(f.product.toLowerCase())) return false;
        // Status
        if (f.status !== 'All' && o.status !== f.status) return false;
        // Date
        if (f.startDate || f.endDate) {
            // Assume o.order_date is YYYY-MM-DD
            const d = o.order_date;
            if (f.startDate && d < f.startDate) return false;
            if (f.endDate && d > f.endDate) return false;
        }
        return true;
    });

    const items = filtered.sort((a, b) => b.order_id.localeCompare(a.order_id));

    // Pagination
    const totalItems = items.length;
    renderPaginationControls(dom.lists.all, totalItems, renderOrderList);

    const { currentPage, itemsPerPage } = STATE.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const displayItems = items.slice(start, start + itemsPerPage);

    displayItems.forEach(o => {
        dom.lists.all.appendChild(createCard(o, null));
    });
}

function renderPurchaseList() {
    dom.lists.purchase.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Pending');
    updateGlobalAction('purchase', STATE.selectedBatchIds.size);

    // Pagination
    const totalItems = items.length;
    renderPaginationControls(dom.lists.purchase, totalItems, renderPurchaseList);

    const { currentPage, itemsPerPage } = STATE.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const displayItems = items.slice(start, start + itemsPerPage);

    displayItems.forEach(o => {
        const isSelected = STATE.selectedBatchIds.has(o.order_id);
        const toggle = () => {
            if (STATE.selectedBatchIds.has(o.order_id)) STATE.selectedBatchIds.delete(o.order_id);
            else STATE.selectedBatchIds.add(o.order_id);
            renderPurchaseList(); // Re-render to update UI
        };

        const card = createCard(o, toggle);
        if (isSelected) card.classList.add('selected-glow'); // Reusing Glow style

        const chk = createCheckbox(o.order_id, STATE.selectedBatchIds, () => {
            renderPurchaseList();
        });

        // Prevent checkbox double-toggle issues if card click also toggles
        // The createCard click handler filters out checkbox clicks

        card.prepend(chk);
        dom.lists.purchase.appendChild(card);
    });

};

function renderKoreaList() {
    dom.lists.korea.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Ordered');
    updateGlobalAction('korea', STATE.selectedKoreaIds.size);

    // Pagination
    const totalItems = items.length;
    renderPaginationControls(dom.lists.korea, totalItems, renderKoreaList);

    const { currentPage, itemsPerPage } = STATE.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const displayItems = items.slice(start, start + itemsPerPage);

    displayItems.forEach(o => {
        const card = createCard(o, () => openKoreaModal(o));
        const isSelected = STATE.selectedKoreaIds.has(o.order_id);
        if (isSelected) card.classList.add('selected-glow');

        // Checkbox logic
        const toggle = () => {
            if (STATE.selectedKoreaIds.has(o.order_id)) STATE.selectedKoreaIds.delete(o.order_id);
            else STATE.selectedKoreaIds.add(o.order_id);
            renderKoreaList();
        };

        const chk = createCheckbox(o.order_id, STATE.selectedKoreaIds, () => renderKoreaList());

        // Override Click to Toggle
        card.onclick = (e) => {
            if (e.target.type === 'checkbox') return;
            toggle();
        };

        card.prepend(chk);
        dom.lists.korea.appendChild(card);
    });

};

function renderHongKongList() {
    dom.lists.hk.innerHTML = '';
    const search = document.getElementById('inp-search-hk').value.toLowerCase();
    const items = STATE.orders.filter(o =>
        o.status === 'Shipped_to_HK' &&
        o.customer_id.toLowerCase().includes(search)
    );
    updateGlobalAction('hk', STATE.selectedHkIds.size);

    // Group by Customer
    const grouped = {};
    items.forEach(o => {
        if (!grouped[o.customer_id]) grouped[o.customer_id] = [];
        grouped[o.customer_id].push(o);
    });

    const customerIds = Object.keys(grouped);
    // Pagination for Groups
    const totalItems = customerIds.length;
    renderPaginationControls(dom.lists.hk, totalItems, renderHongKongList);

    const { currentPage, itemsPerPage } = STATE.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const displayIds = customerIds.slice(start, start + itemsPerPage);

    displayIds.forEach(customerId => {
        const group = grouped[customerId];
        const card = createCustomerGroupCard(customerId, group);
        dom.lists.hk.appendChild(card);
    });

};

function createCustomerGroupCard(customerId, group) {
    const el = document.createElement('div');
    el.className = 'card';
    const isSelected = STATE.selectedHkIds.has(customerId);
    if (isSelected) el.classList.add('selected-glow');

    // Logic: Short Click -> Toggle Select. Long Press -> Open Modal.
    let pressTimer;
    let isPressing = false;

    const startPress = () => {
        isPressing = true;
        pressTimer = setTimeout(() => {
            if (isPressing) {
                openHkModal(group); // Open Detail/Edit Modal
                isPressing = false;
            }
        }, 500);
    };

    const cancelPress = () => {
        isPressing = false;
        clearTimeout(pressTimer);
    };

    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchend', cancelPress);
    el.addEventListener('touchmove', cancelPress);
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);

    el.onclick = () => {
        if (STATE.selectedHkIds.has(customerId)) STATE.selectedHkIds.delete(customerId);
        else STATE.selectedHkIds.add(customerId);
        renderHongKongList(); // Re-render to update UI (Glow & Bar)
    };

    const count = group.length;
    const names = group.map(o => o.product_name).join(', ');
    const preview = names.length > 20 ? names.substring(0, 20) + '...' : names;

    // Address Check
    const hasAddress = group.some(o => o.address && o.address.length > 0);
    const addrStatus = hasAddress
        ? `<span style="color:#10b981;">배송 정보 준비됨</span>`
        : `<span style="color:#ef4444;">배송 정보 입력 필요 ></span>`;

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${customerId}</span>
            <span class="badge shipped_to_hk">${count}건</span>
        </div>
        <div class="card-subtitle" style="color:#64748b; font-size:13px;">${preview}</div>
        <div class="card-details" style="display:flex; justify-content:space-between; align-items:center;">
            ${addrStatus}
        </div>
    `;
    return el;
}

function renderFinanceList() {
    dom.lists.finance.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Settled'); // Correct status?
    updateGlobalAction('finance', STATE.selectedFinanceIds.size);

    // Pagination
    const totalItems = items.length;
    renderPaginationControls(dom.lists.finance, totalItems, renderFinanceList);

    const { currentPage, itemsPerPage } = STATE.pagination;
    const start = (currentPage - 1) * itemsPerPage;
    const displayItems = items.slice(start, start + itemsPerPage);

    displayItems.forEach(o => {
        const card = createCard(o, null);
        const isSelected = STATE.selectedFinanceIds.has(o.order_id);
        if (isSelected) card.classList.add('selected-glow');

        // Toggle Selection on Click
        card.onclick = () => {
            if (STATE.selectedFinanceIds.has(o.order_id)) STATE.selectedFinanceIds.delete(o.order_id);
            else STATE.selectedFinanceIds.add(o.order_id);
            renderFinanceList();
        };

        // Show Profit logic
        const p = Number(o.price_hkd) * STATE.exchangeRate;
        const c = Number(o.cost_krw) + (Number(o.ship_fee_krw || 0) * STATE.exchangeRate);
        const prof = p - c;
        const div = document.createElement('div');
        div.style.fontSize = '12px'; div.style.color = prof > 0 ? '#10b981' : '#ef4444';
        div.textContent = `Profit: ${Math.round(prof).toLocaleString()}`;
        card.appendChild(div);

        dom.lists.finance.appendChild(card);
    });
}

// --- UTILS ---
function createCheckbox(id, set, callback) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '10px';
    const inp = document.createElement('input');
    inp.type = 'checkbox';
    inp.className = 'custom-checkbox'; // Ensure CSS class exists or styling
    inp.checked = set.has(id);
    inp.onchange = (e) => {
        if (e.target.checked) set.add(id); else set.delete(id);
        if (callback) callback();
    };
    wrap.appendChild(inp);
    return wrap;
}

function enterManagementMode(orderId) {
    if (navigator.vibrate) navigator.vibrate(50);
    STATE.managementTargetId = orderId;

    // Visual Feedback
    document.querySelectorAll('.card').forEach(c => {
        c.classList.toggle('selected-glow', c.getAttribute('data-id') === orderId);
    });

    dom.mngSheet.container.classList.remove('hidden'); // Show Sheet (Slide Up)
    dom.btnFabRegister.classList.add('hidden'); // Hide FAB
}

function exitManagementMode() {
    STATE.managementTargetId = null;
    document.querySelectorAll('.card').forEach(c => c.classList.remove('selected-glow'));
    dom.mngSheet.container.classList.add('hidden');
    dom.btnFabRegister.classList.remove('hidden');
}

function updateGlobalAction(type, count) {
    // Only show if items selected? Or show always but disabled?
    // Antigravity Rule: Bottom Button visible.
    // For Purchase: "Select items to purchase" or button acts on ALL? 
    // Let's hide if 0 selected for safety.
    const bar = dom.actions[type];
    if (!bar) return;

    if (type === 'purchase') {
        // Logic: If selections > 0, show "Purchase Selected". If 0, show nothing?
        // Refactor: Just show items.
        const selected = STATE.selectedBatchIds.size;
        bar.classList.toggle('hidden', selected === 0);
        dom.bulkBtns.purchase.textContent = `${selected}개 매입 확정하기`;
    }
    if (type === 'finance') {
        const selected = STATE.selectedFinanceIds.size;
        bar.classList.toggle('hidden', selected === 0);
        dom.bulkBtns.settle.textContent = `${selected}건 정산 실행하기`;
    }
    if (type === 'korea') {
        const selected = STATE.selectedKoreaIds.size;
        bar.classList.toggle('hidden', selected === 0);
        dom.bulkBtns.korea.textContent = `${selected}건 발송 처리하기`;
    }
    if (type === 'hk') {
        const selected = STATE.selectedHkIds.size;
        bar.classList.toggle('hidden', selected === 0);
        dom.bulkBtns.hk.textContent = `${selected}명 배송 완료 처리하기`;
    }
}

// ================= ACTIONS =================
// 1. FORM
function openForm(order = null) {
    navigate('view-form');

    const titleEl = document.querySelector('#view-form .section-title');

    // Reset or Fill
    if (order) {
        if (titleEl) titleEl.textContent = "기존 주문 수정"; // Update Title
        dom.form.id.value = order.order_id;
        dom.form.customer.value = order.customer_id;
        dom.form.date.value = order.order_date;
        dom.form.address.value = order.address || ''; // Assuming address exists
        dom.form.remarks.value = order.remarks || '';

        dom.form.container.innerHTML = '';

        // Populate Rows
        // Assuming 'order' structure holds single product for now based on createCard
        // If it was a multi-row order, data should be array. 
        // Adapting to current structure:
        const data = {
            product: order.product_name,
            qty: order.qty,
            price: order.price_hkd,
            option: order.option
        };
        addProductRow(data);
        updateEmptyState();

    } else {
        if (titleEl) titleEl.textContent = "새 주문 작성"; // Reset Title
        dom.form.id.value = '';
        dom.form.customer.value = '';
        dom.form.date.value = new Date().toISOString().split('T')[0];
        dom.form.address.value = '';
        dom.form.remarks.value = '';
        dom.form.container.innerHTML = '';

        // Ensure at least one row exists immediately
        addProductRow();
        updateEmptyState();
    }
}

function updateEmptyState() {
    // Fallback: If container is empty, show a dedicated "Add First Product" button
    // This handles the case where the user somehow deleted everything or init failed
    const container = dom.form.container;
    let emptyMsg = document.getElementById('empty-msg-placeholder');

    if (container.children.length === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.id = 'empty-msg-placeholder';
            emptyMsg.style.textAlign = 'center';
            emptyMsg.style.padding = '30px';
            emptyMsg.style.background = '#f1f5f9';
            emptyMsg.style.borderRadius = '12px';
            emptyMsg.style.margin = '10px 0';
            emptyMsg.style.cursor = 'pointer';
            emptyMsg.innerHTML = '<span style="font-size:24px;">➕</span><br><br><span style="color:#64748b; font-weight:600;">새 상품 추가하기</span>';
            emptyMsg.onclick = () => addProductRow();
            container.parentNode.insertBefore(emptyMsg, container.nextSibling); // Insert after container
        }
        emptyMsg.style.display = 'block';
    } else {
        if (emptyMsg) emptyMsg.style.display = 'none';
    }
}

// --- PRODUCT ROW & LONG PRESS ---
let longPressTimer;
let currentLongPressRow = null;

function addProductRow(data = null) {
    const row = document.createElement('div');
    row.className = 'product-card';

    // Inputs (Simplified for Card Look)
    row.innerHTML = `
        <div style="margin-bottom:12px;">
            <label style="font-size:12px; color:#64748b; font-weight:600;">상품명 <span style="color:#ef4444">*</span></label>
            <input class="form-input inp-product" list="list-products" placeholder="상품명 검색 또는 입력" value="${data ? data.product : ''}" style="margin-top:4px;">
        </div>
        <div class="row">
            <div style="flex:1;">
                <label style="font-size:12px; color:#64748b; font-weight:600;">수량 <span style="color:#ef4444">*</span></label>
                <input class="form-input inp-qty" type="number" placeholder="1" value="${data ? data.qty : '1'}" style="margin-top:4px;">
            </div>
            <div style="flex:1;">
                <label style="font-size:12px; color:#64748b; font-weight:600;">단가 (HKD)</label>
                <input class="form-input inp-price" type="number" placeholder="0" value="${data ? data.price : ''}" style="margin-top:4px;">
            </div>
        </div>
        <div style="margin-top:12px;">
             <label style="font-size:12px; color:#64748b; font-weight:600;">옵션/사이즈 <span style="color:#ef4444">*</span></label>
             <input class="form-input inp-option" list="list-options-${Date.now()}-${Math.random()}" placeholder="옵션 정보" value="${data ? data.option : ''}" style="margin-top:4px;">
             <datalist id="list-options-${Date.now()}-${Math.random()}"></datalist>
        </div>
    `;

    // Autocomplete Logic
    const inpProd = row.querySelector('.inp-product');
    const inpOpt = row.querySelector('.inp-option');
    const dlOpt = row.querySelector('datalist'); // The specific datalist for this row

    // Product Autocomplete (Global List - ensure it exists in DOM or create once)
    if (!document.getElementById('list-products')) {
        const dl = document.createElement('datalist');
        dl.id = 'list-products';
        document.body.appendChild(dl);
    }
    updateProductDatalist();

    // Option Autocomplete (Context Aware)
    const handleOptionUpdate = () => {
        const prodName = inpProd.value.trim();
        updateOptionDatalist(dlOpt, prodName);
    };

    inpProd.addEventListener('input', handleOptionUpdate);
    inpProd.addEventListener('change', handleOptionUpdate); // Also on change (blur)

    // CRITICAL: Update when Option field is focused too!
    inpOpt.addEventListener('focus', handleOptionUpdate);

    // Init Option list if data exists
    if (data && data.product) {
        handleOptionUpdate();
    }

    // Also update generic product list on focus to ensure latest
    inpProd.addEventListener('focus', updateProductDatalist);

    // Long Press Events
    const startPress = (e) => {
        // Ignore if clicking inputs directly? No, user might want to long press anywhere on card
        if (e.target.tagName === 'INPUT') return;

        row.classList.add('pressing');
        longPressTimer = setTimeout(() => {
            openProductActionSheet(row);
        }, 600); // 600ms long press
    };

    const cancelPress = () => {
        clearTimeout(longPressTimer);
        row.classList.remove('pressing');
    };

    row.addEventListener('touchstart', startPress, { passive: true });
    row.addEventListener('touchend', cancelPress);
    row.addEventListener('touchmove', cancelPress);

    row.addEventListener('mousedown', startPress);
    row.addEventListener('mouseup', cancelPress);
    row.addEventListener('mouseleave', cancelPress);

    dom.form.container.appendChild(row);
    updateEmptyState();
}

function removeLastProductRow() {
    // Redundant if we have Context Menu delete, but keeping for safety if called elsewhere
    const rows = dom.form.container.children;
    if (rows.length > 0) { // Allow deleting last one if we have empty state
        rows[rows.length - 1].remove();
        showToast("상품이 삭제되었습니다");
    }
    updateEmptyState();
}

function showReceipt(order) {
    if (!order) return;

    dom.receipt.date.textContent = order.order_date;
    dom.receipt.id.textContent = `ORDER #${order.order_id.slice(-5)}`;
    dom.receipt.total.textContent = `HKD ${Number(order.price_hkd).toLocaleString()}`;

    // Items
    dom.receipt.items.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <span style="font-weight:600; color:#1e293b;">${order.product_name}</span>
            <span style="font-weight:600;">HKD ${Number(order.price_hkd).toLocaleString()}</span>
        </div>
        <div style="font-size:12px; color:#64748b;">
            Option: ${order.option}<br>
            Qty: ${order.qty}
        </div>
    `;

    dom.receipt.modal.classList.remove('hidden');
}

// Action Sheet Logic
const sheet = {
    overlay: document.getElementById('product-action-sheet'),
    btnAdd: document.getElementById('btn-action-add'),
    btnCopy: document.getElementById('btn-action-copy'),
    btnDel: document.getElementById('btn-action-delete'),
    btnCancel: document.getElementById('btn-action-cancel')
};

function openProductActionSheet(row) {
    currentLongPressRow = row;
    sheet.overlay.classList.add('active');

    // Vibrate if supported
    if (navigator.vibrate) navigator.vibrate(50);
}

function closeActionSheet() {
    sheet.overlay.classList.remove('active');
    currentLongPressRow = null;
}

// Bind Action Sheet Events
if (sheet.overlay) {
    sheet.overlay.onclick = (e) => { if (e.target === sheet.overlay) closeActionSheet(); };
    sheet.btnCancel.onclick = closeActionSheet;

    sheet.btnAdd.onclick = () => {
        addProductRow(); // Add new empty
        closeActionSheet();
        showToast("새 상품 카드가 추가되었습니다");
    };

    sheet.btnCopy.onclick = () => {
        if (!currentLongPressRow) return;
        const inputs = currentLongPressRow.querySelectorAll('input');
        const data = {
            product: inputs[0].value,
            qty: inputs[1].value,
            price: inputs[2].value,
            option: inputs[3].value
        };
        addProductRow(data);
        closeActionSheet();
        showToast("상품이 복사되었습니다");
    };

    sheet.btnDel.onclick = () => {
        if (!currentLongPressRow) return;
        const totalRows = dom.form.container.children.length;

        if (totalRows <= 1) {
            // Instead of blocking delete, just clear the inputs if it's the last one
            const inputs = currentLongPressRow.querySelectorAll('input');
            inputs.forEach(i => i.value = '');
            closeActionSheet();
            showToast("내용이 초기화되었습니다");
            return;
        }

        currentLongPressRow.remove();
        closeActionSheet();
        showToast("상품이 삭제되었습니다");
        updateEmptyState();
    };
} else {
    // Retry binding if DOM not ready (in case of dynamic script, but script is at bottom)
    // Actually best to put this in setupEvents()
}

async function saveOrder() {
    // 1. Validate Customer
    const customer = dom.form.customer.value.trim();
    if (!customer) return alert("고객명을 입력해주세요");

    const date = dom.form.date.value;
    const address = dom.form.address.value.trim();
    const remarks = dom.form.remarks.value.trim();

    // 2. Validate Rows
    const rows = Array.from(dom.form.container.children);
    if (rows.length === 0) return alert("최소 1개 이상의 상품을 등록해야 합니다");

    const orderItems = [];
    for (const row of rows) {
        const product = row.querySelector('.inp-product').value.trim();
        const qty = row.querySelector('.inp-qty').value;
        const price = row.querySelector('.inp-price').value;
        const option = row.querySelector('.inp-option').value.trim();

        if (!product) return alert("모든 상품의 '상품명'을 입력해주세요");
        if (!qty || Number(qty) <= 0) return alert("모든 상품의 '수량'을 올바르게 입력해주세요");
        if (!option) return alert("모든 상품의 '옵션/사이즈'를 입력해주세요");

        orderItems.push({
            customer_id: customer,
            product_name: product,
            option: option,
            qty: Number(qty),
            price_hkd: Number(price) || 0,
            order_date: date,
            status: 'Pending',
            address: address, // Lead order address
            remarks: remarks
        });
    }

    // 3. Send to Server
    const payload = {
        action: 'createOrder',
        orders: orderItems
    };

    showLoading();
    try {
        const res = await sendData(payload);
        if (res) {
            alert('주문이 성공적으로 등록되었습니다.');
            openOrderForm(false); // Close
            renderOrderList();
            renderDashboard();
        }
    } catch (e) {
        console.error(e);
        alert('저장 실패: ' + e.message);
    } finally {
        hideLoading();
    }
}

// 2. PURCHASE
function openPurchaseModal(order, isBatch) {
    STATE.selectedPurchaseId = order?.order_id;
    dom.modals.purchase.classList.remove('hidden');
    dom.modalInpKrw.value = '';
    dom.modalInpKrw.focus();
}

async function savePurchaseCost() {
    const costInput = dom.modalInpKrw.value;
    if (!costInput) return alert("총 매입 금액을 입력해주세요");
    const totalCost = Number(costInput);

    // BATCH MODE
    if (STATE.selectedBatchIds.size > 0) {
        const count = STATE.selectedBatchIds.size;
        const costPerItem = Math.floor(totalCost / count); // Floor to avoid decimals, or deal with remainder? Simple floor for now.

        if (!confirm(`선택한 ${count}개 상품에 대해\n총액: ${totalCost.toLocaleString()}원\n개당: ${costPerItem.toLocaleString()}원\n으로 매입 처리하시겠습니까?`)) return;

        showLoading();
        // Prepare Batch Data
        // Ideally we send one big request. For Mock, we loop.
        const updates = [];
        STATE.selectedBatchIds.forEach(id => {
            updates.push({
                order_id: id,
                cost_krw: costPerItem,
                status: 'Ordered'
            });
            // Local Update
            const o = STATE.orders.find(order => order.order_id === id);
            if (o) {
                o.cost_krw = costPerItem;
                o.status = 'Ordered';
            }
        });

        // Send
        await sendBatchUpdate(updates);

        // Reset
        STATE.selectedBatchIds.clear();
        dom.modals.purchase.classList.add('hidden');
        renderDashboard(); // Update badges
        renderPurchaseList(); // Clear list
        hideLoading();
        showToast("일괄 매입 처리 완료");

    } else {
        // SINGLE MODE (Fallback if mistakenly opened without selection, though UI prevents this)
        // If opened via specific logic not implemented yet for single click
        alert("선택된 상품이 없습니다.");
    }
}

// 3. KOREA
function openKoreaModal(order) {
    dom.modals.korea.classList.remove('hidden');
}
async function saveKoreaShipping() {
    const costInput = dom.inpShipTotal.value;
    if (!costInput) return alert("총 배송비를 입력해주세요");
    const totalCost = Number(costInput);

    if (STATE.selectedKoreaIds.size > 0) {
        const count = STATE.selectedKoreaIds.size;
        const costPerItem = Math.floor(totalCost / count);

        if (!confirm(`선택한 ${count}개 상품에 대해\n총 배송비: HKD ${totalCost.toLocaleString()}\n개당 부담: HKD ${costPerItem.toLocaleString()}\n으로 발송 처리하시겠습니까?`)) return;

        showLoading();
        const updates = [];
        STATE.selectedKoreaIds.forEach(id => {
            updates.push({
                order_id: id,
                ship_fee_krw: costPerItem, // Send to KRW Col, but Value is HKD
                status: 'Shipped_to_HK'
            });
            // Local Update
            const o = STATE.orders.find(order => order.order_id === id);
            if (o) {
                o.ship_fee_krw = costPerItem;
                o.status = 'Shipped_to_HK';
            }
        });

        await sendBatchUpdate(updates);

        STATE.selectedKoreaIds.clear();
        dom.modals.korea.classList.add('hidden');
        renderDashboard();
        renderKoreaList();
        hideLoading();
        showToast("일괄 발송 처리 완료");
    } else {
        alert("선택된 상품이 없습니다.");
    }
}

// 4. HK
// 4. HK & Delivery
// We now pass a GROUP of orders (Array)
let currentHkGroup = [];

function openHkModal(group) {
    if (!group || group.length === 0) return;
    currentHkGroup = group;
    dom.modals.hk.classList.remove('hidden');

    // Populate Info
    const customer = group[0].customer_id;
    const count = group.length;
    dom.hkCustomerInfo.innerHTML = `
        <div style="font-weight:700; font-size:18px;">${customer} 님</div>
        <div style="font-size:13px; color:#64748b;">총 ${count}건의 상품</div>
    `;

    // Populate List
    dom.hkItemList.innerHTML = '';
    group.forEach(o => {
        const item = document.createElement('div');
        item.style.padding = "8px 0";
        item.style.borderBottom = "1px dashed #e2e8f0";
        item.innerHTML = `
            <div style="font-size:14px; font-weight:600;">${o.product_name}</div>
            <div style="font-size:12px; color:#64748b;">${o.option} | Qty: ${o.qty}</div>
        `;
        dom.hkItemList.appendChild(item);
    });

    // Populate Address (from Lead Order)
    // Try to find the most populated address? Or just the first.
    // Assuming all have same address if same customer, or we default to one.
    const leadOrder = group.find(o => o.address) || group[0];
    dom.inpHkAddress.value = leadOrder.address || '';

    dom.inpTracking.value = '';
    dom.inpLocalFee.value = '';
}

async function saveHongKongDelivery() {
    if (!currentHkGroup || currentHkGroup.length === 0) return;

    const address = dom.inpHkAddress.value;
    const tracking = dom.inpTracking.value;
    const feeInput = dom.inpLocalFee.value;
    const method = dom.selDeliveryMethod.value;

    if (!tracking && method !== 'Pickup') return alert("운송장 번호를 입력해주세요 (픽업 제외)");

    const totalFee = Number(feeInput) || 0;
    const count = currentHkGroup.length;
    const feePerItem = Math.floor(totalFee / count);

    if (!confirm(`총 ${count}건에 대해 배송 완료 처리하시겠습니까?`)) return;

    showLoading();
    const updates = [];

    currentHkGroup.forEach(o => {
        updates.push({
            order_id: o.order_id,
            tracking_no: tracking,
            local_fee_hkd: feePerItem, // 1/N
            delivery_method: method,
            address: address, // Update address in case it was edited
            // status: 'Completed'  <-- REMOVED: Only updates info
        });

        // Local Update
        o.tracking_no = tracking;
        o.local_fee_hkd = feePerItem;
        o.delivery_method = method;
        o.address = address;
        // o.status = 'Completed'; <-- REMOVED
    });

    await sendBatchUpdate(updates);

    currentHkGroup = [];
    dom.modals.hk.classList.add('hidden');
    renderDashboard();
    renderHongKongList(); // Just re-render this list
    // renderFinanceList(); <-- No longer moving to finance
    hideLoading();
    showToast("배송 정보가 저장되었습니다 (발송 대기중)");
}

async function saveBulkHongKongDelivery() {
    if (STATE.selectedHkIds.size === 0) return alert("배송할 고객을 선택해주세요");

    const customers = Array.from(STATE.selectedHkIds);
    // Find all orders for these customers that are currently Shipped_to_HK
    const targetOrders = STATE.orders.filter(o => o.status === 'Shipped_to_HK' && STATE.selectedHkIds.has(o.customer_id));
    const count = targetOrders.length;

    // Check for missing addresses?
    // Check for missing addresses?
    const missingInfo = targetOrders.filter(o => !o.address || !o.tracking_no || !o.delivery_method).length;

    if (missingInfo > 0) {
        return alert(`배송 정보(주소, 운송장 등)가 없는 주문이 ${missingInfo}건 있습니다.\n모든 정보를 입력해야 배송 완료 처리할 수 있습니다.`);
    }

    if (!confirm(`선택한 ${customers.length}명(총 ${count}건)의 배송을 완료 처리하시겠습니까?`)) return;

    showLoading();
    const updates = [];
    targetOrders.forEach(o => {
        updates.push({
            order_id: o.order_id,
            status: 'Completed',
            // If tracking/fee logic is needed for bulk, we might need a modal. 
            // For now, assuming "Simple Complete" or assuming data already entered via Long Press.
            // If data is missing, it just stays empty.
        });
        // Local
        o.status = 'Completed';
    });

    await sendBatchUpdate(updates);

    STATE.selectedHkIds.clear();
    renderDashboard();
    renderHongKongList();
    renderFinanceList();
    hideLoading();
    showToast("배송 완료 처리됨");
}

// 5. SETTLEMENT
function openSettlementModal() {
    dom.modals.settlement.classList.remove('hidden');
    dom.inpSettleTotal.value = '';
}

async function saveBulkSettlement() {
    const ids = Array.from(STATE.selectedFinanceIds);
    if (ids.length === 0) return alert("정산할 주문을 선택해주세요");

    // Calculate Total for confirmation
    let totalProfit = 0;
    const targets = STATE.orders.filter(o => STATE.selectedFinanceIds.has(o.order_id));
    targets.forEach(o => {
        const p = Number(o.price_hkd) * STATE.exchangeRate;
        const c = Number(o.cost_krw) + Number(o.ship_fee_krw);
        totalProfit += (p - c);
    });

    if (!confirm(`선택한 ${ids.length}건을 정산 완료 처리하시겠습니까?\n예상 수익: ${Math.round(totalProfit).toLocaleString()} KRW`)) return;

    showLoading();
    const updates = ids.map(id => ({
        order_id: id,
        status: 'Settled'
    }));

    await sendBatchUpdate(updates);

    // Local Update
    targets.forEach(o => o.status = 'Settled');

    STATE.selectedFinanceIds.clear();
    renderDashboard();
    renderFinanceList();
    hideLoading();
    showToast("정산 완료 처리됨");

    // Close modal if open
    dom.modals.settlement.classList.add('hidden');
}

// Settings
function setLang(l) {
    STATE.lang = l;
    dom.btnLangKo.classList.toggle('active', l === 'ko');
    dom.btnLangCn.classList.toggle('active', l === 'cn');
    renderDashboard(); // Re-render text
}
function setCurrency(c) {
    STATE.currencyMode = c;
    dom.btnCurrKrw.classList.toggle('active', c === 'KRW');
    dom.btnCurrHkd.classList.toggle('active', c === 'HKD');
    renderDashboard();
}

async function fetchExchangeRate() {
    try {
        console.log("Fetching Exchange Rate from:", CONFIG.EXCHANGE_API);
        const res = await fetch(CONFIG.EXCHANGE_API);
        const data = await res.json();
        if (data && data.rates && data.rates.KRW) {
            STATE.exchangeRate = Number(data.rates.KRW.toFixed(2)); // Pre-process directly
            const input = document.getElementById('inp-exchange-rate');
            if (input) input.value = STATE.exchangeRate.toFixed(2);
            renderDashboard();
            console.log("Updated Exchange Rate:", STATE.exchangeRate);
            showToast(`실시간 환율 적용: ${STATE.exchangeRate.toFixed(2)}원`);
        }
    } catch (e) {
        console.error("Failed to fetch rate", e);
        showToast("환율 로딩 실패 (기본값 사용)");
    }
}

// ================= PAGINATION COMPONENT =================
function renderPaginationControls(container, totalItems, renderFunc) {
    if (!container) return;

    // Basic safeguards
    if (!STATE.pagination) STATE.pagination = { currentPage: 1, itemsPerPage: 10 };

    const { currentPage, itemsPerPage } = STATE.pagination;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const wrapper = document.createElement('div');
    wrapper.className = 'pagination-wrapper';
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = 'space-between';
    wrapper.style.alignItems = 'center';
    wrapper.style.padding = '10px 0';
    wrapper.style.marginBottom = '10px';
    wrapper.style.borderBottom = '1px solid #f1f5f9';

    // 1. Limit Selector
    const limitSelect = document.createElement('select');
    limitSelect.className = 'form-input';
    limitSelect.style.width = 'auto';
    limitSelect.style.padding = '5px 10px';
    limitSelect.style.fontSize = '12px';
    [10, 30, 50].forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.text = `${n}개씩`;
        if (itemsPerPage === n) opt.selected = true;
        limitSelect.appendChild(opt);
    });
    limitSelect.onchange = (e) => {
        STATE.pagination.itemsPerPage = Number(e.target.value);
        STATE.pagination.currentPage = 1; // Reset to 1 on limit change
        renderFunc();
    };

    // 2. Page Buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'pagination-controls';

    const createBtn = (label, page, isActive = false, disabled = false) => {
        const btn = document.createElement('button');
        btn.innerHTML = label;
        btn.className = isActive ? 'pagination-btn active' : 'pagination-btn';

        if (disabled) {
            btn.disabled = true;
        } else {
            btn.onclick = () => {
                STATE.pagination.currentPage = page;
                renderFunc();
                // Scroll to top of list
                if (container.previousElementSibling) {
                    container.previousElementSibling.scrollIntoView({ behavior: 'smooth' });
                }
            };
        }
        return btn;
    };

    // Prev
    btnContainer.appendChild(createBtn('&lt;', currentPage - 1, false, currentPage <= 1));

    // Page Numbers (Window of 5)
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // Adjust window if close to end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    // Boundary checks
    startPage = Math.max(1, startPage);
    endPage = Math.min(totalPages, endPage);

    // If no items, show at least page 1
    if (totalPages === 0) endPage = 1;

    for (let i = startPage; i <= endPage; i++) {
        btnContainer.appendChild(createBtn(String(i), i, i === currentPage));
    }

    // Next
    btnContainer.appendChild(createBtn('&gt;', currentPage + 1, false, currentPage >= totalPages));

    wrapper.appendChild(limitSelect);
    wrapper.appendChild(btnContainer);
    container.appendChild(wrapper);
}

// UTILS
function showLoading() { if (dom.loadingOverlay) dom.loadingOverlay.classList.remove('hidden'); }
function hideLoading() { if (dom.loadingOverlay) dom.loadingOverlay.classList.add('hidden'); }
function showToast(msg) {
    if (!dom.toastContainer) return;
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}

// AUTOCOMPLETE HELPERS
function updateProductDatalist() {
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

function updateOptionDatalist(datalistEl, prodName) {
    if (!datalistEl || !prodName) return;

    const relevant = STATE.orders.filter(o => o.product_name === prodName).map(o => o.option).filter(Boolean);
    const unique = [...new Set(relevant)];

    datalistEl.innerHTML = '';
    unique.sort().forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        datalistEl.appendChild(opt);
    });
}

// AUTOCOMPLETE HELPERS
function updateProductDatalist() {
    const dl = document.getElementById('list-products');
    if (!dl) return;

    // Get unique product names from existing orders
    const unique = [...new Set(STATE.orders.map(o => o.product_name).filter(Boolean))];

    // Clear and refill
    dl.innerHTML = '';
    unique.sort().forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        dl.appendChild(opt);
    });
}

function updateOptionDatalist(datalistEl, prodName) {
    if (!datalistEl) return;

    // Always start fresh
    datalistEl.innerHTML = '';

    if (!prodName) return; // No product name = no suggestions

    // Find options used for this specific product
    const relevant = STATE.orders
        .filter(o => o.product_name && o.product_name.toLowerCase() === prodName.toLowerCase())
        .map(o => o.option)
        .filter(Boolean);

    const unique = [...new Set(relevant)];

    unique.sort().forEach(o => {
        const opt = document.createElement('option');
        opt.value = o;
        datalistEl.appendChild(opt);
    });
}

// START
window.onload = init;
