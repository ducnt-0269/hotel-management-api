# Non-Functional Requirements

> Nhóm nào không áp dụng cho dự án này thì ghi rõ **out of scope** kèm lý do, thay vì điền máy móc
> cho đủ. Con số chỉ được ghi vào khi user đã duyệt.
> Các yêu cầu tương thích ghi ở đây là căn cứ cho `pm-plan-test` (TEST) §3.1.
>
> Ghi chú phạm vi: đây là Mock Project training, chạy local trong Docker và không bao giờ deploy
> production. Những yêu cầu giữ lại dưới đây là những thứ bài nộp thực sự bị chấm; phần còn lại
> liệt kê ở §2 kèm lý do vì sao không áp dụng.

## 1. Requirements

| NFR-ID | Category | Requirement | Target value | Priority | How it is verified | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-001 | Performance | Tìm loại phòng còn chỗ theo khoảng ngày vẫn phản hồi tốt trên tập dữ liệu thực tế | **Chưa chốt ở bước requirement.** Đo baseline trên tập dữ liệu seeder sinh ra (~20 loại phòng, ~5.000 booking) khi có seeder, ghi lại vào đây, rồi mới thống nhất ngưỡng | should | Đo và ghi baseline; thay đổi về sau không được tệ đi so với baseline | Không có traffic thật nào để rút ra con số, mà một con số bịa thì không ai bảo vệ được. Để mở theo đúng hướng dẫn của chính catalog NFR khi căn cứ mỏng. Chi phí truy vấn tỉ lệ với **số booking × số đêm** của khoảng tìm, không phải số loại phòng — seeder phải bơm vào chỗ đó thì baseline mới có nghĩa |
| NFR-002 | Performance | Các endpoint dạng danh sách không sinh truy vấn N+1 | Số query không tăng theo số bản ghi trong một trang | must | Assert số query trong test | |
| NFR-003 | Security | Mật khẩu chỉ lưu dạng băm và không endpoint nào trả về | bcrypt; không có trường password trong bất kỳ response nào | must | Unit test + e2e | |
| NFR-004 | Security | Mọi endpoint ngoài danh mục loại phòng công khai đều đòi token hợp lệ; endpoint admin từ chối token không phải admin | 401 khi thiếu token, 403 khi sai quyền | must | e2e cho từng role | |
| NFR-005 | Data integrity | **Chính database** từ chối khi số chỗ đã giữ của một loại phòng vượt quá số phòng của loại đó, trong bất kỳ ngày nào của khoảng yêu cầu — chỉ kiểm tra ở tầng ứng dụng là không đủ | Ràng buộc ở tầng database, không phải chỉ một phép kiểm trong service. Phép kiểm xét **từng ngày** trong khoảng, không phải cả kỳ một lần | must | Test ghi đồng thời hai request | Bảo đảm quan trọng nhất của cả hệ thống; xem system-overview §2 vấn đề 1. Chỗ dễ sai: độ kín đổi theo từng ngày, nên đếm gộp cả kỳ sẽ cho kết quả đúng lúc test mà sai khi có dữ liệu thật |
| NFR-006 | Maintainability | Mọi migration đều có đường lùi chạy được | `up → down → up` hoàn tất sạch | should | Chạy trong CI | |
| NFR-007 | Maintainability | Unit test và e2e chạy tự động mỗi lần push, và phải xanh trước khi merge | Toàn bộ suite xanh | must | GitHub Actions | |

## 2. Out of Scope

| Category | Reason |
| --- | --- |
| Availability | Không bao giờ deploy production; chạy local trong Docker nên không có uptime nào để cam kết |
| Extensibility | Bài training có phạm vi đóng, không có lộ trình mở rộng |
| Laws & Regulations | Không có dữ liệu cá nhân thật và không có người dùng thật |
| Data Management | Không có dữ liệu production để backup hay đặt thời hạn lưu trữ |
| Compatibility | Chính catalog NFR loại sẵn — nó thuộc pha lập kế hoạch test, không thuộc requirement |

## 3. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-18 | pm-gather-requirements skill | Tạo mới; duyệt NFR-001..NFR-007, ghi 5 nhóm là out of scope |
| 2026-09-18 | pm-gather-requirements skill | Để mở target của NFR-001 — thay con số p95 tự nghĩ bằng một baseline đo được |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột, NFR-ID và tên Category giữ tiếng Anh |
| 2026-09-19 | — | Viết lại NFR-001 theo mô hình loại phòng: tập baseline đổi từ ~200 phòng sang ~20 loại phòng, và ghi rõ chi phí truy vấn tỉ lệ với số booking × số đêm |
| 2026-09-19 | — | Viết lại NFR-005 theo mô hình loại phòng: điều kiện từ chối không còn là hai hold chồng nhau trên cùng một phòng, mà là số chỗ đã giữ vượt quá số phòng của loại đó trong một ngày bất kỳ |
