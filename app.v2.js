/**
 * Purchase Manager 2.0 - Client Controller
 * Refactored & Optimized
 * Version: 2.1.0
 */

// =========================================
// 1. CONFIGURATION & STATE
// =========================================
const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbws4QQLos3owcH6Yx-IydldGdpFWqT0c-q8btVFV8Mo5bhvh1inHywmdBnMrJDeFZdWgg/exec",
    IS_MOCK: false,
    DEFAULT_RATE: 170
};

// I18N
const TRANS = {
    ko: {
        dashboard: "현황 (Dashboard)",
        revenue: "매출 (Revenue)",
        profit: "예상 수익 (Profit)",
        settlement_needed: "정산 필요 금액 (Cost + Ship)",
        pipeline: "진행 상태",
        nav_status: "현황",
        nav_order: "주문",
        nav_purchase: "매입",
        nav_warehouse: "배대지",
        nav_delivery: "배송",
        nav_finance: "정산",
        recent_activity: "최근 활동",
        settlement_title: "정산 (Settlement)",
        rate: "환율:",
        details: "상세 내역",
        close: "닫기",
        receipt_view: "영수증 보기",
        receipt_title: "영수증 (Receipt)",
        receipt_save: "이미지 저장 (Save Image)",

        // Sections & Descs
        sec_purchase: "매입 대기 (Purchase)",
        desc_purchase: "매입가 입력이 필요한 주문들입니다.",
        sec_korea: "배대지 발송 (KR Warehouse)",
        desc_korea: "매입 완료된 상품을 한국 배대지에서 홍콩으로 보냅니다.",
        sec_hongkong: "고객 배송 (Customer Ship)",
        desc_hongkong: "홍콩에 도착한 상품을 고객에게 발송/전달합니다.",
        sec_form: "새 주문 등록",

        // Form Labels
        lbl_date: "날짜 (Date)",
        lbl_customer: "고객명 (Customer)",
        lbl_address: "주소 (Address)",
        lbl_remarks: "비고 (Remarks)",
        lbl_delivery_method: "배송 방식",
        lbl_tracking: "송장 번호 (Tracking)",
        lbl_local_fee: "현지 비용 (HKD)",
        lbl_krw: "매입가 (KRW)",
        lbl_ship_total: "총 배송비 (KRW)",

        // Buttons
        btn_add_product: "+ 상품 추가",
        btn_save: "저장하기",
        btn_cancel: "취소",
        btn_close: "닫기",
        btn_save_changes: "저장",
        btn_shipped: "홍콩 발송 (Shipped)",
        btn_complete: "배송 완료 (Complete)",

        // Status & Alerts
        status_pending: "주문 대기",
        status_ordered: "매입 완료",
        status_shipped: "홍콩 발송",
        status_completed: "배송 완료",
        msg_loading: "처리중...",
        msg_saved: "저장되었습니다.",
        msg_confirm_settle: "정산 완료 처리하시겠습니까?",

        // Placeholders
        ph_item_name: "상품명 (Item Name)",
        ph_qty: "수량 (Qty)",
        ph_price: "판매가 (HKD)",
        ph_cost: "매입가 (KRW)",
        ph_option: "옵션 (Option)",
        ph_search: "🔍 고객명, 상품명 검색...",
        ph_tracking: "송장 번호",
        ph_local_fee: "현비 비용 (HKD)",
        ph_ship_total: "총 배송비 (KRW)"
    },
    cn: {
        dashboard: "概况 (Dashboard)",
        revenue: "收入 (Revenue)",
        profit: "预计利润 (Profit)",
        settlement_needed: "需结算金额 (Cost + Ship)",
        pipeline: "订单流程",
        nav_status: "概况",
        nav_order: "订单",
        nav_purchase: "采购",
        nav_warehouse: "转运",
        nav_delivery: "派送",
        nav_finance: "结算",
        recent_activity: "最近活动",
        settlement_title: "结算 (Settlement)",
        rate: "汇率:",
        details: "详细信息",
        close: "关闭",
        receipt_view: "查看收据 (View Receipt)",
        receipt_title: "收据 (Receipt)",
        receipt_save: "保存图片 (Save Image)",

        // Sections & Descs
        sec_purchase: "待采购 (Purchase)",
        desc_purchase: "需要输入采购成本的订单。",
        sec_korea: "韩国转运 (KR Warehouse)",
        desc_korea: "已采购商品，需发往香港。",
        sec_hongkong: "客户派送 (Customer Ship)",
        desc_hongkong: "已抵港商品，派送给客户。",
        sec_form: "新增订单",

        // Form Labels
        lbl_date: "日期 (Date)",
        lbl_customer: "客户名 (Customer)",
        lbl_address: "地址 (Address)",
        lbl_remarks: "备注 (Remarks)",
        lbl_delivery_method: "派送方式",
        lbl_tracking: "快递单号 (Tracking)",
        lbl_local_fee: "本地费用 (HKD)",
        lbl_krw: "采购价 (KRW)",
        lbl_ship_total: "总运费 (KRW)",

        // Buttons
        btn_add_product: "+ 添加商品",
        btn_save: "保存订单",
        btn_cancel: "取消",
        btn_close: "关闭",
        btn_save_changes: "保存",
        btn_shipped: "发货至香港 (Shipped)",
        btn_complete: "派送完成 (Complete)",

        // Status & Alerts
        status_pending: "待处理",
        status_ordered: "已采购",
        status_shipped: "已发货",
        status_completed: "已完成",
        msg_loading: "处理中...",
        msg_saved: "已保存。",
        msg_confirm_settle: "确认结算完成吗？",

        // Placeholders
        ph_item_name: "商品名称 (Item Name)",
        ph_qty: "数量 (Qty)",
        ph_price: "单价 (HKD)",
        ph_cost: "采购价 (KRW)",
        ph_option: "选项 (Option)",
        ph_search: "🔍 搜索客户名或商品...",
        ph_tracking: "快递单号",
        ph_local_fee: "本地费用 (HKD)",
        ph_ship_total: "总运费 (KRW)"
    }
};

let STATE = {
    orders: [],
    auth: null,

    // UI State
    selectedTab: 'view-dashboard',
    exchangeRate: CONFIG.DEFAULT_RATE,
    lang: 'ko', // 'ko' | 'cn',
    currencyMode: 'KRW', // 'KRW' | 'HKD'

    // Modal Context
    isBatchMode: false,
    selectedPurchaseId: null, // For single item actions

    // Bulk Selections
    selectedBatchIds: new Set(),
    selectedKoreaIds: new Set(),
    selectedFinanceIds: new Set()
};

