/**
 * Purchase Manager 2.0 - Backend (Reconstructed)
 * 
 * Google Sheets as Database
 * HEADERS:
 * [0] ORDER_ID
 * [1] ORDER_DATE
 * [2] CUSTOMER
 * [3] ADDRESS
 * [4] PRODUCT
 * [5] OPTION
 * [6] QTY
 * [7] STATUS
 * [8] PRICE_HKD
 * [9] COST_KRW
 * [10] IS_PAID
 * [11] REMARKS
 * [12] CREATED_AT
 * [13] SHIP_FEE_KRW
 * [14] LOCAL_FEE_HKD
 * [15] TRACKING_NO
 * [16] DELIVERY_METHOD
 */

const SHEET_NAME = 'Orders';
const SHEET_SETTLEMENTS = 'Settlements';

function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

function handleRequest(e) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    try {
        const params = e.postData ? JSON.parse(e.postData.contents) : e.parameter;
        const action = params.action;

        // Simple Auth Check
        if (params.auth !== '1234') {
            throw new Error('Unauthorized');
        }

        let result = {};

        switch (action) {
            case 'getOrders':
                result = getOrders(params.limit || 100);
                break;
            case 'createOrder':
                result = createOrder(params.data);
                break;
            case 'createOrders': // Batch creation
                result = createOrders(params.data);
                break;
            case 'updateOrder':
                result = updateOrder(params.order_id, params.data);
                break;
            case 'updateOrders': // Batch update
                result = updateOrders(params.data);
                break;
            case 'deleteOrder':
                result = deleteOrder(params.order_id);
                break;
            case 'createSettlement':
                result = createSettlement(params.data);
                break;
            case 'getSettlements':
                result = getSettlements(params.limit || 50);
                break;
            default:
                throw new Error('Unknown action: ' + action);
        }

        return output.setContent(JSON.stringify({ success: true, data: result }));

    } catch (err) {
        return output.setContent(JSON.stringify({ success: false, message: err.toString() }));
    }
}

// --- DB OPERATIONS ---

function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Define the strict schema order
    const HEADERS = [
        'ORDER_ID',       // A: 1
        'ORDER_DATE',     // B: 2
        'CUSTOMER',       // C: 3
        'ADDRESS',        // D: 4
        'PRODUCT',        // E: 5
        'OPTION',         // F: 6
        'QTY',            // G: 7
        'STATUS',         // H: 8
        'PRICE_HKD',      // I: 9
        'COST_KRW',       // J: 10
        'IS_PAID',        // K: 11
        'REMARKS',        // L: 12
        'CREATED_AT',     // M: 13
        'SHIP_FEE_KRW',   // N: 14
        'LOCAL_FEE_HKD',  // O: 15
        'TRACKING_NO',    // P: 16
        'DELIVERY_METHOD' // Q: 17
    ];

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(HEADERS);
    } else {
        // Sync Headers: Check if new columns exist, if not append them in order
        const lastCol = sheet.getLastColumn();
        if (lastCol > 0) {
            const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
            // If missing columns, append the remaining ones from definition
            if (currentHeaders.length < HEADERS.length) {
                for (let i = currentHeaders.length; i < HEADERS.length; i++) {
                    sheet.getRange(1, i + 1).setValue(HEADERS[i]);
                }
            }
        } else {
            sheet.appendRow(HEADERS); // Sheet existed but was empty
        }
    }
    return sheet;
}

function getOrders(limit) {
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    // Read all 17 Data Columns
    // Range: Row 2, Col 1, down to lastRow, width 17
    const rangeWidth = 17;
    const data = sheet.getRange(2, 1, lastRow - 1, rangeWidth).getValues();

    // Map array to object
    const orders = data.map(row => ({
        order_id: row[0],
        order_date: formatDate(row[1]),
        customer_id: row[2],
        address: row[3],          // Col 4
        product_name: row[4],
        option: row[5],
        qty: row[6],
        status: row[7],
        price_hkd: row[8],
        cost_krw: row[9],
        is_paid: row[10],
        remarks: row[11],
        created_at: row[12],
        ship_fee_krw: row[13],    // Col 14
        local_fee_hkd: row[14],   // Col 15
        tracking_no: row[15],     // Col 16
        delivery_method: row[16]  // Col 17
    }));

    // Return latest first
    return orders.reverse().slice(0, limit);
}

function createOrder(data) {
    const sheet = getSheet();
    const newId = 'ORD-' + Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMdd') + '-' + Math.floor(Math.random() * 10000);
    const now = new Date();

    const row = [
        newId,
        data.order_date,
        data.customer_id,
        data.address || '',
        data.product_name,
        data.option,
        data.qty,
        data.status || 'Pending',
        data.price_hkd || 0,
        data.cost_krw || 0,
        data.is_paid || false,
        data.remarks || '',
        now,
        // Logistics
        data.ship_fee_krw || 0,
        data.local_fee_hkd || 0,
        data.tracking_no || '',
        data.delivery_method || ''
    ];

    sheet.appendRow(row);
    return { order_id: newId };
}

