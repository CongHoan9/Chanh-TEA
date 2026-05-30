# ChanhTea Business Processes

Tài liệu này tách riêng phần nghiệp vụ vận hành khỏi hạ tầng kỹ thuật. Mục tiêu là mô tả rõ ai làm gì, dữ liệu đi qua đâu, trạng thái chuyển như thế nào.

## Vai Trò Hệ Thống

| Vai trò | Đăng nhập | Phạm vi | Quyền chính |
| --- | --- | --- | --- |
| Guest | Không bắt buộc | Public storefront | Xem menu, đặt hàng, theo dõi đơn bằng mã/điện thoại |
| Courier | Có | Đơn được giao | Nhận giao hàng, cập nhật trạng thái giao |
| Store Staff | Có | Một cửa hàng | Nhận đơn, cập nhật pha chế, xem đơn của cửa hàng |
| Store Manager | Có | Một hoặc nhiều cửa hàng | Quản lý đơn, nhân sự cửa hàng, tồn kho, doanh thu |
| Store Owner | Có | Cụm cửa hàng được sở hữu | Theo dõi hiệu suất, cấu hình cửa hàng |
| Regional Manager | Có | Một tỉnh/vùng | Quản lý cửa hàng trong vùng, điều phối đơn |
| Support | Có | Toàn hệ thống hoặc vùng | Hỗ trợ khách, xem đơn, ghi chú khiếu nại |
| System Admin | Có | Toàn hệ thống | Toàn quyền quản trị, cấu hình, phân quyền, báo cáo |

## Vòng Đời Đơn Hàng

Trạng thái chuẩn:

```text
pending
assigned
accepted
preparing
ready
delivering
completed
```

Nhánh ngoại lệ:

```text
pending -> cancelled
assigned -> rejected -> assigned
accepted -> cancelled
delivering -> failed_delivery
failed_delivery -> delivering
failed_delivery -> cancelled
```

Ý nghĩa:

- `pending`: đơn mới tạo, chưa gán cửa hàng.
- `assigned`: đã gán cửa hàng, chờ cửa hàng xác nhận.
- `accepted`: cửa hàng đã nhận đơn.
- `preparing`: đang pha chế.
- `ready`: đã chuẩn bị xong, chờ khách lấy hoặc courier lấy.
- `delivering`: đang giao.
- `completed`: hoàn tất.
- `rejected`: cửa hàng từ chối nhận đơn.
- `cancelled`: đơn bị hủy.
- `failed_delivery`: giao không thành công.

## Quy Trình 1: Khách Đặt Hàng Không Đăng Nhập

### Mục tiêu

Khách đặt trà chanh nhanh nhất có thể, không cần tài khoản.

### Luồng chính

1. Khách vào website.
2. Khách chọn sản phẩm.
3. Khách mở giỏ hàng.
4. Website yêu cầu vị trí hiện tại.
5. Nếu khách đồng ý, browser trả về latitude/longitude.
6. Nếu khách từ chối, khách nhập địa chỉ thủ công.
7. Khách nhập tên, số điện thoại, ghi chú.
8. Backend validate:
   - cart hợp lệ
   - số điện thoại hợp lệ
   - địa chỉ/vị trí hợp lệ
   - giá sản phẩm được tính lại ở backend
   - Turnstile/captcha nếu cần
9. Backend tìm cửa hàng phù hợp.
10. Backend tạo đơn với trạng thái `assigned`.
11. Dashboard cửa hàng nhận realtime notification.
12. Khách thấy mã đơn và trạng thái chờ xác nhận.

### Ngoại lệ

- Không tìm thấy cửa hàng gần khách: báo ngoài vùng phục vụ.
- Cửa hàng gần nhất quá tải: chọn cửa hàng tiếp theo.
- Không có sản phẩm ở cửa hàng gần nhất: chọn cửa hàng khác hoặc báo hết hàng.
- Khách không nhập vị trí/địa chỉ: không cho đặt đơn.

## Quy Trình 2: Tự Gán Đơn Cho Cửa Hàng Gần Nhất

### Input

- Tọa độ khách.
- Danh sách sản phẩm.
- Thời gian hiện tại.
- Trạng thái cửa hàng.

### Tiêu chí chọn cửa hàng

1. Cửa hàng active.
2. Đang trong giờ mở cửa.
3. Khách nằm trong bán kính/vùng phục vụ.
4. Cửa hàng có đủ sản phẩm.
5. Số đơn đang xử lý chưa vượt ngưỡng.
6. ETA giao hàng tốt nhất.