// =========================================
// 2. DOM ELEMENTS
// =========================================
const dom = {
    // Auth
    authOverlay: document.getElementById('auth-overlay'),
    authCode: document.getElementById('auth-code'),
    btnAuthConfirm: document.getElementById('btn-auth-confirm'),
    loadingOverlay: document.getElementById('loading-overlay'),
    btnRefresh: document.getElementById('btn-refresh'),
    btnLang: document.getElementById('btn-lang'),
    btnCurrency: document.getElementById('btn-currency'),
    toastContainer: document.getElementById('toast-container'),

    // Navigation & Shell
    sections: document.querySelectorAll('.section'),
    navItems: document.querySelectorAll('.nav-item'),
    fab: document.getElementById('fab-add'),

    // Dashboard
    dashboardDateFilter: document.getElementById('dashboard-date-filter'),
    statRevenue: document.getElementById('stat-revenue'),
    statProfit: document.getElementById('stat-profit'),
    statCost: document.getElementById('stat-cost'),
    // Clickable Cards
    cardRevenue: document.getElementById('card-revenue'),
    cardProfit: document.getElementById('card-profit'),
    cardCost: document.getElementById('card-cost'),
    dashboardList: document.getElementById('dashboard-recent-list'),

    // Pipeline Counts
    badges: {
        pending: document.getElementById('badge-pending'),
        ordered: document.getElementById('badge-ordered'),
        shippedKr: document.getElementById('badge-shipped-kr'),
        shippedHk: document.getElementById('badge-shipped-hk'),
        completed: document.getElementById('badge-completed')
    },
    pipelineSteps: document.querySelectorAll('.pipeline-step'),

    // List Containers
    lists: {
        all: document.getElementById('order-list-container'),
        purchase: document.getElementById('purchase-list-container'),
        korea: document.getElementById('korea-list-container'),
        hk: document.getElementById('hongkong-list-container'),
        finance: document.getElementById('finance-list-container')
    },

    // Filters (Order List)

    // Filters (Order List)
    filterStatus: document.getElementById('filter-status'),
    filterProduct: document.getElementById('filter-product'),
    filterDateStart: document.getElementById('filter-date-start'),
    filterDateEnd: document.getElementById('filter-date-end'),
    listResultCount: document.getElementById('list-result-count'), // New count display

    // Filter Shortcuts
    btnFilterToday: document.getElementById('btn-filter-today'),
    btnFilterMonth: document.getElementById('btn-filter-month'),
    btnFilterReset: document.getElementById('btn-filter-reset'),

    searchInput: document.getElementById('search-input'),
    inpSearchHk: document.getElementById('inp-search-hk'), // Fixed: Added missing element
    inpExRate: document.getElementById('inp-ex-rate'),
    lblCurrentRate: document.getElementById('lbl-current-rate'),

    // Bulk Actions
    bulkActionBar: document.getElementById('bulk-action-bar'),
    bulkStatCount: document.getElementById('bulk-start-count'),
    btnBulkCost: document.getElementById('btn-bulk-cost'),

    // Select All Checkboxes
    cbAllPurchase: document.getElementById('cb-all-purchase'),
    cbAllKorea: document.getElementById('cb-all-korea'),

    // Modals
    modals: {
        purchase: document.getElementById('purchase-modal'),
        korea: document.getElementById('korea-modal'),
        hk: document.getElementById('hk-modal'),
        list: document.getElementById('list-modal') // New Generic Modal
    },
    // List Modal Elements
    listModalTitle: document.getElementById('list-modal-title'),
    listModalContent: document.getElementById('list-modal-content'),
    btnCloseList: document.getElementById('btn-close-list'),

    // Modal Inputs
    modalInpKrw: document.getElementById('inp-cost-krw'),
    purchaseItemName: document.getElementById('purchase-item-name'),

    koreaModalDesc: document.getElementById('korea-modal-desc'),
    inpShipTotal: document.getElementById('inp-ship-total'),

    hkModalDesc: document.getElementById('hk-modal-desc'),
    selDeliveryMethod: document.getElementById('sel-delivery-method'),
    inpDeliveryAddress: document.getElementById('inp-delivery-address'),
    inpTracking: document.getElementById('inp-tracking'),
    inpLocalFee: document.getElementById('inp-local-fee'),

    btnCancelHk: document.getElementById('btn-cancel-hk'),
    btnSaveHk: document.getElementById('btn-save-hk'),

    // Settlement Modal
    settlementDesc: document.getElementById('settlement-desc'),
    inpSettleTotal: document.getElementById('inp-settle-total'),
    btnCancelSettle: document.getElementById('btn-cancel-settle'),
    btnSaveSettle: document.getElementById('btn-save-settle'),

    // Select All Checkboxes
    cbAllPurchase: document.getElementById('cb-all-purchase'),
    cbAllKorea: document.getElementById('cb-all-korea'),
    cbAllFinance: document.getElementById('cb-all-finance'),

    // Order Form
    form: {
        title: document.getElementById('form-title'),
        id: document.getElementById('inp-order-id'),
        date: document.getElementById('inp-date'),
        customer: document.getElementById('inp-customer'),
        address: document.getElementById('inp-address'),
        remarks: document.getElementById('inp-remarks'),
        container: document.getElementById('product-rows-container'),
        btnAdd: document.getElementById('btn-add-product'),
        btnAdd: document.getElementById('btn-add-product'),
        btnSave: document.getElementById('btn-save'),
        btnCancel: document.getElementById('btn-cancel'),
        btnClose: document.getElementById('btn-close-form') // New Close Button
    },
    datalists: {
        customers: document.getElementById('dl-customers'),
        products: document.getElementById('dl-products'),
        options: document.getElementById('dl-options')
    }
};

// =========================================
// 3. INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEvents();
});

function setupEvents() {
    // Helper to safely add event
    const safeListen = (el, event, handler) => {
        if (el) el.addEventListener(event, handler);
    };

    // Auth
    safeListen(dom.btnAuthConfirm, 'click', attemptAuth);
    if (dom.authCode) {
        dom.authCode.addEventListener('keyup', (e) => { if (e.key === 'Enter') attemptAuth(); });
    }

    // Global
    safeListen(dom.btnRefresh, 'click', loadData);
    safeListen(dom.btnLang, 'click', toggleLanguage);
    safeListen(dom.btnCurrency, 'click', toggleCurrencyMode);

    // Navigation
    dom.navItems.forEach(btn => {
        const target = btn.dataset.target;
        if (target === 'view-list') { // Assuming 'view-list' is the general order list
            safeListen(btn, 'click', () => navigate('view-list'));
        } else {
            safeListen(btn, 'click', () => navigate(target));
        }
    });
    dom.pipelineSteps.forEach(step =>
        safeListen(step, 'click', () => navigate(step.dataset.target))
    );
    safeListen(dom.fab, 'click', () => openForm());

    // List Search & Filters
    safeListen(dom.searchInput, 'input', () => renderList(dom.searchInput.value));
    safeListen(dom.filterStatus, 'change', () => renderList(dom.searchInput.value));
    safeListen(dom.filterProduct, 'input', () => renderList(dom.searchInput.value)); // Product Filter
    safeListen(dom.filterDateStart, 'change', () => renderList(dom.searchInput.value));
    safeListen(dom.filterDateEnd, 'change', () => renderList(dom.searchInput.value));

    // Filter Shortcuts
    safeListen(dom.btnFilterToday, 'click', () => setDateFilter('today'));
    safeListen(dom.btnFilterMonth, 'click', () => setDateFilter('month'));
    safeListen(dom.btnFilterReset, 'click', () => setDateFilter('reset')); // Fixed: dom.inpSearch -> dom.searchInput
    safeListen(dom.inpSearchHk, 'input', (e) => renderHongKongList(e.target.value));

    // Dashboard
    if (dom.dashboardDateFilter) {
        dom.dashboardDateFilter.addEventListener('change', (e) => {
            const val = e.target.value;
            const rangeContainer = document.getElementById('date-range-container');
            if (val === 'custom') {
                if (rangeContainer) rangeContainer.style.display = 'flex';
            } else {
                if (rangeContainer) rangeContainer.style.display = 'none';
                renderDashboard();
            }
        });
    }

    // Custom Date Go
    const btnDateGo = document.getElementById('btn-date-go');
    safeListen(btnDateGo, 'click', renderDashboard);



    // Dashboard Interaction
    safeListen(dom.cardProfit, 'click', toggleProfitMode);

    // Finance Rate
    if (dom.inpExRate) {
        dom.inpExRate.addEventListener('input', (e) => {
            STATE.exchangeRate = parseFloat(e.target.value) || CONFIG.DEFAULT_RATE;
            renderFinanceList();
            renderDashboard();
        });
    }

    // Close Form Button
    if (dom.form.btnClose) {
        dom.form.btnClose.onclick = () => {
            // Confirm if unsaved? (Optional)
            navigate('view-list');
        };
    }

    // Form Interactions
    if (dom.form) {
        safeListen(dom.form.btnCancel, 'click', () => navigate('view-dashboard'));
        safeListen(dom.form.btnSave, 'click', saveOrder);
        safeListen(dom.form.btnAdd, 'click', () => addProductRow());
        if (dom.form.customer) dom.form.customer.addEventListener('change', autoFillAddress);
    }

    // Modal Actions - Purchase
    safeListen(dom.btnSaveCost, 'click', savePurchaseCost);
    safeListen(dom.btnCloseModal, 'click', closePurchaseModal);
    safeListen(dom.btnBulkCost, 'click', handleBulkActionClick);

    // Select All
    safeListen(dom.cbAllPurchase, 'change', (e) => toggleSelectAll('purchase', e.target.checked));
    safeListen(dom.cbAllKorea, 'change', (e) => toggleSelectAll('korea', e.target.checked));
    safeListen(dom.cbAllFinance, 'change', (e) => toggleSelectAll('finance', e.target.checked));

    // Modal Actions - Korea
    safeListen(dom.btnCancelKorea, 'click', () => dom.modals.korea.style.display = 'none');
    safeListen(dom.btnSaveKorea, 'click', saveKoreaShipping);

    // Modal Actions - HK
    safeListen(dom.btnCancelHk, 'click', () => dom.modals.hk.style.display = 'none');
    safeListen(dom.btnSaveHk, 'click', saveHongKongDelivery);

    // Modal Actions - Settlement
    safeListen(dom.btnCancelSettle, 'click', () => dom.modals.settlement.style.display = 'none');
    safeListen(dom.btnSaveSettle, 'click', saveBulkSettlement);

    // List Modal
    // Safely assign onclick
    if (dom.btnCloseList) {
        dom.btnCloseList.onclick = () => {
            if (dom.modals.list) {
                dom.modals.list.classList.add('hidden');
                dom.modals.list.style.display = 'none';
            }
        };
    }
}

