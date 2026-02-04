async function attemptAuth() {
    if (!dom.authCode.value) return showToast(t('msg_login_req'));
    showLoading();
    STATE.auth = dom.authCode.value;
    await loadData();
}

async function loadData() {
    showLoading();
    try {
        const res = await sendData({ action: 'getOrders', auth: STATE.auth });
        if (res && (res.success || res.result === 'success')) {
            STATE.orders = res.data || res.orders || [];
            dom.authOverlay.style.display = 'none';
            renderDashboard();
            if (window.updateCustomerSuggestions) window.updateCustomerSuggestions();
            if (STATE.selectedTab !== 'view-dashboard') navigate(STATE.selectedTab);
        } else {
            alert(t('msg_login_fail_prefix') + (res.message || t('msg_server_err')));
            dom.authOverlay.style.display = 'flex';
        }
    } catch (e) {
        console.error(e);
        showToast(t('msg_load_fail') + e.message);
    } finally {
        hideLoading();
    }
}

async function saveOrder() {
    const cust = dom.form.customer.value.trim();
    if (!cust) return alert(t('msg_no_cust'));

    const rows = Array.from(dom.form.container.children);
    const orders = [];

    for (const r of rows) {
        const p = r.querySelector('.inp-product').value.trim();
        const q = r.querySelector('.inp-qty').value;
        const price = r.querySelector('.inp-price').value;
        const opt = r.querySelector('.inp-option').value.trim();

        if (!p || !q || Number(q) <= 0 || !opt) return alert(t('msg_no_prod'));

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
        const res = await sendData({ action: 'createOrders', auth: STATE.auth, data: orders });
        if (res && res.success) {
            alert(t('msg_save_done'));
            navigate('view-list');
            loadData();
        } else {
            alert(t('msg_save_fail') + ": " + (res ? res.message : "Unknown Error"));
        }
    } catch (e) { console.error(e); alert(t('msg_save_fail')); }
    finally { hideLoading(); }
}

function openManagementMenu(order) {
    STATE.managementTargetId = order.order_id;
    if (order.status === 'Shipped_to_HK') {
        STATE.selectedHkIds.clear();
        STATE.selectedHkIds.add(order.customer_id);
        openHkDeliveryModal();
        return;
    }
    const { btnDelivery, btnReceipt, btnRefund, btnEdit, btnDelete } = getActionButtons();

    btnDelivery?.classList.add('hidden');
    btnReceipt?.classList.remove('hidden');
    btnRefund?.classList.remove('hidden');
    btnEdit?.classList.remove('hidden');
    btnDelete?.classList.remove('hidden');

    dom.mngSheet.classList.remove('hidden');
}

function getActionButtons() {
    return {
        btnDelivery: document.getElementById('btn-mng-delivery'),
        btnReceipt: document.getElementById('btn-mng-receipt'),
        btnRefund: document.getElementById('btn-mng-refund'),
        btnEdit: document.getElementById('btn-mng-edit'),
        btnDelete: document.getElementById('btn-mng-delete')
    };
}

