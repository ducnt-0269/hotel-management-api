# Role List & Permission Matrix

## 1. User Roles

| ROLE-ID | Role name | Description | Typical user |
| --- | --- | --- | --- |
| ROLE-001 | Visitor | Chưa đăng nhập. Xem danh sách và chi tiết loại phòng, tìm loại phòng còn chỗ, tự đăng ký tài khoản. **Không phải một tài khoản**: không bản ghi `users` nào mang role này — nó là trạng thái *chưa xác thực*, trong code thể hiện bằng việc route không gắn guard, không bao giờ bằng một giá trị enum lưu trong DB | Người đang cân nhắc đặt phòng, chưa có tài khoản. Cố ý **không** gọi là "Guest": trong ngôn ngữ khách sạn, guest là khách trả tiền và lưu trú — mà trong hệ thống này luôn là ROLE-002 |
| ROLE-002 | User | Khách đã đăng ký và đăng nhập. Làm được mọi thứ ROLE-001 làm, cộng thêm: tạo booking request, xem lịch sử request **của chính mình**, và huỷ request khi chưa ai quyết | Khách đặt phòng |
| ROLE-003 | Admin | Người vận hành khách sạn. Duyệt hoặc từ chối booking request — từ chối bắt buộc kèm lý do — và xem được request của mọi user | Lễ tân / quản lý khách sạn |

## 2. Permission Matrix (function × role)

> Mỗi role ở §1 một cột, mỗi function trong `function-list.md` một dòng.
> Ký hiệu: ✅ = được phép / — = không được phép / △ = có điều kiện (ghi điều kiện ở cột Notes).

| F-ID | Function | ROLE-001 Visitor | ROLE-002 User | ROLE-003 Admin | Notes |
| --- | --- | --- | --- | --- | --- |
| F-001 | Register an account | ✅ | — | — | Đã đăng nhập thì không còn nghĩa |
| F-002 | Sign in / sign out | △ | ✅ | ✅ | Visitor thực hiện nửa đăng nhập; đăng xuất thì phải đang có phiên |
| F-003 | View and edit own profile, change password | — | ✅ | ✅ | Chỉ bản ghi của chính mình |
| F-004 | Manage users | — | — | ✅ | |
| F-005 | View room type list and room type detail | ✅ | ✅ | ✅ | Công khai |
| F-006 | Search available room types by date range and amenity | ✅ | ✅ | △ | Endpoint công khai nên admin gọi được, nhưng không nằm trong luồng nghiệp vụ của admin — họ dùng F-007 |
| F-007 | Manage room types (CRUD) | — | — | ✅ | Gồm cả số phòng của mỗi loại; hạ về 0 là ngừng bán loại đó |
| F-008 | Raise a booking request | — | ✅ | — | |
| F-009 | View own booking history | — | ✅ | — | Chỉ request của mình; admin xem toàn bộ qua F-011 |
| F-010 | Cancel an unconfirmed request | — | △ | — | Request của mình, và chỉ khi chưa ai quyết |
| F-011 | Approve or reject a booking request | — | — | ✅ | Từ chối bắt buộc kèm lý do |
| F-012 | Pay for a request | — | △ | — | Chỉ request của mình |
| F-013 | Review a completed booking | — | △ | — | Chỉ booking của chính user này, và chỉ khi đã hoàn thành |
| F-014 | Moderate reviews | — | — | ✅ | |
| F-015 | Email on booking approval, rejection or change | — | ✅ | — | Là người nhận, không phải hành động role này gọi |
| F-016 | Account activation email | ✅ | — | — | Người nhận |
| F-017 | Export the room type list to Excel | — | — | ✅ | |
| F-018 | Booking request statistics | — | — | ✅ | |
| F-019 | Revenue statistics | — | — | ✅ | |
| F-020 | Month-end revenue summary email | — | — | ✅ | Người nhận |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; điền §1 User Roles |
| 2026-09-18 | pm-gather-requirements skill | Điền §2 Permission Matrix cho F-001..F-020 |
| 2026-09-18 | pm-gather-requirements skill | Đổi tên ROLE-001 Guest → Visitor để dứt điểm va chạm với "guest" nghĩa khách sạn |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột và tên function giữ tiếng Anh |
| 2026-09-19 | — | Đơn vị được bán đổi sang loại phòng: sửa mô tả ROLE-001, và chép lại tên function mới của F-005, F-006, F-007, F-013, F-017 cho khớp `function-list.md` |
| 2026-09-19 | — | F-013 đổi thành "Review a completed booking" cho khớp `function-list.md` |