### Công thức điểm đề xuất

```text
score =
  eta_minutes * 1.0
  + active_orders * 2.0
  + out_of_stock_penalty
  + manual_priority_penalty
```

Cửa hàng có `score` thấp nhất được nhận đơn.

### Timeout

- Nếu cửa hàng không phản hồi trong 60-120 giây, đơn chuyển sang cửa hàng ứng viên tiếp theo.
- Mọi lần chuyển phải ghi vào `order_status_events`.

## Quy Trình 3: Cửa Hàng Nhận Và Xử Lý Đơn

### Luồng chính

1. Store staff/manager đăng nhập dashboard.
2. Dashboard subscribe đơn theo `store_id`.
3. Đơn mới xuất hiện ở cột "Đơn mới".
4. Nhân viên bấm "Nhận đơn".
5. Trạng thái chuyển `assigned -> accepted`.
6. Nhân viên bấm "Bắt đầu pha chế".
7. Trạng thái chuyển `accepted -> preparing`.
8. Khi xong, bấm "Sẵn sàng".
9. Trạng thái chuyển `preparing -> ready`.
10. Nếu cửa hàng tự giao, gán courier và chuyển `ready -> delivering`.
11. Khi giao xong, chuyển `delivering -> completed`.

### Quyền

- `store_staff`: đổi trạng thái đơn của cửa hàng mình.
- `store_manager`: đổi trạng thái, gán courier, hủy đơn theo chính sách.
- `system_admin/regional_manager`: can thiệp mọi đơn trong phạm vi quyền.

## Quy Trình 4: Cửa Hàng Từ Chối Đơn

### Khi nào từ chối

- Quá tải.
- Hết nguyên liệu.
- Ngoài vùng giao thực tế.
- Cửa hàng sắp đóng cửa.

### Luồng

1. Nhân viên bấm "Từ chối".
2. Bắt buộc chọn lý do.
3. Trạng thái `assigned -> rejected`.
4. Backend tìm cửa hàng ứng viên tiếp theo.
5. Nếu có, gán lại đơn.
6. Nếu không có, đơn chuyển về hàng đợi admin/support.
7. Khách được thông báo đơn đang được điều phối.

## Quy Trình 5: Khách Tự Đến Lấy Hoặc Được Giao Hàng

### Pickup

1. Khách chọn "Tự đến lấy".
2. Hệ thống vẫn chọn cửa hàng gần nhất hoặc khách tự chọn cửa hàng.
3. Khi đơn `ready`, khách nhận mã lấy hàng.
4. Cửa hàng hoàn tất đơn khi khách nhận.

### Delivery

1. Khách chọn "Giao hàng".
2. Hệ thống tính phí giao hàng.
3. Cửa hàng hoặc courier nhận giao.
4. Khách có thể xem hướng dẫn/lộ trình đến cửa hàng nếu tự lấy, hoặc trạng thái giao nếu delivery.

## Quy Trình 6: Quản Trị Cửa Hàng

### System Admin

1. Tạo cửa hàng.
2. Nhập địa chỉ, tỉnh, quận, tọa độ.
3. Cấu hình bán kính phục vụ.
4. Cấu hình giờ mở cửa.
5. Gán store manager.
6. Bật/tắt cửa hàng.

### Store Manager

1. Cập nhật giờ mở cửa nếu được cấp quyền.
2. Bật/tắt sản phẩm tại cửa hàng.
3. Cập nhật tồn kho.
4. Xem báo cáo cửa hàng.
5. Quản lý nhân viên cửa hàng.

## Quy Trình 7: Quản Lý Menu Và Tồn Kho

### Menu chung

Admin tạo sản phẩm toàn hệ thống:

- tên
- mô tả
- ảnh
- size
- topping
- giá chuẩn
- category
- trạng thái active

### Menu theo cửa hàng

Mỗi cửa hàng có thể:

- bật/tắt sản phẩm
- override giá nếu chính sách cho phép
- đánh dấu hết hàng
- giới hạn số lượng bán trong ngày

### Tồn kho MVP

MVP chỉ cần `available/unavailable`.

Sau này mở rộng:

- số lượng nguyên liệu
- cảnh báo sắp hết
- tự khóa món khi hết nguyên liệu

## Quy Trình 8: Quản Trị Người Dùng Và Phân Quyền

Pattern tham khảo từ `diabetes-prediction-webapp`:

- Dùng Supabase Auth để đăng nhập.
- Dùng bảng `profiles` để lưu role.
- Dùng RLS/RPC để kiểm tra quyền.
- Admin có màn quản lý user.
- Hành động nhạy cảm ghi audit log.

