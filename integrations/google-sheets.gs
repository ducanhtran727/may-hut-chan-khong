// Điền ID trong URL Google Sheet: /spreadsheets/d/ID_SHEET/edit.
// Có thể để trống nếu đã lưu SPREADSHEET_ID trong Script properties.
const SPREADSHEET_ID = "";
// Để trống để dùng tab đầu tiên, hoặc điền chính xác tên tab nhận đơn.
const SHEET_NAME = "";
const ORDER_HEADERS = ["Họ tên", "Điện thoại", "Địa chỉ", "Số máy", "Gói mua", "Thời gian đặt"];
const ORDER_PACKAGES = {
  single: {quantity: 1, label: "1 máy + tặng 10 túi — 339.000đ"},
  double: {quantity: 2, label: "2 máy + tặng 20 túi — 599.000đ"}
};

function doPost(e) {
  let lock;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 8000) return reply_({ok: false, error: "invalid_payload"});
    let data;
    try { data = JSON.parse(raw); } catch (_) { return reply_({ok: false, error: "invalid_json"}); }
    if (!data || typeof data !== "object" || Array.isArray(data)) return reply_({ok: false, error: "invalid_payload"});
    const name = field_(data.name, 100);
    const phone = field_(data.phone, 30).replace(/[\s.()-]/g, "").replace(/^\+?84/, "0");
    const address = field_(data.address, 500);
    const packageId = field_(data.packageId, 20);
    const requestId = field_(data.requestId, 80);
    const pack = Object.prototype.hasOwnProperty.call(ORDER_PACKAGES, packageId) ? ORDER_PACKAGES[packageId] : null;
    if (name.length < 2 || !/^0[35789]\d{8}$/.test(phone) || address.length < 10 || !pack || !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) {
      return reply_({ok: false, error: "invalid_fields"});
    }
    const sheetId = SPREADSHEET_ID.trim() || PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!sheetId) return reply_({ok: false, error: "missing_sheet_id"});
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply_({ok: false, error: "busy_retry"});
    const book = SpreadsheetApp.openById(sheetId);
    const sheet = SHEET_NAME ? book.getSheetByName(SHEET_NAME) : book.getSheets()[0];
    if (!sheet) return reply_({ok: false, error: "sheet_not_found"});
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([ORDER_HEADERS]).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
    const normalized = value => String(value).normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
    if (!headers.every((value, index) => normalized(value) === normalized(ORDER_HEADERS[index]))) {
      return reply_({ok: false, error: "sheet_headers_mismatch"});
    }
    // Mã chống trùng nằm trong ghi chú ô F, không thêm cột vào bảng.
    const marker = "requestId:" + requestId;
    const lastRow = sheet.getLastRow();
    if (lastRow > 1 && sheet.getRange(2, 6, lastRow - 1, 1).getNotes().some(row => row[0] === marker)) {
      return reply_({ok: true, requestId: requestId, duplicate: true});
    }
    const nextRow = lastRow + 1;
    const timestamp = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");
    const row = [safeCell_(name), phone, safeCell_(address), pack.quantity, pack.label, timestamp];
    sheet.getRange(nextRow, 1, 1, 3).setNumberFormat("@");
    sheet.getRange(nextRow, 4).setNumberFormat("0");
    sheet.getRange(nextRow, 5, 1, 2).setNumberFormat("@");
    sheet.getRange(nextRow, 6).setNote(marker);
    sheet.getRange(nextRow, 1, 1, 6).setValues([row]);
    SpreadsheetApp.flush();
    return reply_({ok: true, requestId: requestId});
  } catch (_) {
    return reply_({ok: false, error: "server_error"});
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function field_(value, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > maxLength) throw new Error("invalid_field");
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
}

function safeCell_(value) {
  return /^[\s]*[=+\-@]/.test(value) ? "'" + value : value;
}

function reply_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
