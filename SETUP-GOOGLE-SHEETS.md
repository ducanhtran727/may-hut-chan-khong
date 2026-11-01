# Nhận đơn Google Sheets — chỉ 6 cột

Mã: `integrations/google-sheets.gs`.

Bản hiện tại đã điền sẵn ID file nhận đơn và tự tạo tab `DonHang_6Cot` cùng tiêu đề khi nhận yêu cầu hợp lệ đầu tiên. Không cần tạo tab/cột bằng tay hoặc cấu hình Script properties.

## Chuẩn bị bảng như ảnh

Hàng 1, từ A đến F:

| A | B | C | D | E | F |
| --- | --- | --- | --- | --- | --- |
| Họ tên | Điện thoại | Địa chỉ | Số máy | Gói mua | Thời gian đặt |

Chữ hoa/thường trong tiêu đề đều được chấp nhận (ví dụ `gói mua`, `thời gian đặt` như ảnh). Tab trống sẽ được thêm tiêu đề tự động. Không dùng chung bảng 21 cột cũ: giữ bảng cũ làm lưu trữ và dùng tab mới 6 cột; mã không xóa dữ liệu cũ.

## Dán mã và triển khai

1. Mở Sheet → **Tiện ích mở rộng → Apps Script**. Thay nội dung `Code.gs` bằng toàn bộ mã mới trong `integrations/google-sheets.gs`.
2. Điền ID Sheet vào dòng đầu: `const SPREADSHEET_ID = "ID_SHEET_CUA_BAN";`. ID nằm giữa `/d/` và `/edit` trong URL Sheet. Nếu đã cấu hình `SPREADSHEET_ID` ở Script properties, có thể để dòng này trống.
3. `const SHEET_NAME = "DonHang_6Cot";` nhận đơn ở tab `DonHang_6Cot`. Mã tự tạo tab này nếu chưa có; các tab cũ được giữ nguyên.
4. Chọn **Deploy → New deployment → Web app**; **Execute as: Me**; **Who has access: Anyone**. Lưu và cấp quyền cho script. Không cần chạy `doPost` trực tiếp trong editor.
5. Sao chép URL kết thúc bằng `/exec`, điền vào `googleSheetsEndpoint` trong `dist/config.js`, rồi đẩy GitHub để Netlify triển khai. Nếu cập nhật một deployment cũ, chọn **Deploy → Manage deployments → Edit → New version → Deploy** và giữ URL `/exec` cũ.
6. Gửi một đơn thử từ website và kiểm tra xuất hiện đúng một hàng mới trong Sheet. Chỉ sau bước này mới xác nhận kết nối hoạt động.

## Dữ liệu lưu

- Họ tên, điện thoại, địa chỉ từ form.
- Số máy và gói mua được xác định từ gói khách chọn: `single` → 1 máy + 10 túi, 339.000đ; `double` → 2 máy + 20 túi, 599.000đ. Không lấy số lượng/giá do trình duyệt tự khai báo.
- Thời gian do máy chủ ghi, múi giờ Việt Nam, dạng `dd/MM/yyyy HH:mm:ss`.
- Không có cột UTM, mã đơn, giá riêng, túi thêm hay ghi chú giao hàng.
- Mã chống gửi trùng được lưu trong **ghi chú ô F**, không thêm cột hoặc tab phụ. Không xóa ghi chú này nếu muốn giữ khả năng chống trùng của đơn đó.

Frontend gửi `{requestId, name, phone, address, packageId}`. Mã trả `{"ok":true,"requestId":"..."}` khi ghi thành công, hoặc `duplicate:true` nếu đã có đơn cùng mã. Website giữ nguyên requestId khi thử lại sau lỗi mạng.

## Sửa lỗi thiếu ID mà không đổi deployment

Nếu URL `/exec` trả `missing_sheet_id`, mở đúng dự án Apps Script đã tạo URL đó → **Project Settings → Script properties → Add script property**. Điền tên `SPREADSHEET_ID`, giá trị là ID Sheet nằm giữa `/d/` và `/edit` trong URL, rồi **Save script properties**. Mã đọc cấu hình này trong mỗi lần nhận đơn; nếu chỉ sửa Script property, không cần tạo version/deployment mới. Properties của dự án khác không áp dụng cho URL hiện tại.

## Nếu chưa nhận được đơn

- `missing_sheet_id`: chưa điền ID Sheet hoặc Script properties.
- `sheet_not_found`: tên tab không đúng.
- `sheet_headers_mismatch`: hàng tiêu đề không khớp 6 cột trên; mã dừng để tránh ghi lệch dữ liệu.
- `invalid_fields`: kiểm tra tên, số di động Việt Nam, địa chỉ và mã gói.
- Nếu trình duyệt không đọc được phản hồi Apps Script do CORS/redirect, cần proxy cùng tên miền. Không dùng `no-cors` rồi báo nhận đơn thành công vì không xác minh được hàng đã lưu.

Không chia sẻ Sheet công khai; web app nhận đơn không yêu cầu công khai dữ liệu Sheet.

## Kiểm tra mã cục bộ

Chạy `node --test tests/google-sheets.test.cjs`. Đây là kiểm tra mô phỏng, không thay cho gửi đơn thử trên Google Sheets thật.

Tài liệu: [Web Apps](https://developers.google.com/apps-script/guides/web), [Range notes](https://developers.google.com/apps-script/reference/spreadsheet/range#setNote(String)).
