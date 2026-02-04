

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