Áp dụng cho ChanhTea:

1. Admin tạo tài khoản hoặc mời nhân sự.
2. Nhân sự đăng nhập bằng email/password.
3. Admin gán nhân sự vào `store_members`.
4. Dashboard render theo role.
5. Backend/RLS chỉ trả dữ liệu đúng phạm vi.
6. Khi nhân sự nghỉ, admin remove khỏi store hoặc disable account.

## Quy Trình 9: Audit Log

Phải ghi log khi:

- Tạo/sửa/xóa cửa hàng.
- Gán/xóa nhân sự khỏi cửa hàng.
- Cửa hàng nhận/từ chối đơn.
- Admin chuyển đơn sang cửa hàng khác.
- Cập nhật trạng thái đơn.
- Hủy đơn.
- Cập nhật giá/menu/tồn kho.

Log nên có:

```text
actor_id
actor_role
action
entity_type
entity_id
store_id
old_data
new_data
created_at
```

## Quy Trình 10: Báo Cáo

### Store Dashboard

- Doanh thu hôm nay.
- Số đơn mới.
- Số đơn hoàn tất.
- Thời gian xử lý trung bình.
- Tỷ lệ từ chối đơn.
- Sản phẩm bán chạy.

### Admin Dashboard

- Doanh thu toàn hệ thống.
- Doanh thu theo tỉnh/thành.
- Top cửa hàng.
- Cửa hàng quá tải.
- Đơn bị từ chối/chuyển nhiều lần.
- Tỷ lệ hoàn tất đơn.
- Bản đồ phân bố đơn hàng.

## Chính Sách Trạng Thái Đơn

| From | To | Ai được đổi |
| --- | --- | --- |
| `pending` | `assigned` | backend system |
| `assigned` | `accepted` | store staff/manager |
| `assigned` | `rejected` | store staff/manager |
| `accepted` | `preparing` | store staff/manager |
| `preparing` | `ready` | store staff/manager |
| `ready` | `delivering` | store manager/courier |
| `delivering` | `completed` | courier/store manager |
| any active | `cancelled` | support/manager/admin theo rule |
| `rejected` | `assigned` | backend system/admin |

Không cho client tự gửi trạng thái tùy ý. Backend phải validate transition.

## API Contract MVP

### Public

```http
POST /api/public/resolve-store
POST /api/public/orders
GET  /api/public/orders/:code
```

### Store Dashboard

```http
GET   /api/store/orders
PATCH /api/store/orders/:id/status
GET   /api/store/products
PATCH /api/store/products/:id/availability
```

### Admin

```http
GET   /api/admin/stores
POST  /api/admin/stores
PATCH /api/admin/stores/:id
GET   /api/admin/orders
PATCH /api/admin/orders/:id/reassign
GET   /api/admin/users
POST  /api/admin/store-members
DELETE /api/admin/store-members/:id
GET   /api/admin/audit-logs
```

## Ưu Tiên MVP

1. Guest đặt hàng.
2. Tự gán đơn theo cửa hàng gần nhất.
3. Store dashboard nhận đơn realtime.
4. Store staff đổi trạng thái đơn.
5. Admin quản lý cửa hàng và nhân sự.
6. Audit log cơ bản.
7. Báo cáo doanh thu đơn giản.

Những phần như tích điểm, ví khách hàng, tracking courier realtime, tự động tối ưu tuyến nhiều đơn nên để giai đoạn sau.

## Trạng Thái Triển Khai Database

- Khách vẫn là trạng thái mặc định khi vào website. Trang `/dashboard` không tự hiển thị dữ liệu vận hành nếu chưa chọn tầng đăng nhập.
- Tầng cửa hàng dùng role `store_manager`, chỉ gọi API `/api/store/*` và chỉ thấy dữ liệu các store trong `storeIds`.
- Tầng tổng quan sát dùng role `system_admin`, gọi được `/api/admin/*` để xem toàn bộ cửa hàng, nhân sự và audit log.
- Khách đặt hàng gọi `/api/public/orders`; server tự chọn cửa hàng bằng `routingService`, không nhận `assigned_store_id` từ client.
- Menu sản phẩm gọi `/api/public/products`; chi nhánh gọi `/api/public/stores`; dữ liệu lấy từ Supabase Postgres qua `opsRepository`.
- Dashboard render panel bằng RBAC ở frontend nhưng API vẫn kiểm tra scope server-side. Trước production cần thay kiểm tra header bằng Supabase Auth JWT + RLS.