function createOrders(dataList) {
    const sheet = getSheet();
    const rows = [];
    const createdIds = [];
    const timestamp = new Date();
    const dateStr = Utilities.formatDate(timestamp, 'GMT+9', 'yyyyMMdd');

    const baseId = 'ORD-' + dateStr + '-' + Math.floor(Math.random() * 10000); // Shared ID for the Batch

    dataList.forEach((data, index) => {
        const newId = baseId; // key change: use same ID
        createdIds.push(newId);
        rows.push([
            newId,
            data.order_date,
            data.customer_id,
            data.address || '',
            data.product_name,
            data.option,
            data.qty,
            data.status || 'Pending',
            data.price_hkd || 0,
            data.cost_krw || 0,
            data.is_paid || false,
            data.remarks || '',
            timestamp,
            // Logistics
            data.ship_fee_krw || 0,
            data.local_fee_hkd || 0,
            data.tracking_no || '',
            data.delivery_method || ''
        ]);
    });

    if (rows.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return { count: rows.length, ids: createdIds };
}

function updateOrder(orderId, data) {
    const sheet = getSheet();
    const range = sheet.getDataRange();
    const values = range.getValues();

    // Find row by Order ID (Col 0)
    for (let i = 1; i < values.length; i++) {
        if (values[i][0] == orderId) {
            const rowIdx = i + 1; // 1-based index

            // Mapping: Field -> Column Index (1-based)
            updateCell(sheet, rowIdx, 2, data.order_date);
            updateCell(sheet, rowIdx, 3, data.customer_id);
            updateCell(sheet, rowIdx, 4, data.address);
            updateCell(sheet, rowIdx, 5, data.product_name);
            updateCell(sheet, rowIdx, 6, data.option);
            updateCell(sheet, rowIdx, 7, data.qty);
            updateCell(sheet, rowIdx, 8, data.status);
            updateCell(sheet, rowIdx, 9, data.price_hkd);
            updateCell(sheet, rowIdx, 10, data.cost_krw);
            updateCell(sheet, rowIdx, 11, data.is_paid);
            updateCell(sheet, rowIdx, 12, data.remarks);
            // Col 13 is Created At - Skip
            updateCell(sheet, rowIdx, 14, data.ship_fee_krw);
            updateCell(sheet, rowIdx, 15, data.local_fee_hkd);
            updateCell(sheet, rowIdx, 16, data.tracking_no);
            updateCell(sheet, rowIdx, 17, data.delivery_method);

            return { order_id: orderId, updated: true };
        }
    }
    return { error: 'Order not found' };
}

function updateOrders(dataList) {
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    const idMap = new Map();

    // Map ID -> Array of Row Indices (0-based)
    for (let i = 1; i < values.length; i++) {
        const id = values[i][0];
        if (!idMap.has(id)) idMap.set(id, []);
        idMap.get(id).push(i);
    }

    dataList.forEach(data => {
        const indices = idMap.get(data.order_id);
        if (indices) {
            indices.forEach(rowIndex => {
                const r = rowIndex + 1; // 1-based

                // Only update provided fields logic
                // Using updateCell helper which checks for undefined
                updateCell(sheet, r, 4, data.address);    // D
                updateCell(sheet, r, 8, data.status);     // H
                updateCell(sheet, r, 10, data.cost_krw);  // J
                updateCell(sheet, r, 12, data.remarks);   // L
                updateCell(sheet, r, 14, data.ship_fee_krw); // N
                updateCell(sheet, r, 15, data.local_fee_hkd); // O
                updateCell(sheet, r, 16, data.tracking_no);   // P
                updateCell(sheet, r, 17, data.delivery_method); // Q
            });
        }
    });

    return { updated_count: dataList.length, success: true };
}

function deleteOrder(orderId) {
    const sheet = getSheet();
    const data = sheet.getDataRange().getValues();
    let count = 0;

    // Loop backwards to safely delete multiple rows
    for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] == orderId) {
            sheet.deleteRow(i + 1);
            count++;
        }
    }

    if (count > 0) return { success: true, count };
    return { error: 'Order not found' };
}

// Helper to update cell only if value defined
function updateCell(sheet, row, col, val) {
    if (val !== undefined) {
        sheet.getRange(row, col).setValue(val);
    }
}

function formatDate(dateObj) {
    if (!dateObj) return '';
    if (typeof dateObj === 'string') return dateObj;
    return Utilities.formatDate(new Date(dateObj), 'GMT+9', 'yyyy-MM-dd');
}

// --- SETTLEMENTS DB ---

function getSettlementSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_SETTLEMENTS);

    // Schema
    const HEADERS = [
        'SETTLEMENT_ID',      // A: 1
        'DATE',               // B: 2
        'TOTAL_INPUT_KRW',    // C: 3
        'ACTUAL_AMOUNT_KRW',  // D: 4
        'BALANCE_KRW',        // E: 5
        'RELATED_ORDER_IDS',  // F: 6
        'CREATED_AT'          // G: 7
    ];

    if (!sheet) {
        sheet = ss.insertSheet(SHEET_SETTLEMENTS);
        sheet.appendRow(HEADERS);
    }
    return sheet;
}

function createSettlement(data) {
    const sheet = getSettlementSheet();
    const newId = 'STL-' + Utilities.formatDate(new Date(), 'GMT+9', 'yyyyMMdd') + '-' + Math.floor(Math.random() * 10000);
    const now = new Date();

    const row = [
        newId,
        data.date || formatDate(now),
        data.total_input_krw || 0,
        data.actual_amount_krw || 0,
        data.balance_krw || 0,
        data.related_order_ids ? JSON.stringify(data.related_order_ids) : '[]',
        now
    ];

    sheet.appendRow(row);
    return { settlement_id: newId, balance: data.balance_krw };
}

function getSettlements(limit) {
    const sheet = getSettlementSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

    const items = data.map(row => ({
        settlement_id: row[0],
        date: formatDate(row[1]),
        total_input_krw: row[2],
        actual_amount_krw: row[3],
        balance_krw: row[4],
        related_order_ids: row[5],
        created_at: row[6]
    }));

    return items.reverse().slice(0, limit);
}
