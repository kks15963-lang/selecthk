
let _components_currentRow = null;

function createCard(o, onClick, isSelected, disableLongPress = false, onLongPress = null) {
    const el = document.createElement('div');
    el.className = `card ${isSelected ? 'selected-glow' : ''}`;

    const isEntered = (o.status === 'Shipped_to_HK' && o.address && o.address.length > 5 && o.tracking_no && o.local_fee_hkd);
    const statusText = isEntered ? t('status_entered') : t(`status_${o.status.toLowerCase()}`);
    const badgeClass = isEntered ? 'completed' : o.status.toLowerCase();

    let warning = '';
    if (o.status === 'Shipped_to_HK' && !isEntered) {
        warning = `<div style="color:var(--danger); font-size:12px; font-weight:bold; margin-top:4px;">${t('warn_incomplete_hk')}</div>`;
    }

    let itemDetails = '';
    if (o.items && o.items.length > 0) {
        itemDetails = o.items.map(i => `
            <div style="font-size:13px; color:#334155; margin-top:4px; padding-top:4px; border-top:1px dashed #eee;">
                <span>${i.product_name}</span> <span style="color:#64748b;">(${i.option})</span> x${i.qty}
            </div>
        `).join('');
    } else {
        itemDetails = `<div class="card-subtitle" style="color:#64748b; font-size:13px;">${o.customer_id} | ${o.option} (x${o.qty})</div>`;
    }

    el.innerHTML = `
        <div class="card-header">
            <span class="card-title">${o.items && o.items.length > 1 ? `${t('lbl_total')} ${o.items.length}${t('lbl_items')}` : o.product_name}</span>
            <span class="badge ${badgeClass}">${statusText}</span>
        </div>
        ${o.items && o.items.length > 1 ? `<div style="font-size:12px; font-weight:bold; color:#475569; margin-bottom:4px;">${o.customer_id}</div>` : ''}
        ${itemDetails}
        ${warning}
        <div class="card-details" style="margin-top:8px;">
            <span>HKD ${Number(o.price_hkd).toLocaleString()}</span>
            <span style="color:#94a3b8">${o.order_date}</span>
        </div>
    `;

    if (o.status === 'Settled') {
        el.innerHTML += `
            <div style="margin-top:12px; padding-top:12px; border-top:1px dashed #e2e8f0; font-size:12px; color:#475569;">
                <div style="font-weight:bold; margin-bottom:4px;">📜 정산 및 배송 이력 (History)</div>
                <div style="display:flex; justify-content:space-between;"><span>배송방법:</span> <span>${o.delivery_method || '-'}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>송장번호:</span> <span>${o.tracking_no || '-'}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>배송주소:</span> <span style="text-align:right; max-width:60%;">${o.address || '-'}</span></div>
                <div style="margin:4px 0; border-bottom:1px solid #f1f5f9;"></div>
                <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>매입가(KRW):</span> <span>-${Number(o.cost_krw).toLocaleString()}</span></div>
                <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>배대지비용:</span> <span>-${Number(o.ship_fee_krw).toLocaleString()}</span></div>
                <div style="display:flex; justify-content:space-between; color:#ef4444;"><span>현지배송비:</span> <span>HKD -${Number(o.local_fee_hkd).toLocaleString()}</span></div>
            </div>
        `;
    }

    let isLongPress = false;

    el.onclick = (e) => {
        if (isLongPress) {
            e.stopImmediatePropagation();
            e.preventDefault();
            isLongPress = false;
            return;
        }
        if (onClick) onClick(e);
    };

    if (!disableLongPress && onLongPress) {
        let timer;
        const end = () => { clearTimeout(timer); el.classList.remove('pressing'); };
        const start = () => {
            isLongPress = false;
            el.classList.add('pressing');
            timer = setTimeout(() => {
                isLongPress = true;
                el.classList.remove('pressing');
                if (navigator.vibrate) navigator.vibrate(50);
                onLongPress(o);
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

function openForm(data = null, navigateFn) {
    navigateFn('view-form');
    dom.form.id.value = data ? data.order_id : '';
    dom.form.date.value = data ? data.order_date : new Date().toISOString().split('T')[0];
    dom.form.customer.value = data ? data.customer_id : '';
    dom.form.address.value = data ? data.address : '';
    dom.form.remarks.value = data ? data.remarks : '';
    dom.form.container.innerHTML = '';

    if (data) {
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => {
                addProductRow({
                    product: item.product_name,
                    qty: item.qty,
                    price: item.price_hkd,
                    option: item.option
                });
            });
        } else {
            addProductRow({ product: data.product_name, qty: data.qty, price: data.price_hkd, option: data.option });
        }
    } else {
        addProductRow();
    }
}

function addProductRow(data = null) {
    const row = document.createElement('div');
    row.className = 'product-card';

    row.innerHTML = `
        <div style="margin-bottom:12px;">
            <label class="form-label"><span data-i18n="lbl_product">${t('lbl_product')}</span> <span style="color:var(--danger)">*</span></label>
            <div class="autocomplete-wrapper">
                <input class="form-input inp-product" placeholder="${t('ph_product')}" value="${data ? data.product : ''}" autocomplete="off">
                <div class="suggestion-box"></div>
            </div>
        </div>
        <div class="row">
            <div style="flex:1;">
                <label class="form-label"><span data-i18n="lbl_qty">${t('lbl_qty')}</span> <span style="color:var(--danger)">*</span></label>
                <input class="form-input inp-qty" type="number" placeholder="1" value="${data ? data.qty : '1'}">
            </div>
            <div style="flex:1;">
                <label class="form-label"><span data-i18n="lbl_price">${t('lbl_price')}</span></label>
                <input class="form-input inp-price" type="number" placeholder="0" value="${data ? data.price : ''}">
            </div>
        </div>
        <div style="margin-top:12px;">
             <label class="form-label"><span data-i18n="lbl_option">${t('lbl_option')}</span> <span style="color:var(--danger)">*</span></label>
             <div class="autocomplete-wrapper">
                 <input class="form-input inp-option" placeholder="${t('lbl_option')}" value="${data ? data.option : ''}" autocomplete="off">
                 <div class="suggestion-box"></div>
             </div>
        </div>
    `;

    const inpProd = row.querySelector('.inp-product');
    const boxProd = row.querySelector('.inp-product + .suggestion-box');
    const inpOpt = row.querySelector('.inp-option');
    const boxOpt = row.querySelector('.inp-option + .suggestion-box');

    setupAutocomplete(inpProd, boxProd, 'product_name', null, (selectedProduct) => {
        // Product Intelligence: Auto-fill Price and Option from most recent order
        const recent = STATE.orders
            .filter(o => o.product_name === selectedProduct)
            .sort((a, b) => b.order_date.localeCompare(a.order_date))[0];

        if (recent) {
            row.querySelector('.inp-price').value = recent.price_hkd || '';
            row.querySelector('.inp-option').value = recent.option || '';
            // flash effect to indicate auto-fill
            row.querySelectorAll('input').forEach(i => {
                i.style.transition = 'background 0.3s';
                i.style.background = '#dcfce7';
                setTimeout(() => i.style.background = '', 500);
            });
        }
    });
    setupAutocomplete(inpOpt, boxOpt, 'option', () => inpProd.value.trim());

    bindRowActions(row);
    dom.form.container.appendChild(row);
}

function setupAutocomplete(input, box, key, filterFn = null, onSelect = null) {
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
                    const selectedValue = matches[i];
                    input.value = selectedValue;
                    box.classList.remove('active');
                    if (onSelect) onSelect(selectedValue);
                };
            });
            box.classList.add('active');
        } else {
            box.classList.remove('active');
        }
    });

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

function openProductSheet(row) {
    _components_currentRow = row;
    dom.prodSheet.classList.add('active');
}

function closeProductActionSheet() {
    dom.prodSheet.classList.remove('active');
    _components_currentRow = null;
}

function getCurrentRow() { return _components_currentRow; }