// =========================================
// 3.1 I18N
// =========================================
function toggleLanguage() {
    STATE.lang = STATE.lang === 'ko' ? 'cn' : 'ko';
    dom.btnLang.textContent = STATE.lang === 'ko' ? '🇨🇳 CN' : '🇰🇷 KR';
    updateLanguage();
    // Re-render current view to apply dynamic text translations (e.g. Card Status)
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        if (activeSection.id === 'view-dashboard') renderDashboard();
        else navigate(activeSection.id, true);
    }
}

function toggleCurrencyMode() {
    STATE.currencyMode = STATE.currencyMode === 'KRW' ? 'HKD' : 'KRW';
    dom.btnCurrency.textContent = STATE.currencyMode === 'KRW' ? '💲 KRW' : '💲 HKD';
    renderDashboard();
}

function updateLanguage() {
    const t = TRANS[STATE.lang] || TRANS.ko;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (t[key]) {
            if (el.tagName === 'INPUT' && el.type === 'button') {
                el.value = t[key];
            } else if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });
}

// =========================================
// 4. AUTHENTICATION
// =========================================
function checkAuth() {
    // SECURITY: Auth is Session Only. No LocalStorage.
    if (STATE.auth) {
        dom.authOverlay.style.display = 'none';
        loadData();
    } else {
        dom.authOverlay.style.display = 'flex';
        dom.authCode.focus();
    }
}

async function attemptAuth() {
    const code = dom.authCode.value;
    if (!code) return alert('PIN을 입력하세요.');

    // Only save to memory state
    STATE.auth = code;

    // Validate by trying to fetch data (Mock or Real)
    // For UI fluidity, we just assume it's correct and loadData will fail if wrong (in real app)
    // Or we successfully clear overlay
    dom.authOverlay.style.display = 'none';
    loadData();
}

// =========================================
// 5. DATA MANAGEMENT
// =========================================
async function loadData() {
    fetchExchangeRate();
    showLoading();
    try {
        if (CONFIG.IS_MOCK) {
            await mockDataLoad();
        } else {
            // Timestamp to bypass caching
            const res = await fetch(CONFIG.API_URL + '?t=' + new Date().getTime(), {
                method: 'POST',
                body: JSON.stringify({ action: 'getOrders', auth: STATE.auth })
            });
            const json = await res.json();
            if (json.success) STATE.orders = json.data;
            else throw new Error(json.message);
        }

        updateDatalists();
        renderDashboard();

        // Refresh Current View
        const activeSection = document.querySelector('.section.active');
        const target = activeSection ? activeSection.id : 'view-dashboard';
        navigate(target, true); // true = force render

    } catch (e) {
        showToast('로딩 실패: ' + e.message);
        console.error(e);
    } finally {
        hideLoading();
    }
}

async function sendUpdate(payload) {
    if (CONFIG.IS_MOCK) return;
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateOrder',
            auth: STATE.auth,
            order_id: payload.order_id,
            data: payload
        })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
}

async function fetchExchangeRate() {
    try {
        // Free API for HKD to KRW
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/HKD');
        const data = await res.json();
        const rate = data.rates.KRW;

        if (rate) {
            dom.lblCurrentRate.textContent = `Live: ${rate.toFixed(1)}`;
            dom.lblCurrentRate.onclick = () => {
                dom.inpExRate.value = Math.round(rate);
                dom.inpExRate.dispatchEvent(new Event('input')); // Trigger recalc
                showToast('실시간 환율 적용됨');
            };
        }
    } catch (e) {
        console.warn('Rate fetch failed', e);
        dom.lblCurrentRate.textContent = 'Rate Err';
    }
}

// =========================================
// 6. ROUTING & UI LOGIC
// =========================================
function navigate(targetId, forceRender = false) {
    // Update Tabs
    dom.sections.forEach(el => el.classList.remove('active'));
    const targetEl = document.getElementById(targetId);
    if (targetEl) targetEl.classList.add('active');

    dom.navItems.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });

    STATE.selectedTab = targetId;

    // View Specific Logic
    if (targetId === 'view-list') {
        dom.fab.classList.remove('hidden');
        renderList();
    } else {
        dom.fab.classList.add('hidden');
        if (targetId === 'view-dashboard') renderDashboard();
        if (targetId === 'view-purchase') renderPurchaseList();
        if (targetId === 'view-korea') renderKoreaList();
        if (targetId === 'view-hongkong') renderHongKongList();
        if (targetId === 'view-finance') renderFinanceList();

        // Hide bulk bar by default when switching, renderers will show if needed
        if (targetId !== 'view-purchase' && targetId !== 'view-finance') {
            dom.bulkActionBar.style.display = 'none';
        }
    }
}

function updateBulkUI() {
    let count = 0;
    let btnText = '';

    // Determine context based on Tab
    if (STATE.selectedTab === 'view-purchase') {
        count = STATE.selectedBatchIds.size;
        btnText = '일괄 입력';
    } else if (STATE.selectedTab === 'view-finance') {
        count = STATE.selectedFinanceIds.size;
        btnText = '정산 완료 (Settle)';
    }

    if (count > 0) {
        dom.bulkActionBar.style.display = 'flex';
        dom.bulkStatCount.textContent = `${count}개 선택됨`;
        dom.btnBulkCost.textContent = btnText;
    } else {
        dom.bulkActionBar.style.display = 'none';
    }
}

function handleBulkActionClick() {
    if (STATE.selectedTab === 'view-purchase') {
        openPurchaseModal(null, true);
    } else if (STATE.selectedTab === 'view-finance') {
        openSettlementModal();
    }
}

// =========================================
// 7. RENDERERS
// =========================================

// --- HELPERS ---
function getOrdersByStatus(status) {
    return STATE.orders.filter(o => (o.status || 'Pending') === status);
}

// --- DASHBOARD ---
function renderDashboard() {
    const filter = dom.dashboardDateFilter.value; // today, week, month, custom, all
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // Date Range Logic
    let startDate = '', endDate = '';

    if (filter === 'custom') {
        startDate = document.getElementById('date-start').value;
        endDate = document.getElementById('date-end').value;
    } else if (filter === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
        endDate = today;
    }

    // 1. Pipeline Counts (Status based)
    const pendingList = getOrdersByStatus('Pending');
    const orderedList = getOrdersByStatus('Ordered');
    const shippedList = getOrdersByStatus('Shipped_to_HK');
    const completedList = getOrdersByStatus('Completed');
    const settledList = getOrdersByStatus('Settled');

    // Update Pipeline Badges (Dashboard)
    // Concept: Badge shows "Items Waiting in this Stage" (To-Do Count)

    // 1. Order/Purchase Stage (Waiting for Purchase)
    dom.badges.pending.textContent = pendingList.length;
    dom.badges.ordered.textContent = pendingList.length; // Purchase Tab shows Pending items

    // 2. Warehouse Stage (Purchased, Waiting for Shipping)
    dom.badges.shippedKr.textContent = orderedList.length; // Korea Tab shows Ordered items

    // 3. Delivery Stage (Shipped, Waiting for Delivery to Customer)
    dom.badges.shippedHk.textContent = shippedList.length; // HongKong Tab shows Shipped items

    // 4. Finance Stage (Delivered, Waiting for Settlement)
    dom.badges.completed.textContent = completedList.length; // Finance Tab shows Completed items

    // Correction: 
    // "Delivery" step in dashboard usually means "Ready to Ship" or "Shipped".
    // Let's map strict to dashboard pipeline:
    // [Order] -> Pending
    // [Purchase] -> Ordered (Waiting at KR Warehouse)
    // [Warehouse] -> Shipped_to_HK (On the way to HK)
    // [Delivery] -> Arrived? In this simple flow, Shipped_to_HK covers it. 
    // [Complete] -> Completed.

    Object.values(dom.badges).forEach(el => el.classList.remove('hidden'));

    // Update Bottom Nav Badges
    updateNavBadges({
        pending: pendingList.length,
        ordered: orderedList.length,
        shipped: shippedList.length,
        completed: completedList.length
    });

    // 2. Financials & Recent Activity (Date Filtered)
    let revenue = 0, profit = 0;
    let settlementNeeded = 0;

    STATE.orders.forEach(o => {
        // Exclude Cancelled from all calculations
        if (o.status === 'Cancelled') return;

        // Settlement Needed (Status 'Completed' - waiting for Settlement)
        if (o.status === 'Completed') {
            const cost = Number(o.cost_krw) || 0;
            const ship = Number(o.ship_fee_krw) || 0;
            settlementNeeded += (cost + ship);
        }

        // Financials (Date Filtered)
        let match = false;
        if (filter === 'all') match = true;
        else if (filter === 'today' && o.order_date === today) match = true;
        else if (filter === 'month' && o.order_date.startsWith(currentMonth)) match = true;
        else if (filter === 'week' || filter === 'custom') {
            if (startDate && endDate) {
                match = (o.order_date >= startDate && o.order_date <= endDate);
            }
        }

        if (match) {
            const rev = Number(o.price_hkd) || 0;
            const cost = Number(o.cost_krw) || 0;
            const ship = Number(o.ship_fee_krw) || 0;
            const local = Number(o.local_fee_hkd) || 0;
            const rate = STATE.exchangeRate;

            revenue += rev;
            // Profit Calculation
            const revKrw = rev * rate;
            const localKrw = local * rate;
            profit += (revKrw - (cost + ship) - localKrw);
        }
    });

    // Update Stats
    const cur = STATE.currencyMode;
    const rate = STATE.exchangeRate || 1;

    if (cur === 'KRW') {
        dom.statRevenue.textContent = `KRW ${Math.floor(revenue * rate).toLocaleString()}`;
        dom.statCost.textContent = `KRW ${Math.floor(settlementNeeded).toLocaleString()}`;
        dom.statProfit.textContent = `KRW ${Math.floor(profit).toLocaleString()}`;
    } else {
        dom.statRevenue.textContent = `HKD ${revenue.toLocaleString()}`;
        dom.statCost.textContent = `HKD ${Math.floor(settlementNeeded / rate).toLocaleString()}`;
        dom.statProfit.textContent = `HKD ${Math.floor(profit / rate).toLocaleString()}`;
    }

    // Recent Activity list
    dom.dashboardList.innerHTML = '';
    STATE.orders.slice(0, 7).forEach(o => dom.dashboardList.appendChild(createCard(o, true)));
}

