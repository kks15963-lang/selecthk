const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbz-z8gFnokFBaK4nEU6lOLi4bNKKGdtpgS6h3UxnA1p_ejvZb2ZurfuS9ddPrMFt-hE8w/exec",
    EXCHANGE_API: "https://open.er-api.com/v6/latest/HKD",
    IS_MOCK: false,
    DEFAULT_RATE: 175
};

const TRANS = {
    ko: {
        // Settings
        set_title: "설정 (Settings)", set_lang: "언어 설정 (Language)", set_curr: "통화 모드 (Currency View)",
        set_rate: "환율 설정 (Exchange Rate)", desc_rate: "기본값: 실시간 환율 (수동 변경 가능)",
        set_sync: "데이터 동기화", btn_refresh: "서버 데이터 새로고침 (Refresh)",

        // Formatting
        fmt_date: "YYYY-MM-DD",

        // Nav
        nav_dash: "현황", nav_list: "주문", nav_purchase: "매입", nav_korea: "배대지", nav_hk: "배송", nav_finance: "정산", nav_settings: "설정",

        // Dashboard
        stat_profit: "예상 수익", stat_pending_settle: "정산 필요", stat_revenue: "매출 (Sales)", stat_cost: "매입 지출 (Cost)",
        lbl_today: "오늘", lbl_week: "이번주", lbl_month: "이번달", lbl_reset: "전체",

        // Filters & Headers
        sec_order_list: "주문 내역 관리", sec_purchase: "매입 대기 목록", sec_korea: "배대지 발송 대기",
        sec_hongkong: "고객 배송 대기", settlement_title: "정산 대기 목록", sec_form: "새 주문 작성",
        ph_customer: "고객명 (Customer)", ph_product: "상품명 (Product)", ph_search: "Search...",
        lbl_status_all: "전체 상태 (All Status)",

        // Status
        status_pending: "매입필요", status_ordered: "발송대기", status_shipped_to_hk: "배송대기",
        status_completed: "정산대기", status_settled: "정산완료", status_cancelled: "주문취소",

        // Form
        lbl_date: "날짜", lbl_customer: "고객명", lbl_address: "주소", lbl_product: "상품명",
        lbl_qty: "수량", lbl_price: "단가 (HKD)", lbl_option: "옵션/사이즈", lbl_remarks: "비고",
        btn_close: "작성 취소하고 돌아가기", btn_save: "주문 정보 저장 완료",

        // Card & List
        status_entered: "배송정보 입력완료",
        warn_address: "⚠️ 배송 정보/주소 필요",
        lbl_recent_settle: "최근 정산 내역", lbl_per_page: "개씩",
        lbl_sell_price: "판매가", lbl_buy_cost: "매입가", lbl_ship_cost: "배대지", lbl_local_cost: "현지배송",

        // Batch Buttons (Dynamic)
        btn_batch_purchase: "선택한 항목 매입 확정하기",
        btn_batch_korea: "선택한 항목 홍콩으로 발송하기",
        btn_batch_hk: "선택한 항목 배송 완료 처리",
        btn_batch_settle: "선택한 항목 수익 정산하기",

        // Modals & Sheets
        lbl_krw: "매입가 입력", ph_cost: "KRW 0", btn_save_cost: "매입가 저장하고 완료하기",
        lbl_ship_fee: "배대지 비용 입력", btn_ship_save: "배송비 저장하고 발송 처리하기",
        lbl_hk_ship: "배송 완료 처리", btn_hk_next: "배송 정보 입력하기", btn_hk_save: "배송 정보 저장하기",
        lbl_settle: "수익 정산", btn_settle_save: "금액 확인하고 정산 처리하기",

        // Alerts
        msg_login_fail: "로그인 실패", msg_login_req: "인증코드를 입력하세요",
        msg_req_fields: "필수 항목을 입력해주세요",
        msg_save_success: "저장되었습니다", msg_delete_confirm: "정말 삭제하시겠습니까? 복구할 수 없습니다.",
        msg_refresh: "데이터가 새로고침되었습니다.",

        // Validation Messages
        warn_incomplete_hk: "⚠️ 배송정보 미입력 (주소/송장/배송비)",
        msg_hk_incomplete_save: "모든 필수 정보를 입력해주세요 (주소, 송장, 배송비)",
        lbl_no_fee: "비용 없음",

        // Actions & JS Alerts
        msg_login_fail_prefix: "로그인 실패: ", msg_server_err: "서버 응답 오류",
        msg_load_fail: "데이터 로드 실패: ", msg_no_cust: "고객명을 입력해주세요",
        msg_no_prod: "상품명, 수량(1이상), 옵션을 모두 입력해주세요",
        msg_save_done: "저장되었습니다.", msg_save_fail: "저장 실패",
        msg_no_orders: "해당 조건의 주문이 없습니다.",
        msg_no_addr_bulk: "배송 주소가 없는 주문이 포함되어 있습니다. 정보를 먼저 입력해주세요.",
        msg_ship_complete: "배송 완료 처리됨", msg_info_updated: "정보가 업데이트 되었습니다.",
        msg_select_ship: "배송할 고객/주문을 선택해주세요",
        msg_no_addr_selection: "선택한 주문 중 '배송 정보'가 입력되지 않은 항목이 있습니다.\\n먼저 정보를 입력해주세요.",
        msg_select_settle: "정산할 주문을 선택해주세요", msg_settle_done: "정산 처리 완료되었습니다.",
        msg_no_lib: "이미지 저장 라이브러리가 로드되지 않았습니다.", msg_img_saved: "이미지가 저장되었습니다.",
        msg_img_fail: "이미지 저장 실패",
        msg_enter_cost: "매입가(KRW)를 입력해주세요", msg_enter_fee: "배송비(HKD)를 입력해주세요",
        msg_no_selection: "선택된 주문이 없습니다.", msg_purchase_done: "매입 처리 완료",
        msg_send_done: "발송 처리 완료", msg_error: "오류 발생", msg_syncing: "서버 동기화 중... (약 3초 소요)",
        msg_target_none: "대상 주문이 없습니다.",

        // Dynamic Labels in JS
        lbl_ship_check: "배송 정보 최종 확인", lbl_no_addr: "주소 없음", lbl_no_track: "송장 없음",
        lbl_total: "총", lbl_items: "개 상품", btn_complete_ship: "모두 배송 완료 처리 (Complete)",

        // Management Sheet (Long Press Order)
        btn_mng_del: "🗑️ 기록 삭제", btn_mng_ship: "🚚 배송 정보 입력/수정",
        btn_mng_rcpt: "🧾 영수증 확인", btn_mng_refund: "↩️ 환불 및 취소",
        btn_mng_edit: "주문 정보 수정하고 업데이트하기",

        // Product Action Sheet (Long Press Form Row)
        title_prod_mng: "상품 관리", btn_act_add: "➕ 아래에 새 상품 추가",
        btn_act_copy: "📋 이 상품 복사하기", btn_act_del: "🗑️ 삭제하기",
        btn_act_cancel: "취소",

        // Auth
        btn_auth_enter: "접속하기"
    },
    cn: {
        // Settings
        set_title: "设置", set_lang: "语言设置", set_curr: "货币显示",
        set_rate: "汇率设置", desc_rate: "默认: 实时汇率 (可手动修改)",
        set_sync: "数据同步", btn_refresh: "刷新服务器数据",

        // Formatting
        fmt_date: "YYYY年-MM月-DD日",

        // Nav
        nav_dash: "概况", nav_list: "订单", nav_purchase: "采购", nav_korea: "集运", nav_hk: "发货", nav_finance: "结算", nav_settings: "设置",

        // Dashboard
        stat_profit: "预计收益", stat_pending_settle: "待结算", stat_revenue: "销售额 (Sales)", stat_cost: "采购支出 (Cost)",
        lbl_today: "今日", lbl_week: "本周", lbl_month: "本月", lbl_reset: "全部",

        // Filters & Headers
        sec_order_list: "订单管理", sec_purchase: "待采购列表", sec_korea: "待发货 (集运)",
        sec_hongkong: "待派送 (客户)", settlement_title: "待结算列表", sec_form: "新建订单",
        ph_customer: "客户名 (Customer)", ph_product: "商品名 (Product)", ph_search: "搜索...",
        lbl_status_all: "全部状态 (All Status)",

        // Status
        status_pending: "待采购", status_ordered: "已采购", status_shipped_to_hk: "运输中",
        status_completed: "待结算", status_settled: "已结算", status_cancelled: "已取消",

        // Form
        lbl_date: "日期", lbl_customer: "客户名", lbl_address: "地址", lbl_product: "商品名",
        lbl_qty: "数量", lbl_price: "单价 (HKD)", lbl_option: "选项/尺码", lbl_remarks: "备注",
        btn_close: "取消并返回", btn_save: "保存订单",

        // Card & List
        status_entered: "配送信息已录入",
        warn_address: "⚠️ 需要填写地址/配送信息",
        lbl_recent_settle: "最近结算记录", lbl_per_page: "条/页",
        lbl_sell_price: "销售价", lbl_buy_cost: "采购价", lbl_ship_cost: "集运费", lbl_local_cost: "派送费",

        // Batch Buttons (Dynamic)
        btn_batch_purchase: "确认采购选中项",
        btn_batch_korea: "标记发货选中项",
        btn_batch_hk: "处理派送选中项",
        btn_batch_settle: "结算选中项",

        // Modals & Sheets
        lbl_krw: "输入采购成本", ph_cost: "韩元金额", btn_save_cost: "保存并完成采购",
        lbl_ship_fee: "输入集运运费", btn_ship_save: "保存并标记发货",
        lbl_hk_ship: "处理派送", btn_hk_next: "输入派送信息", btn_hk_save: "保存派送信息",
        lbl_settle: "收益结算", btn_settle_save: "确认金额并结算",

        // Alerts
        msg_login_fail: "登录失败", msg_login_req: "请输入验证码",
        msg_req_fields: "请填写所有必填项",
        msg_save_success: "已保存", msg_delete_confirm: "确定要删除吗？此操作无法撤销。",
        msg_refresh: "数据已更新",

        // Validation Messages
        warn_incomplete_hk: "⚠️ 配送信息不完整 (地址/单号/运费)",
        msg_hk_incomplete_save: "请填写所有必填项 (地址, 单号, 运费)",
        lbl_no_fee: "无运费",

        // Actions & JS Alerts (Chinese)
        msg_login_fail_prefix: "登录失败: ", msg_server_err: "服务器响应错误",
        msg_load_fail: "数据加载失败: ", msg_no_cust: "请输入客户名",
        msg_no_prod: "请输入商品名, 数量(1以上) 和 选项",
        msg_save_done: "已保存。", msg_save_fail: "保存失败",
        msg_no_orders: "没有符合条件的订单。",
        msg_no_addr_bulk: "包含未填写地址的订单。请先输入配送信息。",
        msg_ship_complete: "配送处理完成", msg_info_updated: "信息已更新。",
        msg_select_ship: "请选择要发货的客户/订单",
        msg_no_addr_selection: "选中的订单中有未输入'配送信息'的项目。\\n请先输入信息。",
        msg_select_settle: "请选择要结算的订单", msg_settle_done: "结算处理完成。",
        msg_no_lib: "图片保存库未加载。", msg_img_saved: "图片已保存。",
        msg_img_fail: "图片保存失败",
        msg_enter_cost: "请输入采购价 (KRW)", msg_enter_fee: "请输入运费 (HKD)",
        msg_no_selection: "未选择订单。", msg_purchase_done: "采购处理完成",
        msg_send_done: "发货处理完成", msg_error: "发生错误", msg_syncing: "正在同步... (约3秒)",
        msg_target_none: "没有目标订单。",

        // Dynamic Labels in JS (Chinese)
        lbl_ship_check: "配送信息最终确认", lbl_no_addr: "无地址", lbl_no_track: "无单号",
        lbl_total: "共", lbl_items: "个商品", btn_complete_ship: "全部标记配送完成 (Complete)",

        // Management Sheet (Long Press Order)
        btn_mng_del: "🗑️ 删除记录", btn_mng_ship: "🚚 输入/修改配送信息",
        btn_mng_rcpt: "🧾 查看收据", btn_mng_refund: "↩️ 退款及取消",
        btn_mng_edit: "修改并更新订单信息",

        // Product Action Sheet (Long Press Form Row)
        title_prod_mng: "商品管理", btn_act_add: "➕ 在下方添加新商品",
        btn_act_copy: "📋 复制该商品", btn_act_del: "🗑️ 删除",
        btn_act_cancel: "取消",

        // Auth
        btn_auth_enter: "进入系统"
    }
};

// Global Translation Helper
window.t = function (key) {
    const lang = STATE.lang || 'ko';
    return (TRANS[lang] && TRANS[lang][key]) || (TRANS['ko'] && TRANS['ko'][key]) || key;
};
