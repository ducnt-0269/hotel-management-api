# System Overview

> Góc nhìn sản phẩm: xây cái gì, vì sao, và nhằm đạt được gì.
> KPI và tiêu chí thành công **không thuộc file này** — chúng nằm ở `project/01_management/overview.md`
> §2, do `pm-plan-project` (PLAN) quản.

## 1. Service Overview

Hệ thống quản lý khách sạn, giao dưới dạng **REST API backend, không có frontend**.
Visitor xem danh sách phòng và tìm phòng trống mà không cần đăng nhập. User đã đăng ký thì tạo
booking request, xem lại lịch sử request của chính mình, và huỷ request khi chưa ai quyết.
Admin duyệt hoặc từ chối các request đó — từ chối thì bắt buộc kèm lý do.

Đây là **Mock Project của lộ trình training NestJS**: sản phẩm làm ra để thể hiện các kỹ năng
trong checklist và để mentor review, không phải để phục vụ một khách sạn thật.

| Item | Value |
| --- | --- |
| Target platform | Web API (REST / JSON), chỉ backend — không dựng UI |
| Primary users | Visitor (chưa đăng nhập) / User (đã đăng ký) / Admin (người vận hành khách sạn) |
| Where the data is mastered | Toàn bộ dữ liệu nhập và lưu trong hệ thống này; không tích hợp hệ thống ngoài |

## 2. Background & Problems

> **Lưu ý:** bối cảnh nghiệp vụ dưới đây là *giả thuyết* dựng cho bài Mock Project.
> Nó không đến từ khách hàng thật và không được đọc như thông tin đã xác nhận.

| # | Current problem | Impact |
| --- | --- | --- |
| 1 | Booking request nhận qua điện thoại và ghi vào sổ giấy; hai nhân viên có thể nhận hai request cho cùng một phòng, cùng khoảng ngày | Khách tới nơi mới biết không có phòng — phải xin lỗi, bố trí bù hoặc hoàn tiền |
| 2 | Khách không tự tra được phòng nào trống ngày nào, phải gọi lễ tân | Lễ tân quá tải giờ cao điểm; khách gọi ngoài giờ không ai nghe nên bỏ sang khách sạn khác |
| 3 | Request được xác nhận thủ công, khách không có cách nào tự xem request của mình đang ở đâu | Khách gọi lại nhiều lần; tổng đài tốn thời gian trả lời cùng một câu |
| 4 | Khi từ chối request, lý do chỉ nói miệng, không lưu ở đâu | Khách không hiểu vì sao; về sau không ai tra lại được ai từ chối và vì lý do gì |
| 5 | Muốn huỷ request phải gọi điện trong giờ hành chính | Khách huỷ muộn hoặc không huỷ; phòng bị giữ vô ích, mất cơ hội bán |

## 3. Objectives & Value Delivered

| # | Objective | Value delivered | Related problem # |
| --- | --- | --- | --- |
| 1 | Cho khách tự tra phòng trống theo khoảng ngày và theo amenity | Khách tự phục vụ 24/7; lễ tân bớt hẳn cuộc gọi tra cứu | 2 |
| 2 | Từ chối booking bị overlap ngay tại thời điểm ghi nhận request | Không còn cảnh khách tới nơi mà phòng đã có người | 1 |
| 3 | Cho user xem lịch sử và trạng thái request của chính mình | Khách tự kiểm tra, không phải gọi hỏi | 3 |
| 4 | Bắt buộc nhập lý do khi từ chối, và gửi mail thông báo tự động | Khách biết kết quả ngay và biết vì sao; quyết định để lại dấu vết | 3, 4 |
| 5 | Cho user tự huỷ request khi chưa ai quyết | Phòng được trả lại sớm và bán lại được | 5 |

## 4. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; điền §1 Service Overview |
| 2026-09-18 | pm-gather-requirements skill | Điền §2 Background & Problems và §3 Objectives (bối cảnh nghiệp vụ là giả thuyết, đã ghi rõ) |
| 2026-09-18 | pm-gather-requirements skill | Đổi tên ROLE-001 Guest → Visitor; từ "guest" từ nay chỉ còn nghĩa khách lưu trú |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading và tên cột giữ tiếng Anh |
