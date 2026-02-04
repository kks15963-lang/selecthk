

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

function renderDashboard() {
    let profit = 0, revenue = 0, cost = 0, pendingSettle = 0;
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
        if (o.status === 'Completed') counts.completed++; // Exclude Settled

        // Pending Settlement Amount (Completed Status)
        if (o.status === 'Completed') {
            const p = Number(o.price_hkd) || 0;
            const c = Number(o.cost_krw) || 0;
            const s = Number(o.ship_fee_krw) || 0;
            const l = Number(o.local_fee_hkd) || 0;
            if (STATE.currencyMode === 'KRW') {
                pendingSettle += (p * STATE.exchangeRate) - (c + (s * STATE.exchangeRate) + (l * STATE.exchangeRate));
            } else {
                pendingSettle += p - (c / STATE.exchangeRate) - s - l;
            }
        }

        if (o.status === 'Settled' || o.status === 'Completed') { // Revenue/Cost includes both or just settled?
            // Usually Revenue/Cost should reflect "Sales" regardless of settlement status?
            // Existing code only summed Revenue/Cost for 'Settled'. 
            // Logic in lines 36-39 was: 
            /*
            if (o.status === 'Settled') {
                revenue += p; 
                cost += c;
                profit += ...
            }
            */
            // I will Keep Revenue/Cost/Profit ONLY for Settled as per original logic, 
            // but I need to make sure I don't break Revenue/Cost numbers if they wanted 'Completed' included.
            // Original code: if (o.status === 'Settled') -> Calc Profit/Rev/Cost.
            // Wait, looking at original code: 
            // line 36: if (o.status === 'Settled') { ... }
            // So Revenue/Cost/Profit were ONLY calculated for Settled items.

            // BUT, wait. If 'Completed' items are not 'Settled', they don't count towards Revenue?
            // That seems correct for "Realized" stats.
            // So I will stick to: Profit/Rev/Cost -> Settled Only.
            // Pending Settle -> Completed Only.
        }

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
    if (dom.statPendingSettle) dom.statPendingSettle.textContent = Math.round(pendingSettle).toLocaleString();
    dom.statRevenue.textContent = revenue.toLocaleString();
    dom.statCost.textContent = Math.round(cost).toLocaleString();

    dom.badges.pending.textContent = counts.pending;
    dom.badges.ordered.textContent = counts.ordered;
    dom.badges.shippedKr.textContent = counts.shipped;
    dom.badges.completed.textContent = counts.completed;

    const lbl = document.getElementById('label-curr-mode');
    if (lbl) lbl.textContent = STATE.currencyMode;

    const settled = filtered.filter(o => o.status === 'Settled').slice(0, 20);
    dom.profitList.innerHTML = '';

    if (settled.length > 0) {
        const title = document.createElement('h3');
        Object.assign(title.style, { margin: '20px 0 10px 0', fontSize: '14px', color: '#64748b' });
        title.textContent = `${t('lbl_recent_settle')} (${settled.length})`;
        dom.profitList.appendChild(title);

        settled.forEach(o => {
            const el = document.createElement('div');
            el.className = 'card';
            const p = Number(o.price_hkd) || 0;
            const c_krw = Number(o.cost_krw) || 0;
            const s = Number(o.ship_fee_krw) || 0;
            const l = Number(o.local_fee_hkd) || 0;
            const rate = STATE.exchangeRate;
            const c_hkd = rate ? (c_krw / rate) : 0;
            const s_hkd = rate ? (s / rate) : 0;
            const profitVal = p - c_hkd - s_hkd - l;

            el.innerHTML = `
                <div class="card-header">
                    <span class="card-title">${o.product_name}</span>
                    <span class="badge completed">HKD ${Math.round(profitVal).toLocaleString()}</span>
                </div>
                <div class="card-subtitle">${o.customer_id} | ${o.order_date}</div>
                <div style="margin-top:8px; font-size:12px; color:#64748b; background:#f8fafc; padding:8px; border-radius:8px;">
                    <div style="display:flex; justify-content:space-between;"><span>${t('lbl_sell_price')}</span> <span>+ HKD ${p.toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>${t('lbl_buy_cost')}</span> <span>- HKD ${Math.round(c_hkd).toLocaleString()} (${c_krw.toLocaleString()}원)</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>${t('lbl_ship_cost')}</span> <span>- HKD ${Math.round(s_hkd).toLocaleString()}</span></div>
                    <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>${t('lbl_local_cost')}</span> <span>- HKD ${l.toLocaleString()}</span></div>
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
    renderPagination(list, items, renderOrderList, null, openManagementMenu);
}

function renderPurchaseList() {
    const list = dom.lists.purchase;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Pending');

    const batchBtn = document.getElementById('action-bar-purchase');
    if (STATE.selectedBatchIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-purchase').innerText = `${t('btn_batch_purchase')} (${STATE.selectedBatchIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderPurchaseList, (o) => {
        const has = STATE.selectedBatchIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedBatchIds.delete(o.order_id);
            else STATE.selectedBatchIds.add(o.order_id);
            renderPurchaseList();
        }, has, false, openManagementMenu);
    });
}

function renderKoreaList() {
    const list = dom.lists.korea;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Ordered');

    const batchBtn = document.getElementById('action-bar-korea');
    if (STATE.selectedKoreaIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-korea').innerText = `${t('btn_batch_korea')} (${STATE.selectedKoreaIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderKoreaList, (o) => {
        const has = STATE.selectedKoreaIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedKoreaIds.delete(o.order_id);
            else STATE.selectedKoreaIds.add(o.order_id);
            renderKoreaList();
        }, has, false, openManagementMenu);
    });
}