function updateNavBadges(counts) {
    // Helper to find nav item by data-target
    const setBadge = (target, count) => {
        const btn = document.querySelector(`.nav-item[data-target="${target}"]`);
        if (!btn) return;

        // Remove existing badge
        const old = btn.querySelector('.nav-badge');
        if (old) old.remove();

        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count > 99 ? '99+' : count;
            btn.appendChild(badge);
        }
    };

    setBadge('view-list', counts.pending);      // Order Tab -> Pending items
    setBadge('view-purchase', counts.pending);  // Purchase Tab -> Also Pending (to be purchased)
    // Actually, 'view-list' is "All Orders" or "Pending"? 
    // The previous code had `renderList` showing Pending. 
    // Let's keep view-list for 'New Orders' (Pending).

    setBadge('view-purchase', counts.pending); // Purchase needs to process Pending items
    setBadge('view-korea', counts.ordered);    // Warehouse needs to process Ordered items
    setBadge('view-hongkong', counts.shipped); // Delivery needs to process Shipped items
    setBadge('view-finance', counts.completed); // Finance needs to process Completed items
}

// --- LISTS ---
// --- LISTS ---
function renderList(term = '') {
    // Ensure term is a string
    const searchTerm = (typeof term === 'string' ? term : '').toLowerCase();

    // Filters
    const statusFilter = dom.filterStatus ? dom.filterStatus.value : 'All';
    const productFilter = dom.filterProduct ? dom.filterProduct.value.toLowerCase().trim() : '';
    const dateStart = dom.filterDateStart ? dom.filterDateStart.value : '';
    const dateEnd = dom.filterDateEnd ? dom.filterDateEnd.value : '';

    // Check if list container exists
    if (!dom.lists.all) return;

    dom.lists.all.innerHTML = '';

    // fetch ALL orders
    let items = [...STATE.orders];

    // 1. Status Filter
    if (statusFilter !== 'All') {
        items = items.filter(o => o.status === statusFilter);
    }

    // 2. Product Filter (Exact-ish match or contains)
    if (productFilter) {
        items = items.filter(o => (o.product_name || '').toLowerCase().includes(productFilter));
    }

    // 3. Date Filter
    if (dateStart) {
        items = items.filter(o => o.order_date >= dateStart);
    }
    if (dateEnd) {
        items = items.filter(o => o.order_date <= dateEnd);
    }

    // 4. Search Filter (Customer ONLY)
    if (searchTerm) {
        items = items.filter(o =>
            (o.customer_id || '').toLowerCase().includes(searchTerm)
        );
    }

    // Sort Descending (Newest First)
    items.sort((a, b) => b.order_date.localeCompare(a.order_date)); // desc

    // Update Count Display
    if (dom.listResultCount) {
        dom.listResultCount.textContent = `${items.length} 건`;
    }

    if (!items.length) {
        dom.lists.all.innerHTML = renderEmptyMsg('표시할 내역이 없습니다.<br>(No History)');
        return;
    }

    items.forEach(o => dom.lists.all.appendChild(createCard(o)));
}

function setDateFilter(mode) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (mode === 'today') {
        dom.filterDateStart.value = todayStr;
        dom.filterDateEnd.value = todayStr;
    } else if (mode === 'month') {
        dom.filterDateStart.value = `${yyyy}-${mm}-01`;
        const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
        dom.filterDateEnd.value = `${yyyy}-${mm}-${lastDay}`;
    } else if (mode === 'reset') {
        dom.filterDateStart.value = '';
        dom.filterDateEnd.value = '';
        dom.filterStatus.value = 'All';
        dom.filterProduct.value = '';
        dom.searchInput.value = '';
    }
    // Trigger render
    renderList(dom.searchInput.value);
}



function renderPurchaseList() {
    dom.lists.purchase.innerHTML = '';
    // Removed automatic clearing to support 'toggleSelectAll' flow
    // STATE.selectedBatchIds.clear(); 
    updateBulkUI();

    // STRICT: Only Pending
    const items = getOrdersByStatus('Pending');

    if (!items.length) {
        dom.lists.purchase.innerHTML = renderEmptyMsg('매입 대기중인 주문이 없습니다.<br>(No Pending Orders)');
        return;
    }

    items.forEach(o => {
        const div = createCard(o);
        const isSelected = STATE.selectedBatchIds.has(o.order_id);
        const chk = createCheckbox((checked) => {
            if (checked) STATE.selectedBatchIds.add(o.order_id);
            else STATE.selectedBatchIds.delete(o.order_id);
            updateBulkUI();
            updateHeaderCheckbox('purchase', STATE.selectedBatchIds.size === items.length);
        });
        chk.checked = isSelected;

        // Click action: Open Purchase Modal
        wrapCardWithAction(div, chk, () => openPurchaseModal(o));
        dom.lists.purchase.appendChild(div);
    });

    // Initial Header Checkbox State
    updateHeaderCheckbox('purchase', items.length > 0 && STATE.selectedBatchIds.size === items.length);
}

function toggleSelectAll(type, isSelected) {
    if (type === 'purchase') {
        const items = getOrdersByStatus('Pending');
        items.forEach(o => {
            if (isSelected) STATE.selectedBatchIds.add(o.order_id);
            else STATE.selectedBatchIds.delete(o.order_id);
        });
        renderPurchaseList();
    } else if (type === 'korea') {
        const items = getOrdersByStatus('Ordered');
        items.forEach(o => {
            if (isSelected) STATE.selectedKoreaIds.add(o.order_id);
            else STATE.selectedKoreaIds.delete(o.order_id);
        });
        renderKoreaList();
    } else if (type === 'finance') {
        const items = getOrdersByStatus('Completed');
        items.forEach(o => {
            if (isSelected) STATE.selectedFinanceIds.add(o.order_id);
            else STATE.selectedFinanceIds.delete(o.order_id);
        });
        renderFinanceList();
    }
}

function updateHeaderCheckbox(type, isChecked) {
    if (type === 'purchase') {
        if (dom.cbAllPurchase) dom.cbAllPurchase.checked = isChecked;
    } else if (type === 'korea') {
        if (dom.cbAllKorea) dom.cbAllKorea.checked = isChecked;
    } else if (type === 'finance') {
        if (dom.cbAllFinance) dom.cbAllFinance.checked = isChecked;
    }
}

