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
| Booking request | request | Đề nghị của user xin một số phòng của một loại phòng, trong một khoảng ngày. **Chưa** phải chỗ đã giữ chắc — chỉ thành Booking khi admin duyệt | Sheet gốc gọi là "request booking" |
| Booking | | Một request đã được duyệt: chỗ giữ thật, chiếm đúng số phòng đã xin suốt khoảng ngày của nó | |
| Approve | | Quyết định của admin, biến request thành Booking | |
| Reject | | Quyết định của admin từ chối request; bắt buộc kèm lý do | |
| Cancel | | User **tự** rút request của mình, chỉ làm được khi chưa ai quyết | Khác Reject: khác người làm, khác điều kiện |
| Expired | | Request hết hạn giữ chỗ trước khi có ai quyết | Trạng thái cuối. Admin hết duyệt được, chỗ trả lại cho người khác |
| Event log | | Sổ **chỉ ghi thêm**: mỗi lần request đổi trạng thái là một dòng — ai đổi, lúc nào, vì sao | Không sửa, không xoá dòng đã ghi |
| Room type | | **Đơn vị được bán.** Mang thuộc tính (loại giường, hướng nhìn, amenity), giá mỗi đêm, và **số phòng** khách sạn có thuộc loại này. Khách chọn loại phòng chứ không chọn phòng nào cụ thể | Số phòng bằng 0 nghĩa là loại này hiện không bán được. Không có cờ "ngừng bán" riêng |
| Room | | Một phòng vật lý cụ thể, có số phòng riêng. **Ngoài phạm vi** — hệ thống này chỉ có đặt phòng, không có nhận phòng hay xếp phòng, nên không theo dõi từng phòng | Ghi lại để thấy rõ đây là chỗ đã cân nhắc và cố ý bỏ, không phải bị quên |
| Amenity | | Đặc điểm của một **loại phòng**, dùng để lọc khi tìm: điều hoà, loại giường, hướng nhìn | Thuộc về loại phòng, nên mọi phòng cùng loại đều giống nhau |
| Check-in / Check-out | | Ngày đến và ngày đi của một request. Khoảng giữa hai mốc là phần chỗ bị chiếm | |
| Availability | | Một loại phòng còn chỗ hay không, **xét trên một khoảng ngày cụ thể**. Không bao giờ là thuộc tính cố định — nói "còn phòng" mà không kèm ngày là vô nghĩa | Phải xét **từng ngày** trong khoảng: đầy ngày 10 mà trống ngày 11 thì vẫn là không đặt được |
| Hold | | Quyền chiếm giữ mà một request đặt lên **n chỗ của một loại phòng**, suốt khoảng ngày của nó. Request `pending` hoặc `approved` thì giữ; `rejected`, `cancelled`, `expired` thì không giữ gì | Đây là nghĩa thật của câu "hết phòng". Tổng số chỗ đang giữ không được vượt quá số phòng của loại đó (NFR-005) |
| Hold expiry | | Mốc request đang chờ duyệt mất quyền giữ chỗ: 24h sau khi gửi, hoặc ngày check-in, tuỳ cái nào đến trước | Nhờ vậy request không sống lâu hơn kỳ lưu trú nó xin |
| Capacity | | Số chỗ đang được giữ của một loại phòng, tính **trên từng ngày**. Vượt quá số phòng của loại đó trong **bất kỳ ngày nào** của khoảng yêu cầu là điều kiện hệ thống buộc phải từ chối (NFR-005) | Quy tắc đúng-sai cốt lõi của cả dự án. Hai request giẫm ngày lên nhau **không** còn là vi phạm — chỉ vượt số lượng mới là |
| Visitor | ROLE-001 | Người dùng chưa đăng nhập. Chọn từ này thay cho "Guest" chính là để tránh va chạm ở dòng dưới | |
| Guest | | **Chỉ theo nghĩa khách sạn**: khách trả tiền và lưu trú. Trong hệ thống này Guest luôn là ROLE-002 User, không bao giờ là ROLE-001 | Sheet gốc viết "Guess" để chỉ người chưa đăng nhập — ngược hẳn nghĩa khách sạn. Tên role ở đây cố ý tránh hẳn từ này |
| Mock Project | MP | Bài tập cuối lộ trình training NestJS: tự chọn đề tài, làm trọn vẹn, mentor review | |

## 2. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; chốt 13 thuật ngữ, gồm va chạm tên Visitor / Guest |
| 2026-09-19 | ba-analyze-requirement skill | Thêm 5 thuật ngữ từ phân tích F-008: Hold, Hold expiry, On sale, Expired, Event log |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột, tên thuật ngữ và giá trị trạng thái giữ tiếng Anh |
| 2026-09-19 | — | Đơn vị được bán đổi từ phòng cụ thể sang **loại phòng**. `Room` → `Room type`; `Room` giữ lại như thuật ngữ ngoài phạm vi; `Overlap` → `Capacity`; bỏ `On sale` (số phòng bằng 0 thay cho cờ ngừng bán) |