function openHkDeliveryModal(mode = 'single') {
    const customerIds = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => customerIds.includes(o.customer_id) && o.status === 'Shipped_to_HK');

    if (relevantOrders.length === 0) return alert(t('msg_no_orders'));

    dom.modals.hk.dataset.mode = mode;
    dom.inpHkAddress.value = relevantOrders[0]?.address || '';
    dom.inpTracking.value = relevantOrders[0]?.tracking_no || '';
    dom.inpLocalFee.value = '';

    dom.hkInputContainer.classList.add('hidden');
    dom.btnHkNext.classList.add('hidden');
    dom.btnSaveHk.classList.add('hidden');

    if (mode === 'bulk') {
        dom.hkCustomerInfo.innerHTML = `<div style="text-align:center; font-weight:bold; margin-bottom:10px;">${t('lbl_ship_check')} (${relevantOrders.length}건)</div>`;
        dom.hkItemList.innerHTML = relevantOrders.map(o => `
            <div style="background:white; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:8px;">
                <div style="font-weight:bold; font-size:13px; color:#334155;">${o.customer_id}</div>
                <div style="font-size:12px; color:#64748b;">${o.product_name} (${o.option}) x${o.qty}</div>
                <div style="margin-top:5px; font-size:12px;">
                    <span style="display:block;">📍 ${o.address || `<span style="color:var(--danger)">${t('lbl_no_addr')}</span>`}</span>
                    <span style="display:block;">📦 ${o.tracking_no || `<span style="color:#94a3b8">${t('lbl_no_track')}</span>`}</span>
                </div>
            </div>
        `).join('');
        dom.btnSaveHk.classList.remove('hidden');
        dom.btnSaveHk.innerText = t('btn_complete_ship');
    } else {
        dom.hkCustomerInfo.innerHTML = `<strong>${customerIds.join(', ')}</strong><br>${t('lbl_total')} ${relevantOrders.length}${t('lbl_items')}`;
        dom.hkItemList.innerHTML = relevantOrders.map(o => `<div>- ${o.product_name} (${o.option})</div>`).join('');
        dom.hkInputContainer.classList.remove('hidden');
        dom.btnSaveHk.classList.remove('hidden');
        dom.btnSaveHk.innerText = t('btn_hk_save');
    }
    dom.modals.hk.classList.remove('hidden');
}

dom.modals.hk.classList.remove('hidden');
}

function saveBulkHongKongDelivery() {
    openHkDeliveryModal('bulk');
}

async function saveHongKongDelivery() {
    const mode = dom.modals.hk.dataset.mode;
    const ids = Array.from(STATE.selectedHkIds);
    if (ids.length === 0) return alert(t('msg_target_none'));

    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');
    if (relevantOrders.length === 0) return;

    let updates = [];
    if (mode === 'bulk') {
        // Bulk Complete: Validates Address -> Changes Status to Completed
        if (relevantOrders.some(o => !o.address || o.address.length < 5)) {
            return alert(t('msg_no_addr_bulk'));
        }
        updates = relevantOrders.map(o => ({ order_id: o.order_id, status: 'Completed' }));
    } else {
        // Single/Info Edit Mode: Updates Info ONLY -> Status REMAINS 'Shipped_to_HK'
        const address = dom.inpHkAddress.value.trim();
        const tracking = dom.inpTracking.value.trim();
        const localFee = dom.inpLocalFee.value.trim();

        if (!address || !tracking || !localFee) {
            return alert(t('msg_hk_incomplete_save'));
        }

        updates = relevantOrders.map(o => {
            let newFee = o.local_fee_hkd || 0;
            if (localFee !== '') {
                newFee = Number(localFee) / relevantOrders.length;
            }

            return {
                order_id: o.order_id,
                address: address || o.address || '',
                tracking_no: tracking || o.tracking_no || '',
                local_fee_hkd: newFee,
                status: 'Shipped_to_HK',
                remarks: (o.remarks || '') + (tracking && !(o.remarks || '').includes(tracking) ? ` [TC: ${tracking}]` : '')
            };
        });
    }

    showLoading();
    try {
        const res = await sendBatchUpdate(updates);

        if (!res || (!res.success && res.result !== 'success')) {
            throw new Error(res ? res.message : "NO_RES");
        }

        // Reliable Strategy: Wait for Google Sheets to update, then fetch fresh data
        showToast(t('msg_syncing'));
        await new Promise(r => setTimeout(r, 2500));

        showToast(mode === 'bulk' ? t('msg_ship_complete') : t('msg_info_updated'));

        if (mode === 'bulk') {
            STATE.selectedHkIds.clear();
        }

        dom.modals.hk.classList.add('hidden');

        // Fetch absolute fresh data from server
        await loadData();

    } catch (e) {
        console.error(e);
        alert(t('msg_save_fail') + ": " + e.message);
    }
    finally { hideLoading(); }
}