function renderKoreaList() {
    dom.lists.korea.innerHTML = '';
    // Removed automatic clearing
    // STATE.selectedKoreaIds.clear();

    // STRICT: Only Ordered
    const items = getOrdersByStatus('Ordered');

    if (!items.length) {
        dom.lists.korea.innerHTML = renderEmptyMsg('배대지 발송 대기중인 물건이 없습니다.<br>(No Ordered Items)');
        return;
    }

    // Dynamic Ship Button
    const btnShip = document.createElement('button');
    btnShip.className = 'btn-primary';
    btnShip.style.display = 'none';
    btnShip.style.marginBottom = '10px';
    btnShip.onclick = openKoreaModal;
    dom.lists.korea.appendChild(btnShip);

    items.forEach(o => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.borderLeft = '4px solid #3b82f6';
        div.style.display = 'flex';
        div.style.alignItems = 'center';

        const isSelected = STATE.selectedKoreaIds.has(o.order_id);
        const chk = createCheckbox((checked) => {
            if (checked) STATE.selectedKoreaIds.add(o.order_id);
            else STATE.selectedKoreaIds.delete(o.order_id);

            // Update Header Checkbox State
            updateHeaderCheckbox('korea', STATE.selectedKoreaIds.size === items.length);

            if (STATE.selectedKoreaIds.size > 0) {
                btnShip.style.display = 'block';
                btnShip.textContent = `${STATE.selectedKoreaIds.size}건 배대지 발송`;
            } else {
                btnShip.style.display = 'none';
            }
        });
        chk.checked = isSelected;

        div.innerHTML = `
            <div style="flex:1; margin-left:10px;">
                 <div class="card-header"><span class="card-title">${o.product_name}</span></div>
                 <div class="card-subtitle">${o.customer_id} | ${o.option}</div>
            </div>
        `;
        div.prepend(chk);
        dom.lists.korea.appendChild(div);
    });

    // Initial Header Checkbox State
    updateHeaderCheckbox('korea', items.length > 0 && STATE.selectedKoreaIds.size === items.length);

    // Initial Button State
    if (STATE.selectedKoreaIds.size > 0) {
        btnShip.style.display = 'block';
        btnShip.textContent = `${STATE.selectedKoreaIds.size}건 배대지 발송`;
    } else {
        btnShip.style.display = 'none';
    }
}

function renderHongKongList(term = '') {
    if (!dom.lists.hk) return;
    dom.lists.hk.innerHTML = '';

    const searchTerm = (typeof term === 'string' ? term : '').toLowerCase().trim();

    // STRICT: Only Shipped_to_HK
    let items = getOrdersByStatus('Shipped_to_HK');

    // Filter by Search Term (Customer ID only per request "Nickname Search")
    if (searchTerm) {
        items = items.filter(o =>
            (o.customer_id || '').toLowerCase().includes(searchTerm)
        );
    }

    if (!items.length) {
        dom.lists.hk.innerHTML = renderEmptyMsg('도착 대기중인 물건이 없습니다.<br>(No Shipped Items)');
        return;
    }

    // Group by Customer - Ensure filtered items are still grouped correctly
    const groups = {};
    items.forEach(o => {
        const key = o.customer_id;
        if (!groups[key]) groups[key] = [];
        groups[key].push(o);
    });

    Object.keys(groups).forEach(customer => {
        const bundle = groups[customer];
        const count = bundle.length;
        const first = bundle[0];

        // Create Bundle Card
        const div = document.createElement('div');
        div.className = 'card';
        div.style.borderLeft = '4px solid #10b981'; // Emerald
        div.onclick = () => openHkModal(bundle); // Pass array

        // Summary string
        const itemSummary = bundle.map(o => `${o.product_name} (${o.option})`).join(', ');
        const displaySummary = itemSummary.length > 50 ? itemSummary.substring(0, 50) + '...' : itemSummary;

        div.innerHTML = `
            <div class="card-header">
                <span class="card-title">${customer} <span style="font-size:0.8em; color:#666;">(${count} items)</span></span>
                <span class="badge shipped_to_hk">도착 (Arrived)</span>
            </div>
            <div class="card-subtitle">
                ${displaySummary}
            </div>
            <div class="card-details">
                <span style="color:#64748b;">합배송 처리 (Bundle Ship)</span>
                <span class="cost-display">${first.order_date.substring(5)}~</span>
            </div>
        `;
        dom.lists.hk.appendChild(div);
    });
}

// --- HK DELIVERY ACTION ---
// (Moved below)

function renderFinanceList() {
    dom.lists.finance.innerHTML = '';
    // Removed automatic clearing
    // STATE.selectedFinanceIds.clear();

    // STRICT: Only Completed
    const items = getOrdersByStatus('Completed');

    if (!items.length) {
        dom.lists.finance.innerHTML = renderEmptyMsg('정산 대기중인 건이 없습니다.<br>(No Completed Items)');
        return;
    }

    // Dynamic Settle Button
    const btnSettle = document.createElement('button');
    btnSettle.className = 'btn-primary';
    btnSettle.style.display = 'none';
    btnSettle.style.marginBottom = '10px';
    btnSettle.onclick = openSettlementModal; // Change to open Modal
    dom.lists.finance.appendChild(btnSettle);

    items.forEach(o => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.borderLeft = '4px solid #10b981';
        div.style.display = 'flex'; // Use flex for checkbox alignment

        // Calculate Profit for display
        const rate = STATE.exchangeRate;
        const rev = (Number(o.price_hkd) || 0) * rate;
        const cost = (Number(o.cost_krw) || 0) + (Number(o.ship_fee_krw) || 0);
        const profit = rev - cost - ((Number(o.local_fee_hkd) || 0) * rate);

        div.innerHTML = `
            <div style="flex:1;">
                <div class="card-header">
                    <span class="card-title">${o.product_name}</span>
                    <span class="badge completed">${o.status}</span>
                </div>
                <div class="card-subtitle">
                   ${o.customer_id} | ${o.tracking_no || '-'}
                </div>
                <div class="card-details">
                    <span class="price-display" style="color:#10b981">Profit: ${Math.round(profit).toLocaleString()} KRW</span>
                    <span class="cost-display">${Number(o.cost_krw).toLocaleString()} + ${Number(o.ship_fee_krw).toLocaleString()} (KRW)</span>
                </div>
            </div>
        `;

        // Add Checkbox
        const isSelected = STATE.selectedFinanceIds.has(o.order_id);
        const chk = createCheckbox((checked) => {
            if (checked) STATE.selectedFinanceIds.add(o.order_id);
            else STATE.selectedFinanceIds.delete(o.order_id);

            // Update Header Checkbox State
            updateHeaderCheckbox('finance', STATE.selectedFinanceIds.size === items.length);

            if (STATE.selectedFinanceIds.size > 0) {
                btnSettle.style.display = 'block';
                btnSettle.textContent = `${STATE.selectedFinanceIds.size}건 일괄 정산`;
            } else {
                btnSettle.style.display = 'none';
            }
        });
        chk.checked = isSelected;

        // Wrap chk and content
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.width = '100%';
        wrapper.onclick = (e) => {
            // Let click pass to checkbox if not clicked directly?
            // Or allow clicking card to toggle? 
            // Better to just let checkbox handle it for consistency with other tabs
            // Or click card to "Edit"? No edit in Finance usually.
        };

        div.prepend(chk); // Prepend to flex container 'div'
        // Wait, 'div' innerHTML replaced content. 
        // Need to structure correctly.
        // div is flex. chk is first child. div content is second child.
        // The innerHTML set above sets the content.
        // So prepend works.

        dom.lists.finance.appendChild(div);
    });

    // Initial Header Checkbox State
    updateHeaderCheckbox('finance', items.length > 0 && STATE.selectedFinanceIds.size === items.length);

    // Initial Button State
    if (STATE.selectedFinanceIds.size > 0) {
        btnSettle.style.display = 'block';
        btnSettle.textContent = `${STATE.selectedFinanceIds.size}건 일괄 정산`;
    } else {
        btnSettle.style.display = 'none';
    }
}

// =========================================
// 7.1 DASHBOARD INTERACTION
// =========================================
function showStatDetails(type) {
    const filter = dom.dashboardDateFilter.value;
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);

    // Filter Items
    const items = STATE.orders.filter(o => {
        // Common Logic with RenderDashboard
        const s = (o.status || 'Pending').toLowerCase().trim();
        let matchDate = false;

        // For Settlement Needed (Cost), it ignores date filter
        if (type === 'cost') {
            return s === 'completed';
        }

        // For others, apply date filter
        if (filter === 'all') matchDate = true;
        else if (filter === 'today' && o.order_date === today) matchDate = true;
        else if (filter === 'month' && o.order_date.startsWith(currentMonth)) matchDate = true;

        if (!matchDate) return false;

        // Type specific filter
        if (type === 'revenue') return true; // All items contribute to Revenue if matched
        if (type === 'profit') return true; // All items contribute to Profit logic
        return false;
    });

    // Render List
    dom.listModalContent.innerHTML = '';
    const t = TRANS[STATE.lang];

    // Set Title
    if (type === 'revenue') dom.listModalTitle.textContent = t.revenue;
    if (type === 'profit') dom.listModalTitle.textContent = t.profit;
    if (type === 'cost') dom.listModalTitle.textContent = t.settlement_needed;

    if (!items.length) {
        dom.listModalContent.innerHTML = renderEmptyMsg('Empty');
    } else {
        items.forEach(o => {
            // Simplified Card
            const div = document.createElement('div');
            div.style.padding = '10px';
            div.style.borderBottom = '1px solid #eee';
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.alignItems = 'center';

            // Calc specific value
            let val = '';
            const rate = STATE.exchangeRate;
            if (type === 'revenue') val = `HKD ${o.price_hkd}`;
            if (type === 'cost') val = `KRW ${(Number(o.cost_krw || 0) + Number(o.ship_fee_krw || 0)).toLocaleString()}`;
            if (type === 'profit') {
                const revKrw = (Number(o.price_hkd) || 0) * rate;
                const cost = (Number(o.cost_krw) || 0) + (Number(o.ship_fee_krw) || 0);
                const localKrw = (Number(o.local_fee_hkd) || 0) * rate;
                val = `KRW ${Math.round(revKrw - cost - localKrw).toLocaleString()}`;
            }

            div.innerHTML = `
                <div>
                    <div style="font-weight:bold; font-size:14px;">${o.product_name}</div>
                    <div style="font-size:12px; color:#666;">${o.customer_id}</div>
                </div>
                <div style="font-weight:bold; color:${type === 'cost' ? '#ef4444' : (type === 'profit' ? '#10b981' : '#2563eb')}">${val}</div>
            `;
            dom.listModalContent.appendChild(div);
        });
    }

    dom.modals.list.style.display = 'flex';
}


