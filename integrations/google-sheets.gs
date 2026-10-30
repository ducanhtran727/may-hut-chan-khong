/** Bound Apps Script. Set SPREADSHEET_ID in Project Settings > Script properties. */
const ORDER_HEADERS = [
  "Request ID",
  "Thời gian (Việt Nam)",
  "Họ tên",
  "Điện thoại",
  "Địa chỉ",
  "Mã gói máy",
  "Số máy",
  "Túi tặng",
  "Mã túi mua thêm",
  "Giá gói máy (VND)",
  "Giá túi thêm (VND)",
  "Phí ship (VND)",
  "Tổng tiền (VND)",
  "Ghi chú",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
];
const ORDER_PACKAGES = {
  single: { quantity: 1, gifts: 10, price: 339000 },
  double: { quantity: 2, gifts: 20, price: 599000 },
};
const ORDER_BAGS = { none: 0 };

function doPost(e) {
  let lock;
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 16000)
      return reply_({ ok: false, error: "invalid_payload" });
    let data;
    try {
      data = JSON.parse(raw);
    } catch (_) {
      return reply_({ ok: false, error: "invalid_json" });
    }
    if (!data || typeof data !== "object" || Array.isArray(data))
      return reply_({ ok: false, error: "invalid_payload" });
    const name = field_(data.name, 100);
    const phoneInput = field_(data.phone, 30);
    const phone = phoneInput.replace(/[\s.()-]/g, "").replace(/^\+?84/, "0");
    const address = field_(data.address, 500);
    const packageId = field_(data.packageId, 20);
    const bagsId = field_(data.bagsId, 20);
    const packageInfo = Object.prototype.hasOwnProperty.call(
      ORDER_PACKAGES,
      packageId,
    )
      ? ORDER_PACKAGES[packageId]
      : null;
    const validBags = Object.prototype.hasOwnProperty.call(ORDER_BAGS, bagsId);
    const requestId = field_(data.requestId, 80);
    if (
      name.length < 2 ||
      !/^0[35789]\d{8}$/.test(phone) ||
      address.length < 10 ||
      !packageInfo ||
      !validBags ||
      !/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)
    ) {
      return reply_({ ok: false, error: "invalid_fields" });
    }
    const spreadsheetId =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
    if (!spreadsheetId) return reply_({ ok: false, error: "not_configured" });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return reply_({ ok: false, error: "busy_retry" });
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    let sheet = spreadsheet.getSheetByName("DonHang");
    if (!sheet) sheet = spreadsheet.insertSheet("DonHang");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(ORDER_HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, ORDER_HEADERS.length).setFontWeight("bold");
    }
    const headers = sheet
      .getRange(1, 1, 1, ORDER_HEADERS.length)
      .getValues()[0];
    if (headers.join("|") !== ORDER_HEADERS.join("|"))
      return reply_({ ok: false, error: "sheet_headers_changed" });
    if (sheet.getLastRow() > 1) {
      const existing = sheet
        .getRange(2, 1, sheet.getLastRow() - 1, 1)
        .createTextFinder(requestId)
        .matchEntireCell(true)
        .findNext();
      if (existing)
        return reply_({ ok: true, requestId: requestId, duplicate: true });
    }
    const utmFields = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "utm_id",
      "fbclid",
    ];
    // Prices, quantities and shipping are derived here; client totals are ignored.
    const bagsPrice = ORDER_BAGS[bagsId];
    const total = packageInfo.price + bagsPrice;
    const row = [
      requestId,
      Utilities.formatDate(
        new Date(),
        "Asia/Ho_Chi_Minh",
        "yyyy-MM-dd HH:mm:ss",
      ),
      name,
      phone,
      address,
      packageId,
      packageInfo.quantity,
      packageInfo.gifts,
      bagsId,
      packageInfo.price,
      bagsPrice,
      0,
      total,
      field_(data.note, 1000),
    ].concat(
      utmFields.map(function (key) {
        return field_(data[key], 500);
      }),
    );
    const range = sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length);
    range.setNumberFormat("@");
    range.setValues([row.map(safeCell_)]);
    SpreadsheetApp.flush();
    return reply_({ ok: true, requestId: requestId });
  } catch (error) {
    // Do not log customer payloads or return internal error details.
    return reply_({ ok: false, error: "server_error" });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function field_(value, maxLength) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new Error("Invalid text field");
  if (value.length > maxLength) throw new Error("Text field too long");
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function safeCell_(value) {
  // Protect text copied/exported from Sheets against spreadsheet formulas.
  return typeof value === "string" && /^[\s]*[=+\-@]/.test(value)
    ? "'" + value
    : value;
}

function reply_(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