function renderHongKongList() {
    const list = dom.lists.hk;
    list.innerHTML = '';

    // Sort: items with address first
    let items = STATE.orders.filter(o => o.status === 'Shipped_to_HK');

    if (STATE.hkQuery) {
        const q = STATE.hkQuery;
        items = items.filter(o =>
            (o.customer_id && o.customer_id.toLowerCase().includes(q)) ||
            (o.product_name && o.product_name.toLowerCase().includes(q)) ||
            (o.order_id && o.order_id.toLowerCase().includes(q))
        );
    }

    items.sort((a, b) => {
        const hasA = (a.address && a.address.length > 5) ? 1 : 0;
        const hasB = (b.address && b.address.length > 5) ? 1 : 0;
        return hasB - hasA;
    });

    const batchBtn = document.getElementById('action-bar-hongkong');
    if (STATE.selectedHkIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-hk').innerText = `${t('btn_batch_hk')} (${STATE.selectedHkIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderHongKongList, (o) => {
        return createCard(o, () => toggleHkSelection(o), STATE.selectedHkIds.has(o.customer_id), false, openManagementMenu);
    });
}

function renderFinanceList() {
    const list = dom.lists.finance;
    list.innerHTML = '';
    const items = STATE.orders.filter(o => o.status === 'Completed');

    const batchBtn = document.getElementById('action-bar-finance');
    if (STATE.selectedFinanceIds.size > 0) {
        batchBtn.classList.remove('hidden');
        document.getElementById('btn-bulk-settle').innerText = `${t('btn_batch_settle')} (${STATE.selectedFinanceIds.size})`;
    } else batchBtn.classList.add('hidden');

    renderPagination(list, items, renderFinanceList, (o) => {
        const has = STATE.selectedFinanceIds.has(o.order_id);
        return createCard(o, () => {
            if (has) STATE.selectedFinanceIds.delete(o.order_id);
            else STATE.selectedFinanceIds.add(o.order_id);
            renderFinanceList();
        }, has, true); // Disable long press
    });
}

function renderPagination(container, items, renderFunc, createItemOverride = null, onLongPressFallback = null) {
    const { currentPage, itemsPerPage } = STATE.pagination;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = items.slice(start, start + itemsPerPage);

    const wrapper = document.createElement('div');
    wrapper.className = 'pagination-wrapper';

    const select = document.createElement('select');
    [10, 30, 50].forEach(n => {
        const opt = document.createElement('option');
        opt.value = n; opt.text = `${n} ${t('lbl_per_page')}`;
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
    container.appendChild(wrapper);

    pageItems.forEach(o => {
        // Pass fallback onLongPress if not overridden
        const card = createItemOverride ? createItemOverride(o) : createCard(o, null, false, false, onLongPressFallback);
        container.appendChild(card);
    });
}