// =========================================
function toggleProfitMode() {
    console.log('Toggle Profit Mode');
    showStatDetails('profit');
}

// =========================================
// 8. ACTIONS & MODALS
// =========================================

// --- PURCHASE ACTION ---
function openPurchaseModal(order, isBatch = false) {
    STATE.isBatchMode = isBatch;
    dom.modalInpKrw.value = '';

    if (isBatch) {
        STATE.selectedPurchaseId = null;
        dom.purchaseItemName.textContent = `${STATE.selectedBatchIds.size}건 일괄 매입`;
    } else {
        STATE.selectedPurchaseId = order.order_id;
        dom.purchaseItemName.textContent = order.product_name;
    }

    dom.modals.purchase.style.display = 'flex';
    dom.modalInpKrw.focus();
}

function closePurchaseModal() {
    dom.modals.purchase.style.display = 'none';
    STATE.isBatchMode = false;
    STATE.selectedPurchaseId = null;
}

async function sendBatchUpdate(dataList) {
    if (CONFIG.IS_MOCK) return;
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        body: JSON.stringify({
            action: 'updateOrders',
            auth: STATE.auth,
            data: dataList
        })
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
}

async function savePurchaseCost() {
    const totalCost = parseInt(dom.modalInpKrw.value);
    if (!totalCost || totalCost < 0) return alert('금액을 확인해주세요.');

    const count = STATE.isBatchMode ? STATE.selectedBatchIds.size : 1;
    let name = STATE.isBatchMode ? `${count}건 일괄` : dom.purchaseItemName.textContent;

    // 1/N Logic
    const perItemCost = count > 0 ? Math.round(totalCost / count) : 0;

    let itemListStr = '';
    if (STATE.isBatchMode) {
        // Find all selected orders
        const selectedOrders = STATE.orders.filter(o => STATE.selectedBatchIds.has(o.order_id));
        itemListStr = selectedOrders.map(o => `- ${o.product_name} (${o.option}) x${o.qty}`).join('\n');
    } else {
        // Single item
        const o = STATE.orders.find(ord => ord.order_id === STATE.selectedPurchaseId);
        if (o) itemListStr = `- ${o.product_name} (${o.option}) x${o.qty}`;
        if (!name) name = itemListStr;
    }

    if (!confirm(`[매입 확정]\n\n매입가 Total: KRW ${totalCost.toLocaleString()}\n(개당 약 ${perItemCost.toLocaleString()}원)\n\n[대상 목록]\n${itemListStr}\n\n저장하시겠습니까?`)) return;

    showLoading();
    try {
        const updates = [];
        if (STATE.isBatchMode) {
            STATE.selectedBatchIds.forEach(id => {
                updates.push({ order_id: id, cost_krw: perItemCost, status: 'Ordered' }); // Use perItemCost
            });
        } else {
            updates.push({ order_id: STATE.selectedPurchaseId, cost_krw: perItemCost, status: 'Ordered' });
        }

        // Use Batch Update
        await sendBatchUpdate(updates);

        // Critical: Clear selection after success
        if (STATE.isBatchMode) STATE.selectedBatchIds.clear();

        closePurchaseModal();
        loadData();
        showToast('저장되었습니다.');
    } catch (e) { alert(e.message); }
    finally { hideLoading(); }
}

// --- KOREA SHIP ACTION ---
function openKoreaModal() {
    console.log('Open Korea Modal');
    dom.koreaModalDesc.textContent = `${STATE.selectedKoreaIds.size}건 합배송 처리`;
    dom.inpShipTotal.value = '';
    dom.modals.korea.style.display = 'flex';
}

async function saveKoreaShipping() {
    console.log('Save Korea Shipping Clicked');
    const total = parseInt(dom.inpShipTotal.value) || 0;
    const count = STATE.selectedKoreaIds.size;
    const perItem = count > 0 ? Math.round(total / count) : 0;

    // Build Item List
    const selectedOrders = STATE.orders.filter(o => STATE.selectedKoreaIds.has(o.order_id));
    const itemListStr = selectedOrders.map(o => `- ${o.product_name} (${o.option}) [${o.customer_id}]`).join('\n');

    if (!confirm(`[배대지 발송]\n\n총 ${count}건 / 배송비 Total: KRW ${total.toLocaleString()}\n(개당 약 ${perItem.toLocaleString()}원)\n\n[발송 목록]\n${itemListStr}\n\n발송 처리하시겠습니까?`)) return;

    showLoading();
    try {
        const updates = [];
        STATE.selectedKoreaIds.forEach(id => {
            updates.push({ order_id: id, ship_fee_krw: perItem, status: 'Shipped_to_HK' });
        });

        // Use Batch Update
        await sendBatchUpdate(updates);

        // Critical: Clear selection
        STATE.selectedKoreaIds.clear();

        dom.modals.korea.style.display = 'none';
        loadData();
        showToast('배대지 발송 처리되었습니다.');
    } catch (e) { alert(e.message); }
    finally { hideLoading(); }
}

// --- HK DELIVERY ACTION ---
function openHkModal(bundleOrOrder) {
    // Determine if bundle or single (though we switched to bundle only view)
    const bundle = Array.isArray(bundleOrOrder) ? bundleOrOrder : [bundleOrOrder];

    STATE.currentHkBundle = bundle; // Store for save
    const first = bundle[0];

    // Populate Modal
    dom.hkModalDesc.innerHTML = `
        <div style="font-weight:bold; font-size:1.1em;">${first.customer_id}</div>
        <div style="margin-top:5px; font-size:0.9em; color:#555;">
            ${bundle.map(o => `- ${o.product_name} (${o.option})`).join('<br>')}
        </div>
        <div style="margin-top:5px; font-weight:bold;">Total: ${bundle.length} items</div>
    `;

    // Address & Tracking (Use first's if available to pre-fill)
    dom.inpDeliveryAddress.value = first.address || '';
    dom.inpTracking.value = first.tracking_no || '';
    dom.inpLocalFee.value = first.local_fee_hkd || 0;

    dom.modals.hk.style.display = 'flex';
}

async function saveHongKongDelivery() {
    if (!dom.inpDeliveryAddress.value.trim()) {
        return alert('주소(Address)는 필수입니다.');
    }

    const bundle = STATE.currentHkBundle || [];
    if (!bundle.length) return;

    const commonData = {
        delivery_method: dom.selDeliveryMethod.value,
        address: dom.inpDeliveryAddress.value,
        tracking_no: dom.inpTracking.value, // Ensure this matches dom map
        status: 'Completed'
    };

    // Local Fee Logic: 
    // Usually local fee is per shipment, not per item?
    // If user enters 30 HKD, should we split it or apply to one?
    // Let's apply to the first item (or split). 
    // Simplest: Apply full fee to first item, 0 for others to avoid double counting revenue?
    // OR: Ask user? Defaults: Apply to First item seems safest for "Per Shipment" cost.
    const totalFee = parseInt(dom.inpLocalFee.value) || 0;

    const updates = bundle.map((o, idx) => {
        return {
            order_id: o.order_id,
            ...commonData,
            local_fee_hkd: idx === 0 ? totalFee : 0 // Charge fee once per bundle
        };
    });

    const msg = `[홍콩 배송 완료]\n\n고객: ${bundle[0].customer_id}\n배송: ${commonData.delivery_method} / ${commonData.tracking_no}\n비용: HKD ${totalFee}\n\n총 ${bundle.length}건을 완료 처리하시겠습니까?`;

    if (!confirm(msg)) return;

    showLoading();
    try {
        // Send batch update
        // We can reuse 'updateOrders' action if we created it? code.js has 'updateOrders'.
        // Or loop sendUpdate. Code.js 'updateOrders' is designed for batch.
        // Let's check Code.js... yes it has updateOrders. Use it for efficiency.

        // Wait, app.js sendUpdate is single. Let's make a batch helper or just loop.
        // Looping is safer if we didn't expose batch update in app.js client yet.
        // Code.js has 'createOrders' exposed. 'updateOrders' is exposed in doPost.

        // Let's try batch first if possible, else loop.
        // For safety/speed, let's just loop sequentially or parallel.

        // Parallel Loop
        await sendBatchUpdate(updates);

        // Clear selection if any (though HK uses bundle)
        // STATE.selected... HK doesn't have bulk select UI yet beyond bundle

        dom.modals.hk.style.display = 'none';
        loadData();
        showToast('배송 완료 처리되었습니다.');
    } catch (e) { alert(e.message); }
    finally { hideLoading(); }
}