function toggleHkSelection(o) {
    if (STATE.selectedHkIds.has(o.customer_id)) STATE.selectedHkIds.delete(o.customer_id);
    else STATE.selectedHkIds.add(o.customer_id);
    renderHongKongList();
}

function openBatchModal(type) {
    if (type === 'purchase') {
        dom.modalInpKrw.value = '';
        dom.modals.purchase.classList.remove('hidden');
    }
    if (type === 'korea') {
        dom.inpShipTotal.value = '';
        dom.modals.korea.classList.remove('hidden');
    }
    if (type === 'settlement') {
        if (dom.inpSettleTotal) dom.inpSettleTotal.value = '';
        dom.modals.settlement.classList.remove('hidden');
    }
}

async function savePurchaseCost() {
    const cost = dom.modalInpKrw.value;
    if (!cost) return alert(t('msg_enter_cost'));
    if (STATE.selectedBatchIds.size === 0) return alert(t('msg_no_selection'));
    const updates = Array.from(STATE.selectedBatchIds).map(id => ({ order_id: id, cost_krw: Number(cost), status: 'Ordered' }));
    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert(t('msg_purchase_done'));
        STATE.selectedBatchIds.clear();
        dom.modals.purchase.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); alert(t('msg_error')); }
    finally { hideLoading(); }
}

async function saveKoreaShipping() {
    const fee = dom.inpShipTotal.value;
    if (!fee) return alert(t('msg_enter_fee'));
    const count = STATE.selectedKoreaIds.size;
    if (count === 0) return alert(t('msg_no_selection'));
    const feePerItem = Number(fee) / count;
    const updates = Array.from(STATE.selectedKoreaIds).map(id => ({ order_id: id, ship_fee_krw: feePerItem, status: 'Shipped_to_HK' }));
    showLoading();
    try {
        await sendBatchUpdate(updates);
        alert(t('msg_send_done'));
        STATE.selectedKoreaIds.clear();
        dom.modals.korea.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); alert(t('msg_error')); }
    finally { hideLoading(); }
}

async function saveBulkHongKongDelivery() {
    if (STATE.selectedHkIds.size === 0) return alert(t('msg_select_ship'));
    const ids = Array.from(STATE.selectedHkIds);
    const relevantOrders = STATE.orders.filter(o => ids.includes(o.customer_id) && o.status === 'Shipped_to_HK');
    if (relevantOrders.some(o => !o.address || o.address.length < 5)) return alert(t('msg_no_addr_selection'));
    openHkDeliveryModal('bulk');
}

async function saveBulkSettlement() {
    if (STATE.selectedFinanceIds.size === 0) return alert(t('msg_select_settle'));
    const updates = Array.from(STATE.selectedFinanceIds).map(id => ({ order_id: id, status: 'Settled' }));
    showLoading();
    try {
        await sendBatchUpdate(updates);
        showToast(t('msg_settle_done'));
        STATE.selectedFinanceIds.clear();
        dom.modals.settlement.classList.add('hidden');
        loadData();
    } catch (e) { console.error(e); }
    finally { hideLoading(); }
}

function showReceipt(order) {
    dom.modals.receipt.classList.remove('hidden');
    document.getElementById('rcpt-date').innerText = order.order_date;
    document.getElementById('rcpt-id').innerText = '#' + order.order_id.slice(-5);
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
    if (typeof html2canvas === 'undefined') return alert(t('msg_no_lib'));
    showLoading();
    html2canvas(paper, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Receipt_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas.toDataURL();
        link.click();
        hideLoading();
        showToast(t('msg_img_saved'));
    }).catch(err => {
        console.error(err);
        hideLoading();
        alert(t('msg_img_fail'));
    });
}
