

async function sendData(payload) {
    if (CONFIG.IS_MOCK) return { success: true, data: [] };
    const res = await fetch(CONFIG.API_URL, {
        method: 'POST', body: JSON.stringify(payload)
    });
    return await res.json();
}

async function sendBatchUpdate(updates) {
    const payload = { action: 'updateOrders', auth: STATE.auth, data: updates };
    console.log("[DEBUG] Sending Batch Update:", JSON.stringify(payload));

    try {
        const res = await sendData(payload);
        console.log("[DEBUG] Batch Update Response:", res);
        return res;
    } catch (e) {
        console.error("[DEBUG] Batch Update Failed:", e);
        throw e;
    }
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