// --- BULK SETTLEMENT ---
// --- BULK SETTLEMENT ---
function openSettlementModal() {
    dom.settlementDesc.textContent = `${STATE.selectedFinanceIds.size}건 정산`;
    dom.inpSettleTotal.value = '';
    dom.modals.settlement.style.display = 'flex';
    dom.inpSettleTotal.focus();
}

async function saveBulkSettlement() {
    const totalAvailable = parseInt(dom.inpSettleTotal.value);
    if (!totalAvailable || totalAvailable <= 0) return alert('정산 금액을 입력해주세요.');

    if (!confirm(`총 ${totalAvailable.toLocaleString()} KRW로 정산을 진행하시겠습니까?`)) return;

    showLoading();
    try {
        const updates = [];
        let remaining = totalAvailable;
        const rate = STATE.exchangeRate;

        // items to process
        const items = STATE.orders.filter(o => STATE.selectedFinanceIds.has(o.order_id));

        // Sort items? Maybe by Date (FIFO)? Or just arbitrary?
        // Let's sort by date asc to settle oldest first
        items.sort((a, b) => a.order_date.localeCompare(b.order_date));

        for (const o of items) {
            if (remaining <= 0) break;

            const rev = (Number(o.price_hkd) || 0) * rate;
            const cost = (Number(o.cost_krw) || 0) + (Number(o.ship_fee_krw) || 0);
            const local = (Number(o.local_fee_hkd) || 0) * rate;
            const profit = Math.round(rev - cost - local);

            // Settle Need = Profit (Assuming we are settling Profit)
            // If Profit is negative, it's a loss, we should "Settle" it (acknowledge it)?
            // If Profit is 0 or negative, assume it requires 0 to settle? 
            // Or maybe user wants to cover costs?
            // "Settlement" usually means withdrawing profit.
            // Let's assume we settle positive profit.

            // Logic: Pay out 'Profit'.
            if (profit <= 0) {
                // Auto settle items with no profit? Or skip? 
                // Let's mark them settled as they don't consume 'Total Available'.
                updates.push({ order_id: o.order_id, status: 'Settled' });
                continue;
            }

            if (remaining >= profit) {
                // Full Settle
                updates.push({ order_id: o.order_id, status: 'Settled' });
                remaining -= profit;
            } else {
                // Partial Settle
                // We pay 'remaining'. The item keeps 'profit - remaining'.
                // How to store? Increase Cost by 'remaining'.
                // New Profit = Profit - remaining.

                const newCost = (Number(o.cost_krw) || 0) + remaining;
                const paidAmount = remaining;
                remaining = 0; // All used

                updates.push({
                    order_id: o.order_id,
                    cost_krw: newCost,
                    // Status remains 'Completed' (Not Settled)
                    remarks: (o.remarks || '') + ` [Partial Settle: ${paidAmount}]`
                });
            }
        }

        if (updates.length > 0) {
            await sendBatchUpdate(updates);

            // Clear selection
            STATE.selectedFinanceIds.clear();

            dom.modals.settlement.style.display = 'none';
            loadData();
            showToast('정산 처리가 완료되었습니다.');
        } else {
            alert('처리할 항목이 없습니다.');
        }

    } catch (e) { alert(e.message); }
    finally { hideLoading(); }
}

// =========================================
// 9. FORM & HELPERS
// =========================================

function openForm(order = null) {
    navigate('view-form');
    dom.form.container.innerHTML = '';

    // Clean up Footer (Left side)
    const footerLeft = document.getElementById('form-footer-left');
    if (footerLeft) footerLeft.innerHTML = '';

    // Ensure Save button is visible/reset text if needed (Static in footer, no need to recreate)
    // But we might want to change text based on Edit/Create? "저장하기" works for both.

    if (order) {
        // Edit Mode
        dom.form.title.textContent = '주문 수정';
        dom.form.id.value = order.order_id;
        dom.form.date.value = order.order_date;
        dom.form.customer.value = order.customer_id;
        dom.form.address.value = order.address || '';
        dom.form.remarks.value = order.remarks || '';

        // REFUND Button (Left)
        const btnRefund = document.createElement('button');
        btnRefund.className = 'btn-danger';
        btnRefund.innerText = '↩️ 환불 (Refund)';
        btnRefund.onclick = (e) => { e.preventDefault(); refundOrder(order); };
        if (footerLeft) footerLeft.appendChild(btnRefund);

        // RECEIPT Button (Left)
        const btnReceipt = document.createElement('button');
        btnReceipt.className = 'btn-secondary';
        btnReceipt.style.marginLeft = '12px'; // Added Gap
        btnReceipt.innerText = '🧾 Receipt';
        btnReceipt.onclick = (e) => { e.preventDefault(); showReceipt([order]); };
        if (footerLeft) footerLeft.appendChild(btnReceipt);

        addProductRow(order);
        // Allow adding more products only if Pending (Case Insensitive)
        const status = (order.status || 'Pending').toLowerCase();
        if (status === 'pending') {
            dom.form.btnAdd.style.display = 'block';
        } else {
            dom.form.btnAdd.style.display = 'none';
        }

    } else {
        // Create Mode
        dom.form.title.textContent = '새 주문 등록';
        dom.form.id.value = '';
        dom.form.date.value = new Date().toISOString().split('T')[0];
        dom.form.customer.value = '';
        dom.form.address.value = '';
        dom.form.remarks.value = '';

        addProductRow();
        dom.form.btnAdd.style.display = 'block';
    }
}

async function refundOrder(order) {
    if (!confirm('이 주문을 환불(취소) 처리하시겠습니까?\n매출 통계에서 제외됩니다.\n(Status -> Cancelled)')) return;

    showLoading();
    try {
        await sendUpdate({ order_id: order.order_id, status: 'Cancelled' });

        loadData();
        navigate('view-list');
        showToast('환불(취소) 처리되었습니다.');
    } catch (e) {
        alert(e.message);
    } finally {
        hideLoading();
    }
}


function addProductRow(data = null) {
    const div = document.createElement('div');
    div.className = 'product-row-card'; // New Modern Card Class

    div.innerHTML = `
        <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label" style="margin-bottom:4px;">상품명 (Product)</label>
            <input type="text" class="form-input inp-product" placeholder="상품을 선택하거나 입력하세요" data-i18n="ph_item_name" value="${data ? data.product_name : ''}" list="dl-products">
        </div>
        <div class="row" style="margin-bottom:12px; display:flex; gap:12px;">
             <div style="flex:2;">
                <label class="form-label" style="margin-bottom:4px;">옵션 (Option)</label>
                <input type="text" class="form-input inp-option" placeholder="S, M, Red..." data-i18n="ph_option" value="${data ? data.option : ''}" list="dl-options">
             </div>
             <div style="flex:1;">
                <label class="form-label" style="margin-bottom:4px;">수량 (Qty)</label>
                <input type="number" class="form-input inp-qty" placeholder="1" data-i18n="ph_qty" value="${data ? data.qty : '1'}">
             </div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
            <label class="form-label" style="margin-bottom:4px;">판매가 (HKD)</label>
            <input type="number" class="form-input inp-hkd" placeholder="0" data-i18n="ph_price" value="${data ? data.price_hkd : ''}">
        </div>
        <input type="hidden" class="inp-krw" value="${data ? data.cost_krw : 0}">
    `;
    dom.form.container.appendChild(div);
}

