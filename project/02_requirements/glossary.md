# Glossary

> Thu thập ngược: thuật ngữ được ghi lại trong lúc phỏng vấn Block O–C rồi cùng chốt định nghĩa.
> Từ vựng IT phổ thông (login, JWT, CSV) cố ý không đưa vào — chỉ ghi thuật ngữ nghiệp vụ và
> thuật ngữ riêng của dự án.
>
> Tên thuật ngữ giữ nguyên tiếng Anh vì chúng xuất hiện nguyên văn trong code — giá trị trạng thái,
> tên cột. Chỉ phần định nghĩa viết bằng tiếng Việt.

## 1. Terms

| Term | Abbrev | Definition | Notes |
| --- | --- | --- | --- |
| Booking request | request | Đề nghị của user xin chiếm một phòng trong một khoảng ngày. **Chưa** phải chỗ đã giữ chắc — chỉ thành Booking khi admin duyệt | Sheet gốc gọi là "request booking" |
| Booking | | Một request đã được duyệt: chỗ giữ thật, chiếm phòng trong khoảng ngày của nó | |
| Approve | | Quyết định của admin, biến request thành Booking | |
| Reject | | Quyết định của admin từ chối request; bắt buộc kèm lý do | |
| Cancel | | User **tự** rút request của mình, chỉ làm được khi chưa ai quyết | Khác Reject: khác người làm, khác điều kiện |
| Expired | | Request hết hạn giữ phòng trước khi có ai quyết | Trạng thái cuối. Admin hết duyệt được, phòng trả lại cho người khác |
| Event log | | Sổ **chỉ ghi thêm**: mỗi lần request đổi trạng thái là một dòng — ai đổi, lúc nào, vì sao | Không sửa, không xoá dòng đã ghi |
| Room | | Một phòng vật lý cụ thể, có số phòng riêng. **Không phải** hạng phòng — hệ thống này đặt theo phòng cụ thể | Chốt một câu mô hình hoá mà chọn khác đi là đổi cả bảng booking |
| On sale | | Phòng có được phép bán hay không — thuộc tính của **bản thân cái phòng**, không liên quan ngày nào trống | Phòng trống hoàn toàn vẫn có thể không bán được. Khác Availability, vốn luôn gắn với khoảng ngày |
| Amenity | | Đặc điểm phòng dùng để lọc khi tìm: điều hoà, loại giường, hướng nhìn | |
| Check-in / Check-out | | Ngày đến và ngày đi của một request. Khoảng giữa hai mốc là phần phòng bị chiếm | |
| Availability | | Phòng trống hay không, **xét trên một khoảng ngày cụ thể**. Không bao giờ là thuộc tính cố định — nói "phòng trống" mà không kèm ngày là vô nghĩa | |
| Hold | | Quyền chiếm giữ mà một request đặt lên một phòng trong khoảng ngày của nó. Request `pending` hoặc `approved` thì giữ; `rejected`, `cancelled`, `expired` thì không giữ gì | Đây là nghĩa thật của câu "phòng đã có người". Hai Hold không được chồng nhau trên cùng một phòng (NFR-005) |
| Hold expiry | | Mốc request đang chờ duyệt mất quyền giữ phòng: 24h sau khi gửi, hoặc ngày check-in, tuỳ cái nào đến trước | Nhờ vậy request không sống lâu hơn kỳ lưu trú nó xin |
| Overlap | | Hai khoảng ngày giẫm lên nhau trên cùng một phòng — điều kiện hệ thống buộc phải từ chối (NFR-005) | Quy tắc đúng-sai cốt lõi của cả dự án |
| Visitor | ROLE-001 | Người dùng chưa đăng nhập. Chọn từ này thay cho "Guest" chính là để tránh va chạm ở dòng dưới | |
| Guest | | **Chỉ theo nghĩa khách sạn**: khách trả tiền và lưu trú. Trong hệ thống này Guest luôn là ROLE-002 User, không bao giờ là ROLE-001 | Sheet gốc viết "Guess" để chỉ người chưa đăng nhập — ngược hẳn nghĩa khách sạn. Tên role ở đây cố ý tránh hẳn từ này |
| Mock Project | MP | Bài tập cuối lộ trình training NestJS: tự chọn đề tài, làm trọn vẹn, mentor review | |

## 2. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; chốt 13 thuật ngữ, gồm va chạm tên Visitor / Guest |
| 2026-09-19 | ba-analyze-requirement skill | Thêm 5 thuật ngữ từ phân tích F-008: Hold, Hold expiry, On sale, Expired, Event log |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột, tên thuật ngữ và giá trị trạng thái giữ tiếng Anh |
