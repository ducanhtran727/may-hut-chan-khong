# Landing page máy hút chân không Vacuum Sealer

Trang tĩnh tiếng Việt trong `dist/`, ưu tiên điện thoại và khách từ Facebook. Không cần cài thư viện. Ảnh sản phẩm và ưu đãi lấy từ trang nguồn LivingHub đã đọc được; không dùng ảnh AI làm ảnh mẫu máy.

## Cấu hình bán hàng hiện tại

- 1 máy + 10 túi tặng: **339.000đ**; 2 máy + 20 túi tặng: **599.000đ**.
- Miễn phí giao hàng toàn quốc; thanh toán khi nhận hàng. Máy dùng túi một mặt trơn, một mặt nhám.
- Thông số nguồn: 110W, lực hút 65kPa, 1kg, vỏ ABS, kích thước 356×110×55mm, đường hàn 3mm, khổ túi hàn tối đa 30cm.

Giữ các phần sản phẩm, hướng dẫn, ảnh thực tế, đánh giá tham chiếu nguồn, chính sách và đặt hàng. Không coi lượt xem/tồn kho/đếm ngược từ nguồn là dữ liệu trực tiếp của landing page này.

## Nhận đơn và vận hành

Xem `SETUP-GOOGLE-SHEETS.md` để triển khai `integrations/google-sheets.gs`. Chưa có URL Apps Script hoạt động thì form chưa gửi đơn đến Google Sheets. Script tự xác định giá từ gói máy đã chọn, bỏ qua tổng tiền client, chống trùng bằng requestId.

Trước chạy quảng cáo: xác nhận lại giá và chính sách với người bán; triển khai đầu nhận đơn; kiểm tra đơn thử thực sự xuất hiện trong Sheet; kiểm tra lỗi mạng và điện thoại. Không công bố kết nối đã hoạt động khi chưa kiểm tra.

Meta Pixel/CAPI cần ID/tài khoản thật và cơ chế đồng ý phù hợp. Chỉ ghi nhận Lead khi máy chủ xác nhận đã lưu yêu cầu. Không chứa Pixel giả hoặc khóa truy cập.

## Bố cục ưu tiên ảnh
Ảnh bìa sản phẩm ở đầu trang, 6 ảnh chi tiết; nội dung rút gọn, thông số/chính sách mở rộng. Giá gốc theo yêu cầu giảm 50%: single 678.000đ → 339.000đ, double 1.198.000đ → 599.000đ. Không bán thêm túi.

## Chạy tại máy

Mở `dist/index.html` để xem giao diện hoặc chạy `python -m http.server 8080 --directory dist` và truy cập `http://localhost:8080`. Video YouTube cần chạy trên HTTP/HTTPS với referrer hợp lệ.

Thư mục `dist/` chứa website tĩnh; `integrations/` chứa Apps Script nhận đơn; `.openai/hosting.json` lưu cấu hình Sites hiện tại.

## Deploy trên Netlify

Repository đã có `netlify.toml` ở thư mục gốc. Netlify sẽ xuất bản trực tiếp thư mục `dist/`, không cần build hoặc cài thư viện.

- Base directory: `.` (thư mục gốc repository).
- Build command: để trống.
- Publish directory: `dist`.

Không dùng `vacuum-landing/dist`: repository này không có thư mục `vacuum-landing`. Sau khi lấy commit cấu hình mới, chạy deploy lại từ nhánh `main`.
