# Nhận yêu cầu mua hàng vào Google Sheets

Chưa có kết nối trực tiếp: cần chủ tài khoản triển khai Apps Script và cung cấp URL `/exec`. Không đưa đơn hàng thật vào bản xem trước để thử.

## Triển khai

1. Tạo Google Sheet riêng tư. Trong Sheet chọn **Extensions → Apps Script**.
2. Dán toàn bộ `integrations/google-sheets.gs` vào `Code.gs`.
3. Trong **Project Settings → Script properties**, thêm `SPREADSHEET_ID`: phần ID giữa `/d/` và `/edit` trong URL Sheet. Web app dùng ID tường minh vì không dựa vào active spreadsheet khi chạy HTTP.
4. Chọn **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Cấp quyền cho script; nếu tài khoản tổ chức không cho phép Anyone, cần quản trị viên hoặc backend nhận đơn khác.
5. Sao chép URL kết thúc bằng `/exec`. Không dùng `/dev`. Khi sửa code, cập nhật deployment sang version mới.
6. Điền URL vào cấu hình nhận đơn của landing page. Tab `DonHang` được tạo khi có yêu cầu hợp lệ đầu tiên. Không sửa tên/cột tiêu đề do script tạo.

Sheet phải giữ riêng tư; chỉ chia sẻ cho người xử lý đơn. URL web app công khai có thể nhận spam; khi chạy quảng cáo nên đặt proxy cùng tên miền có rate limit/CAPTCHA phía trước Apps Script. Không nhúng token bí mật vào JavaScript trình duyệt.

## Giao thức

Gửi POST body JSON, có thể dùng `Content-Type: text/plain;charset=utf-8` để tránh preflight ở trình duyệt:

```json
{
  "requestId": "unique-request-id-123456",
  "name": "Khách thử nghiệm",
  "phone": "0901234567",
  "address": "123 Đường A, Phường B, Hà Nội",
  "packageId": "single",
  "bagsId": "none",
  "note": "Đơn thử — không giao hàng",
  "utm_source": "facebook",
  "utm_medium": "paid",
  "utm_campaign": "vacuum",
  "utm_content": "creative-a",
  "utm_term": "",
  "utm_id": "",
  "fbclid": ""
}
```

Phản hồi chỉ xác nhận ghi Sheet khi đọc được JSON `{"ok":true,"requestId":"..."}` khớp mã yêu cầu. Đây là **yêu cầu mua hàng**, chưa phải xác nhận giá/giao hàng. Giữ nguyên `requestId` khi thử gửi lại để chống trùng; tạo mã mới khi nội dung đơn thay đổi. Script khóa thao tác ghi đồng thời, kiểm tra tên/số di động Việt Nam/địa chỉ 10–500 ký tự/gói máy và túi hợp lệ, giới hạn chuỗi và vô hiệu hóa công thức từ dữ liệu khách nhập. Mã trùng trả `duplicate:true` và không ghi thêm hàng.

## CORS và trạng thái thành công

Apps Script ContentService chuyển hướng phản hồi. Phải kiểm tra POST thật từ tên miền landing page sau triển khai. Nếu trình duyệt không đọc được phản hồi do CORS/redirect, dùng **proxy cùng tên miền**: browser → `/api/orders` → Apps Script; proxy theo redirect và chỉ trả thành công khi body `ok:true`. Proxy cần giới hạn kích thước, xác thực payload và chống spam.

Không dùng `fetch(..., {mode:'no-cors'})` rồi báo “đã nhận đơn”: opaque response không chứng minh Sheet đã lưu. Không dùng JSONP GET để gửi dữ liệu cá nhân. Nếu lỗi mạng/không đọc được phản hồi, hiển thị “Chưa xác minh được yêu cầu, vui lòng thử lại” và giữ requestId cũ.

## Kiểm tra trước quảng cáo

- Gửi một đơn thử, kiểm tra đúng hàng mới, số điện thoại giữ số 0 đầu và timestamp Việt Nam.
- Gửi lại cùng requestId: vẫn chỉ một hàng.
- Thử số điện thoại sai/địa chỉ quá ngắn/mã gói không hợp lệ: không ghi Sheet.
- Thử ghi chú `=1+1`: nội dung lưu dạng văn bản, không chạy công thức.
- Kiểm tra từ điện thoại và tên miền production; ngắt mạng để chắc chắn không báo thành công giả.
- Xóa đơn thử trong Sheet trước vận hành. Apps Script có quota; theo dõi lỗi và nâng cấp backend nếu lưu lượng tăng.

Tài liệu: [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [ContentService](https://developers.google.com/apps-script/reference/content/content-service), [LockService](https://developers.google.com/apps-script/reference/lock/lock-service).

## Giá do server xác định

| packageId | Số máy | Túi tặng | Giá gói |
| --- | ---: | ---: | ---: |
| single | 1 | 10 | 339.000đ |
| double | 2 | 20 | 599.000đ |

Không bán túi riêng. `bagsId` giữ giá trị `none` để tương thích cấu trúc Sheet.

Phí ship 0đ theo ưu đãi nguồn. Server bỏ qua `quantity`, `total` và giá client; số máy, túi tặng, giá gói, giá túi thêm và tổng được tính từ hai mã trên. Khi giá thay đổi phải cập nhật cả frontend và bảng giá trong Apps Script rồi triển khai version mới.

Nếu tab `DonHang` đã dùng schema cũ, đổi tên tab cũ thành tên lưu trữ trước khi dùng phiên bản này; script sẽ tạo tab mới với đầy đủ cột địa chỉ/gói/túi/tổng. Không xóa đơn thật. Script từ chối ghi khi header không khớp để tránh lệch cột.
