

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
