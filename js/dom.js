const dom = {};

function initDom() {
    Object.assign(dom, {
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
    });
}
