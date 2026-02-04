const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbxCoxgLFrRlLehBdcjnLkF8h5-a9NTopYibonQ7E_uTa_ZoIilazv0lWIRXZt7oAzisnA/exec",
    EXCHANGE_API: "https://open.er-api.com/v6/latest/HKD",
    IS_MOCK: false,
    DEFAULT_RATE: 175
};

const TRANS = {
    ko: {
        btn_save: "주문 정보 저장하고 목록으로 돌아가기",
        status_pending: "매입필요", status_ordered: "발송대기", status_shipped_to_hk: "배송대기",
        status_completed: "정산대기", status_settled: "정산완료", status_cancelled: "주문취소"
    },
    cn: {
        btn_save: "保存订单并返回列表",
        status_pending: "待处理", status_ordered: "已采购", status_shipped_to_hk: "已发货",
        status_completed: "已完成", status_settled: "已结算", status_cancelled: "Cancelled"
    }
};
