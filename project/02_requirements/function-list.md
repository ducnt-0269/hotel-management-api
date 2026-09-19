# Function List

> Phạm vi những gì sẽ xây. `pm-plan-schedule` (SCH) biến function group thành Epic và function thành
> Story trong WBS, rồi ghi ngược story ID vào cột "Related WBS ID".
> Chi tiết từng function (use case, input/output, business rule) nằm trong `functions/` và do
> `ba-analyze-requirement` quản — ở đây cột "Detail document" để trống hoặc `TBD`.
>
> Priority chép từ sheet requirement gốc: **dòng bôi vàng → `must`**, dòng trắng trong khối Basic →
> `should`, dòng trong khối Advance → `could`. Cam kết giao `must` + `should`; `could` chỉ làm nếu
> còn thời gian.
>
> **Tên cột giữ nguyên tiếng Anh** — chín skill trong kit đọc file này, và `pm-plan-schedule` ghi
> thẳng vào cột theo tên. Đổi tên cột là làm hỏng cả chuỗi PM phía sau.

## 1. Function Groups

| FG-ID | Function group | Description |
| --- | --- | --- |
| FG-01 | Account & Authentication | Đăng ký, đăng nhập, đăng xuất, tự quản lý hồ sơ và mật khẩu, cùng việc admin quản lý tài khoản |
| FG-02 | Room Catalogue | Xem và tìm kiếm các phòng đang bán, và việc duy trì bản ghi phòng phía sau |
| FG-03 | Booking | Vòng đời booking request: tạo request, theo dõi, huỷ, và quyết định duyệt của người vận hành |
| FG-04 | Review | Đánh giá của khách về phòng đã ở, và việc kiểm duyệt chúng |
| FG-05 | Notification | Mail hệ thống tự gửi, kích hoạt bởi một sự kiện hoặc một lịch chạy, không phải bởi một request |
| FG-06 | Reporting & Analytics | Các bản export và số liệu tổng hợp mà người vận hành đọc để điều hành khách sạn |

## 2. Functions

| F-ID | FG-ID | Function name | Summary | Priority | Target roles | Related WBS ID | Detail document |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | FG-01 | Register an account | Visitor tạo tài khoản với thông tin đăng nhập cần thiết | must | ROLE-001 | | TBD |
| F-002 | FG-01 | Sign in / sign out | Đổi thông tin đăng nhập lấy một phiên, và kết thúc phiên đó khi được yêu cầu | must | ROLE-002, ROLE-003 | | TBD |
| F-003 | FG-01 | View and edit own profile, change password | User đã đăng nhập xem và sửa thông tin của mình, đổi mật khẩu | should | ROLE-002, ROLE-003 | | TBD |
| F-004 | FG-01 | Manage users | Người vận hành xem danh sách user, mở chi tiết, và bật/tắt tài khoản | should | ROLE-003 | | TBD |
| F-005 | FG-02 | View room list and room detail | Ai cũng xem được danh sách phòng đang bán và mở một phòng để xem mô tả đầy đủ | must | ROLE-001, ROLE-002, ROLE-003 | | TBD |
| F-006 | FG-02 | Search available rooms by date range and amenity | Tìm các phòng trống trong kỳ lưu trú muốn đặt, lọc thêm theo amenity như điều hoà, loại giường, hướng nhìn | must | ROLE-001, ROLE-002 | | TBD |
| F-007 | FG-02 | Manage rooms (CRUD) | Người vận hành tạo, sửa, xoá bản ghi phòng | should | ROLE-003 | | TBD |
| F-008 | FG-03 | Raise a booking request | User đã đăng nhập xin một hoặc nhiều phòng cho một khoảng ngày; các phòng bị giữ cho tới khi admin quyết hoặc hết hạn giữ | must | ROLE-002 | | [function-8-raise-booking-request.md](./functions/function-8-raise-booking-request.md) |
| F-009 | FG-03 | View own booking history | User xem lại các request mình đã tạo và trạng thái hiện tại của từng cái | must | ROLE-002 | | TBD |
| F-010 | FG-03 | Cancel an unconfirmed request | User rút request của mình khi người vận hành chưa quyết | must | ROLE-002 | | TBD |
| F-011 | FG-03 | Approve or reject a booking request | Người vận hành xem danh sách và chi tiết request rồi quyết định; từ chối thì kèm lý do | must | ROLE-003 | | TBD |
| F-012 | FG-03 | Pay for a request | User thanh toán số tiền của booking mình đã đặt | should | ROLE-002 | | TBD |
| F-013 | FG-04 | Review a room already booked | User chấm điểm và viết nhận xét cho phòng mình đã ở | should | ROLE-002 | | TBD |
| F-014 | FG-04 | Moderate reviews | Người vận hành duyệt hoặc từ chối một review trước khi nó hiển thị | should | ROLE-003 | | TBD |
| F-015 | FG-05 | Email on booking approval, rejection or change | User được báo kết quả request của mình, kèm lý do khi bị từ chối | must | ROLE-002 | | TBD |
| F-016 | FG-05 | Account activation email | Visitor vừa đăng ký nhận được mail kích hoạt tài khoản | should | ROLE-001 | | TBD |
| F-017 | FG-06 | Export the room list to Excel | Người vận hành tải về các phòng khớp điều kiện tìm kiếm hiện tại dưới dạng bảng tính | could | ROLE-003 | | TBD |
| F-018 | FG-06 | Booking request statistics | Số lượng request tổng hợp theo tháng, theo quý và theo hạng phòng | could | ROLE-003 | | TBD |
| F-019 | FG-06 | Revenue statistics | Doanh thu tổng hợp theo khoảng thời gian chọn và theo hạng phòng | could | ROLE-003 | | TBD |
| F-020 | FG-05 | Month-end revenue summary email | Ngày cuối mỗi tháng, người vận hành được gửi bản tổng hợp doanh thu mà không cần yêu cầu | could | ROLE-003 | | TBD |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; điền FG-01..FG-06 và F-001..F-020 từ sheet requirement gốc |
| 2026-09-19 | ba-analyze-requirement skill | Tạo detail document cho F-008; sửa Summary của nó để phản ánh việc một request có thể giữ nhiều phòng |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; tên cột, F-ID, FG-ID, ROLE-ID, giá trị Priority và Function name giữ tiếng Anh |