async function saveOrder() {
    console.log('Save Order Clicked');
    const rows = dom.form.container.querySelectorAll('.card');
    if (!rows.length) return alert('상품을 추가하세요');

    const common = {
        order_date: dom.form.date.value,
        customer_id: dom.form.customer.value,
        address: dom.form.address.value,
        remarks: dom.form.remarks.value,
        status: 'Pending',
        is_paid: true
    };

    if (!common.customer_id) return alert('고객명을 입력해주세요.');

    const orders = [];
    rows.forEach(row => {
        const prod = row.querySelector('.inp-product').value;
        if (prod) {
            orders.push({
                ...common,
                product_name: prod,
                option: row.querySelector('.inp-option').value,
                qty: row.querySelector('.inp-qty').value,
                price_hkd: row.querySelector('.inp-hkd').value,
                cost_krw: row.querySelector('.inp-krw').value
            });
        }
    });

    // Confirmation Manifest
    const msg = orders.map(o => `- ${o.product_name} / ${o.option} (x${o.qty}) : HKD ${o.price_hkd}`).join('\n');
    if (!confirm(`[주문 내용 확인]\n\n고객: ${common.customer_id}\n\n${msg}\n\n위 내용으로 저장하시겠습니까?`)) return;

    showLoading();
    try {
        const id = dom.form.id.value;
        if (id) {
            // Edit Mode: Update 1st, Create Others
            const primary = { ...orders[0], order_id: id };
            await sendUpdate(primary);

            // If new rows added
            if (orders.length > 1) {
                const newItems = orders.slice(1);
                const res = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'createOrders', auth: STATE.auth, data: newItems })
                });
                const json = await res.json();
                if (!json.success) throw new Error(json.message);
            }
        } else {
            if (CONFIG.IS_MOCK) {
                // Mock insert
            } else {
                const res = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'createOrders', auth: STATE.auth, data: orders })
                });
                const json = await res.json();
                /* 
                   Create Mode에서는 곧바로 영수증을 보여주지 않고 대시보드로 이동합니다.
                   (사용자 요청: "신규주문인경우에는 영수중 확인경우 새주문등록에서는 안보여주고 기존주문 눌렀을때 확인할수있도록")
                */
            }
        }

        navigate('view-dashboard');
        loadData();
        showToast('저장되었습니다.');

    } catch (e) { alert(e.message); }
    finally { hideLoading(); }
}

function showReceipt(orderList) {
    // Calculate Total
    const total = orderList.reduce((sum, o) => sum + (Number(o.price_hkd) || 0), 0);
    const date = orderList[0].order_date;
    const customer = orderList[0].customer_id;
    const orderId = orderList[0].order_id || 'New Order';

    const html = `
        <div class="receipt-box">
            <div class="receipt-header">
                <div class="receipt-title">select.korea.hk</div>
                <div class="receipt-info">Date: ${date}</div>
                <div class="receipt-info">Order ID: ${orderId}</div>
                <div class="receipt-info">To: ${customer}</div>
            </div>
            
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th style="width:50%">Item</th>
                        <th style="width:15%">Qty</th>
                        <th style="text-align:right">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderList.map(o => `
                        <tr>
                            <td>
                                <div>${o.product_name}</div>
                                <div style="font-size:11px; color:#64748b;">${o.option || '-'}</div>
                            </td>
                            <td>${o.qty}</td>
                            <td style="text-align:right">HKD ${o.price_hkd}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="receipt-total">
                Total: HKD ${total.toLocaleString()}
            </div>

            <div class="receipt-footer">
                Thank you for shopping with us!<br>
                @select.korea.hk
            </div>
        </div>
        <div style="text-align:center; margin-top:20px; display:flex; gap:10px; justify-content:center;">
             <button onclick="saveReceiptImage()" 
                class="btn-primary" style="width:auto; padding:10px 20px; background:#f59e0b; color:black;">
                💾 ${TRANS[STATE.lang].receipt_save || 'Save Image'}
             </button>
             <button onclick="dom.modals.list.style.display='none'; if(!STATE.selectedPurchaseId) loadData();" 
                class="btn-primary" style="width:auto; padding:10px 30px;">
                닫기 (Close)
             </button>
        </div>
    `;

    dom.listModalTitle.textContent = TRANS[STATE.lang].receipt_title;
    dom.listModalContent.innerHTML = html;
    dom.modals.list.style.display = 'flex';
}

function saveReceiptImage() {
    const element = document.querySelector('.receipt-box');
    html2canvas(element, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `receipt_${new Date().getTime()}.png`;
        link.href = canvas.toDataURL();
        link.click();
    });
}


// Helpers
function createCard(order, simple = false) {
    const el = document.createElement('div');
    el.className = 'card';
    if (!simple) el.onclick = () => openForm(order);

    let badgeClass = (order.status || 'pending').toLowerCase();
    // Map specific statuses to CSS classes
    if (badgeClass === 'shipped_to_hk') badgeClass = 'shipped_to_hk'; // Ensure matches CSS

    // Normalize logic: Replace space with underscore just in case standard status changes
    badgeClass = badgeClass.replace(/ /g, '_');

    // Translate Status
    // const statusKey = `status_${badgeClass}`; // Not used since we display raw status
    const displayStatus = order.status; // NEVER TRANSLATE STATUS per user request

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${order.product_name}</span>
            <span class="badge ${badgeClass}">${displayStatus}</span>
        </div>
        <div class="card-subtitle">
            ${order.customer_id} | ${order.option} (x${order.qty})
        </div>
        <div class="card-details">
            <span class="price-display">HKD ${order.price_hkd}</span>
            <span class="cost-display">${order.order_date.substring(5)}</span>
        </div>
    `;
    return el;
}


function createCheckbox(onChange) {
    // Container for custom style
    const container = document.createElement('div');
    container.className = 'custom-checkbox-container';
    container.style.marginRight = '10px';
    container.onclick = (e) => e.stopPropagation();

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.className = 'custom-checkbox'; // NEW CLASS
    // Removed inline styles that conflict with CSS
    chk.onchange = (e) => onChange(e.target.checked);

    // Expose 'checked' property on container for easier access if needed, 
    // but app logic uses the input element returned? 
    // Wait, createCheckbox returns 'chk' (input) in original code.
    // If we wrap it, we need to append the wrapper to DOM, but return input or handle it?
    // Current usage: div.prepend(chk); chk.checked = ...
    // So we should return the Container, but expose the input's checked property?
    // Or just return the input and let the caller wrap it? 

    // Better: Return the wrapper, and have a property/method to set checked?
    // Quickest fix for current logic: 
    // Just return the input, but it needs to be inside the wrapper in the DOM.
    // So createCheckbox should return the Wrapper, but we need to access the input inside.

    container.appendChild(chk);

    // Monkey-patch the container to proxy 'checked' property for existing logic compatibility?
    Object.defineProperty(container, 'checked', {
        get: () => chk.checked,
        set: (v) => chk.checked = v
    });

    return container;
}

// Redefine createCard usage in bulk lists to allow easier wrapping
// (Removed duplicate older version)

function wrapCardWithAction(div, chk, action) {
    const inner = div.innerHTML;
    div.innerHTML = '';
    div.style.display = 'flex';
    div.onclick = null; // CRITICAL: Remove parent click event

    const content = document.createElement('div');
    content.style.flex = 1;
    content.innerHTML = inner;
    content.onclick = action; // Bind click to content only

    div.appendChild(chk);
    div.appendChild(content);
}


function renderEmptyMsg(txt) {
    return `<div style="text-align:center;color:#999;padding:20px;">${txt}</div>`;
}

function autoFillAddress() {
    const name = dom.form.customer.value;
    const found = STATE.orders.find(o => o.customer_id === name && o.address);
    if (found) dom.form.address.value = found.address;
}

function updateDatalists() {
    const c = new Set(), p = new Set(), o = new Set();
    STATE.orders.forEach(x => {
        if (x.customer_id) c.add(x.customer_id);
        if (x.product_name) p.add(x.product_name);
        if (x.option) o.add(x.option);
    });

    const fill = (id, set) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = '';
        set.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v;
            el.appendChild(opt);
        });
    };
    fill('dl-customers', c);
    fill('dl-products', p);
    fill('dl-options', o);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    dom.toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function showLoading() {
    dom.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    dom.loadingOverlay.style.display = 'none';
}

async function mockDataLoad() {
    STATE.orders = [
        { order_id: 'ORD-1', order_date: '2026-02-01', customer_id: 'test', product_name: 'Item A', option: 'Opt', qty: 1, status: 'Pending', price_hkd: 1000 },
        { order_id: 'ORD-2', order_date: '2026-02-02', customer_id: 'user', product_name: 'Item B', option: 'Opt', qty: 1, status: 'Ordered', price_hkd: 500, cost_krw: 70000 },
        { order_id: 'ORD-3', order_date: '2026-02-02', customer_id: 'vip', product_name: 'Item C', option: 'Opt', qty: 1, status: 'Completed', price_hkd: 2000, cost_krw: 250000, ship_fee_krw: 5000, local_fee_hkd: 30 }
    ];
    await new Promise(r => setTimeout(r, 500));
}


