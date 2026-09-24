# F-008 Raise a booking request

> Related: [Function list](../function-list.md)
>
> Tài liệu này viết bằng tiếng Việt theo quyết định của dự án. Skill sinh ra nó quy định tiếng Nhật
> cho thư mục này; việc đi lệch là cố ý, vì người review dự án này đọc tiếng Việt.
> Heading, tên cột, mã tham chiếu (F-xxx, ROLE-xxx, NFR-xxx, AC-x, E-x, A-x) và tên trạng thái giữ
> nguyên tiếng Anh, vì chúng xuất hiện nguyên văn trong code và trong các tài liệu khác.

## 1. Feature Information

| Item | Value |
| --- | --- |
| Feature ID | F-008 |
| Feature name | Raise a booking request |
| Summary | User đã đăng nhập xin một số phòng của một loại phòng cho một khoảng ngày; request được ghi nhận ở trạng thái chờ admin quyết, và giữ số chỗ đó cho tới khi có quyết định hoặc hết hạn giữ. |
| Priority | must |
| Target roles | ROLE-002 |
| Approver | |
| Approval date | |

## 2. Background & Purpose

Chức năng này giải vấn đề 1 trong system-overview §2 — booking request nhận qua điện thoại rồi ghi
vào sổ giấy, nên nhân viên có thể nhận nhiều request hơn số phòng khách sạn thực có của loại phòng
đó trong cùng một ngày, và khách chỉ phát hiện ra lúc tới nơi. Đây cũng chính là chỗ mục tiêu 2 —
"từ chối ngay tại thời điểm ghi nhận request, khi request đó làm số chỗ đã giữ vượt quá số phòng của
loại đó" — được thực hiện thật; mọi bước sau của vòng đời booking đều mặc định rằng request đã đúng
từ lúc được nhận.

Không có nó thì danh mục loại phòng dẫn tới ngõ cụt: F-005 và F-006 cho khách xem loại phòng và tìm
ngày còn chỗ, nhưng không có gì biến cái đó thành một chỗ giữ, và khách sạn quay lại với điện thoại
cùng cuốn sổ đã gây ra vấn đề.

Coi là thành công khi một request vượt quá số phòng bị từ chối ngay lúc ghi nhận chứ không phải lúc
khách tới nhận phòng, và khi nhiều request gửi cùng một khoảnh khắc cho cùng một loại phòng cùng
khoảng ngày không bao giờ làm tổng số chỗ đã giữ lớn hơn số phòng khách sạn có.

## 3. Use Case & Business Flow

| Item | Value |
| --- | --- |
| Actor | ROLE-002 |
| Trigger | User gửi một request nêu một loại phòng, số phòng muốn đặt, và một khoảng lưu trú |
| Preconditions | User đã đăng nhập; loại phòng được nêu tồn tại và có số phòng lớn hơn 0 |

### 3.1 Basic flow

1. ROLE-002 gửi request nêu một loại phòng, số phòng muốn đặt, một ngày check-in và một ngày
   check-out.
2. Hệ thống kiểm tra ngày check-out có rơi sau ngày check-in không.
3. Hệ thống xét **từng ngày** trong khoảng: với mỗi ngày, cộng số chỗ của loại phòng đó đang bị các
   request `pending` và `approved` giữ, cộng thêm số phòng đang xin, rồi so với số phòng khách sạn
   có thuộc loại đó. Chỉ cần **một** ngày vượt quá là không đủ chỗ.
4. Hệ thống ghi nhận request ở trạng thái chờ admin quyết, và giữ đúng số phòng đã xin suốt khoảng
   ngày đó.
5. Hệ thống ấn định thời điểm hold hết hiệu lực: 24 giờ sau khi gửi, hoặc ngày check-in, tuỳ cái nào
   đến trước.
6. User được hiển thị request vừa ghi nhận — loại phòng, số phòng, khoảng ngày, trạng thái, và thời
   điểm hold hết hiệu lực.

### 3.2 Alternate flows

**A-1: Kỳ lưu trú bắt đầu trong vòng 24 giờ**

Hold hết hiệu lực vào ngày check-in thay vì 24 giờ sau khi gửi, để request không bao giờ sống lâu hơn
kỳ lưu trú mà chính nó xin.

### 3.3 Exception flows

**E-1: Không đủ chỗ ở ít nhất một ngày trong khoảng**

1. Hệ thống phát hiện có ít nhất một ngày mà số chỗ đã giữ cộng số phòng đang xin vượt quá số phòng
   của loại đó.
2. Không ghi nhận gì và không giữ chỗ nào — kể cả khi những ngày còn lại trong khoảng vẫn còn chỗ.
   User được cho biết ngày nào không đủ. Request được hoặc mất nguyên khối.

**E-2: Ngày check-out không rơi sau ngày check-in**

1. Hệ thống từ chối request trước khi kiểm tra chỗ của bất kỳ ngày nào.
2. Không ghi nhận gì; user được cho biết khoảng ngày không hợp lệ.

**E-3: Nhiều user gửi request cho cùng một loại phòng, cùng khoảng ngày, vào cùng một khoảnh khắc**

1. Chỉ những request mà tổng số chỗ vẫn nằm trong số phòng của loại đó được ghi nhận.
2. Các request còn lại được cho biết đã hết chỗ, và không giữ lại gì.

**E-4: Admin không quyết định trước khi hold hết hiệu lực**

1. Request thôi ở trạng thái chờ quyết định và số chỗ của nó được trả lại cho người khác.
2. Admin không còn duyệt được nữa; user nhìn thấy request đã hết hạn.

**E-5: Loại phòng được nêu có số phòng bằng 0**

1. Hệ thống từ chối request trước khi kiểm tra chỗ của bất kỳ ngày nào.
2. Không ghi nhận gì và không giữ chỗ nào. User được cho biết loại phòng này hiện không đặt được.

## 4. Input / Output

| Item | Kind | Content & constraints |
| --- | --- | --- |
| Room type | Input | Bắt buộc. Đúng một loại phòng cho mỗi request. Phải tồn tại và có số phòng lớn hơn 0. |
| Room count | Input | Bắt buộc. Một số nguyên từ 1 đến 5. |
| Check-in date | Input | Bắt buộc. Một ngày lịch, sớm nhất là ngày mai (giờ khách sạn) và không xa quá 12 tháng. |
| Check-out date | Input | Bắt buộc. Một ngày lịch. Phải rơi sau ngày check-in, và kỳ lưu trú không quá 30 đêm. |
| Requesting user | Input (derived) | Lấy từ phiên đăng nhập, không bao giờ nhận từ phía gọi. Chỉ ROLE-002. |
| Request reference | Output | Định danh request vừa ghi nhận để user tìm lại được trong lịch sử của mình (F-009). |
| Request state | Output | Khi thành công: đang chờ admin quyết. |
| Rooms held | Output | Số phòng đã giữ của loại phòng đó, kèm khoảng ngày đang bị giữ. |
| Hold expiry | Output | Thời điểm hold hết hiệu lực: 24 giờ sau khi gửi, hoặc ngày check-in, tuỳ cái nào đến trước. |
| Total amount | Output, persisted | Chốt tại thời điểm ghi nhận request, từ giá mỗi đêm của loại phòng, số đêm và số phòng. Không bao giờ tính lại, nên giá đổi về sau không làm đổi một request đã tạo. |
| Clash report | Output (failure) | Nêu (những) ngày không đủ chỗ. Không ghi nhận gì và không giữ chỗ nào — xem §3 E-1. |
| Booking request | Persisted | Request cùng user, loại phòng, số phòng, khoảng ngày, trạng thái, tổng tiền và thời điểm hết hạn hold. |
| Room hold | Derived | Không có bản ghi riêng: chính request ở `pending` hoặc `approved` là cái giữ chỗ. Số chỗ đang giữ của một loại phòng trong một ngày là tổng số phòng của các request như vậy phủ lên ngày đó — đây là đại lượng mà NFR-005 ràng buộc. |
| External data | — | Không có. Chức năng này không trao đổi gì với hệ thống ngoài. |

<!-- Cách bố trí trường trên màn hình nằm ngoài phạm vi — đó là việc của 04_screen-design/. -->

## 5. Business Rules & Constraints

### 5.1 Validation

- Một request nêu đúng một loại phòng và từ 1 đến 5 phòng của loại đó. Loại phòng phải tồn tại và có
  số phòng lớn hơn 0.
- Ngày check-in sớm nhất là ngày mai theo giờ khách sạn (Asia/Saigon), và không xa quá 12 tháng.
- Ngày check-out phải rơi sau ngày check-in, và kỳ lưu trú không quá 30 đêm.
- Mọi phép kiểm chạy ở phía server khi request được gửi. Request trượt bất kỳ phép kiểm nào đều bị
  từ chối nguyên khối: không ghi nhận gì và không giữ chỗ nào.

### 5.2 Permission control

- Chỉ ROLE-002 được tạo request. ROLE-001 chưa đăng nhập nên không tạo được; ROLE-003 quyết định trên
  các request (F-011) chứ không tạo chúng.
- User tạo request được lấy từ phiên đăng nhập. Phía gọi không thể tạo request dưới tên người khác.
- Phía gọi không có phiên hợp lệ bị coi như chưa đăng nhập và không biết được gì về loại phòng, hold
  hay các request đang có (NFR-004).

### 5.3 Business logic

**States**

| State | Meaning | Entered when | By |
| --- | --- | --- | --- |
| pending | Đang chờ admin quyết định | Request được ghi nhận | ROLE-002 (F-008) |
| approved | Admin đã chấp nhận | Admin duyệt | ROLE-003 (F-011) |
| rejected | Admin đã từ chối, kèm lý do | Admin từ chối | ROLE-003 (F-011) |
| cancelled | User đã rút lại | User huỷ | ROLE-002 (F-010) |
| expired | Hold hết hiệu lực trước khi có ai quyết | Thời điểm hết hạn hold đi qua | Hệ thống |

**Legal transitions**

| From | To | Who | Condition |
| --- | --- | --- | --- |
| pending | approved | ROLE-003 | — |
| pending | rejected | ROLE-003 | Bắt buộc nêu lý do |
| pending | cancelled | ROLE-002 | Chỉ request của chính mình |
| pending | expired | Hệ thống | Thời điểm hết hạn hold đã đi qua |

`approved`, `rejected`, `cancelled` và `expired` là trạng thái cuối. Đặc biệt, một request đã
`approved` thì user không huỷ được nữa — sheet gốc quy định vậy, và đây là chủ ý.

**Holding rooms**

- Request ở `pending` hoặc `approved` giữ đúng số phòng nó xin, suốt khoảng ngày của nó.
- Request ở `rejected`, `cancelled` hoặc `expired` không giữ gì; số chỗ của nó trả lại cho người khác.

**Capacity**

- Số chỗ đang giữ của một loại phòng tính **trên từng ngày**, không phải trên cả kỳ. Một request phủ
  lên ngày nào thì đóng góp số phòng của nó vào ngày đó.
- Một request được chấp nhận chỉ khi, với **mọi** ngày trong khoảng nó xin, số chỗ đã giữ cộng số
  phòng nó xin không vượt quá số phòng của loại đó. Một ngày vượt là đủ để từ chối cả request.
- Khoảng ngày là nửa mở: `[check_in, check_out)`. Ngày trả phòng không tính là một đêm, nên một
  request trả phòng ngày 12 và một request nhận phòng ngày 12 không tranh nhau chỗ nào — khách sạn
  bán được cả hai đêm, kể cả khi loại phòng đó chỉ có đúng một phòng.

**Hold expiry**

- Hold hết hiệu lực sau 24 giờ kể từ lúc gửi, hoặc vào ngày check-in, tuỳ cái nào đến trước.
  Hệ quả được chấp nhận: request gửi chiều thứ 6 có thể hết hạn trước khi admin quay lại làm việc
  sáng thứ 2. Đây là điều đã biết và đã chấp nhận, không phải sơ suất.

**Amount**

- Tổng tiền chốt khi request được ghi nhận, từ giá mỗi đêm của loại phòng, số đêm và số phòng.
  Không bao giờ tính lại, nên giá đổi về sau không làm đổi một request đã tạo.

**All or nothing**

- Một request được ghi nhận trọn vẹn hoặc không được ghi nhận gì. Thiếu chỗ ở một ngày bất kỳ là từ
  chối cả request: không ghi nhận một phần số phòng, cũng không ghi nhận một phần khoảng ngày.

**Event log**

- Mỗi lần đổi trạng thái đều ghi lại ai đổi, lúc nào, và lý do nếu có nêu. Sổ này chỉ ghi thêm:
  không bao giờ sửa hay xoá dòng đã ghi.

### 5.4 Constraints from the non-functional requirements

- **NFR-005** — chính database từ chối khi số chỗ đã giữ của một loại phòng vượt quá số phòng của
  loại đó, trong bất kỳ ngày nào của khoảng yêu cầu. Một phép kiểm trong code ứng dụng là không đủ:
  nhiều request tới cùng một khoảnh khắc không bao giờ được phép cộng lại thành nhiều hơn số phòng
  khách sạn có. Phép kiểm xét **từng ngày**; đếm gộp cả kỳ là sai.
- **NFR-004** — endpoint đòi token hợp lệ và từ chối phía gọi không có token; token của một role
  không được phép tạo request cũng bị từ chối.
- **NFR-001, NFR-002** — không áp dụng. Hai cái đó chi phối chức năng tìm kiếm và danh sách
  (F-006, F-009), không chi phối chức năng này.

## 6. Acceptance Criteria

| # | Criterion | Traces to |
| --- | --- | --- |
| AC-1 | User đã đăng nhập xin một số phòng của một loại phòng còn đủ chỗ, cho một khoảng ngày hợp lệ, thì có một request được ghi nhận ở `pending`, số chỗ bị giữ, và được hiển thị loại phòng, số phòng, khoảng ngày, tổng tiền cùng thời điểm hold hết hiệu lực. | 3.1 |
| AC-2 | Một request xin năm phòng của một loại phòng còn đủ năm chỗ suốt khoảng ngày thì giữ được cả năm dưới đúng một request đó. | 3.1 · 5.1 |
| AC-3 | Một request mà chỉ cần một ngày trong khoảng không đủ chỗ thì không ghi nhận gì và không giữ gì — kể cả khi những ngày còn lại vẫn còn chỗ. | 3.3 E-1 |
| AC-4 | Một request có ngày check-out không rơi sau ngày check-in thì không ghi nhận gì. | 3.3 E-2 |
| AC-5 | Nhiều request cho cùng một loại phòng và cùng một khoảng ngày, gửi vào cùng một khoảnh khắc, không bao giờ làm tổng số chỗ đã giữ vượt quá số phòng của loại đó; phần còn lại được báo đã hết chỗ. | 3.3 E-3 · NFR-005 |
| AC-6 | Khi thời điểm hết hạn hold của một request `pending` đã đi qua, request đó không còn `pending`, số chỗ của nó trả lại cho người khác, và admin không duyệt được nữa. | 3.3 E-4 · 5.3 |
| AC-7 | Một request nêu loại phòng có số phòng bằng 0 thì không ghi nhận gì. | 3.3 E-5 |
| AC-8 | Một request có ngày check-in rơi trong vòng 24 giờ thì hold hết hiệu lực vào ngày check-in, không phải 24 giờ sau khi gửi. | 3.2 A-1 · 5.3 |
| AC-9 | Phía gọi không có phiên hợp lệ bị từ chối, không request nào được ghi nhận, và không lộ ra gì về loại phòng hay các request đang có. | 5.2 · NFR-004 |
| AC-10 | Request được ghi nhận thuộc về user đang đăng nhập; phía gọi không thể tạo request dưới tên người khác. | 5.2 |
| AC-11 | Đổi giá mỗi đêm của một loại phòng sau khi request đã được ghi nhận thì tổng tiền của request đó không đổi. | 5.3 Amount |
| AC-12 | Với một loại phòng chỉ có **đúng một** phòng, một request trả phòng vào một ngày và một request nhận phòng đúng ngày đó đều được chấp nhận. | 5.3 Capacity |
| AC-13 | Một request nêu sáu phòng, hoặc xin 31 đêm, hoặc check-in xa hơn 12 tháng, đều bị từ chối. | 5.1 |
| AC-14 | Duyệt, từ chối, huỷ, hoặc để một request hết hạn đều ghi thêm một dòng log nêu ai đã đổi và lúc nào. | 5.3 Event log |
| AC-15 | Một loại phòng có **ba** phòng. Một request đang giữ **hai** phòng cho 9→11. Một request xin **hai** phòng cho 10→12 thì bị từ chối, vì ngày 10 cần bốn chỗ mà chỉ có ba — dù ngày 11 còn trống. | 5.3 Capacity · NFR-005 |
| AC-16 | ROLE-003 gọi endpoint này bằng token hợp lệ của chính mình vẫn bị từ chối, và không request nào được ghi nhận. | 5.2 · NFR-004 |

## 7. Related Documents

| Document | Relation |
| --- | --- |
| [Function list](../function-list.md) | Dòng gốc mà chức năng này được đào sâu từ đó |

Phạm vi giáp ranh với F-006 (tìm loại phòng còn chỗ), F-009 (lịch sử của chính user), F-010 (huỷ),
F-011 (quyết định của admin) và F-012 (thanh toán). Chưa cái nào được phân tích nên không đặt link
ở đây.

## 8. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-19 | ba-analyze-requirement skill | Bản đầu tiên. Viết bằng tiếng Anh thay vì tiếng Nhật như skill quy định, theo quyết định của dự án. |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột, mã tham chiếu và tên trạng thái giữ tiếng Anh |
| 2026-09-19 | — | **Đơn vị được bán đổi từ phòng cụ thể sang loại phòng.** Lý do: sheet gốc chỉ viết "phòng", không hề nói "phòng cụ thể" — cách đọc hẹp đó là của dự án, và nó khiến thuộc tính phòng bị lặp trên mọi phòng giống nhau, đồng thời buộc request nhiều phòng phải có bảng con chép lại trạng thái. Hệ thống lại không có nhận phòng hay xếp phòng, nên không có ai dùng tới danh sách phòng vật lý. Sửa §1 Summary, §2, §3 (trigger, preconditions, basic flow, E-1/E-3/E-4/E-5), §4, §5.1, §5.3 (`Overlap` → `Capacity`, Holding rooms, Amount, All or nothing), §5.4; §6 sửa AC-1/2/3/5/6/7/11/12 và thêm AC-15. Giữ nguyên: bảng States, Legal transitions, Hold expiry, Event log, §5.2, và AC-4/8/9/10/13/14 |
| 2026-09-19 | — | Chạy bù 4 cổng duyệt §3–§6 mà lượt sửa trước đã bỏ qua. Kết quả: bỏ câu thừa ở §3.1 bước 1; đổi `Arrival date`/`Departure date` → `Check-in date`/`Check-out date` và `Room hold` từ `Persisted` → `Derived` ở §4; §5.2 đổi "phòng" → "loại phòng"; §5.4 chép đủ vế "403 khi sai quyền" của NFR-004; §6 sửa AC-9 và **thêm AC-16** cho quy tắc §5.2 "chỉ ROLE-002 tạo được request" — quy tắc này trước đó không có acceptance criterion nào |
| 2026-09-23 | — | §4, §5.1: ngày check-in sớm nhất đổi từ **hôm nay** sang **ngày mai**. Lý do: hold hết hạn lúc 00:00 ngày check-in (§5.3 Hold expiry), nên request check-in hôm nay có `expiresAt` nằm trong quá khứ ngay lúc tạo — bị cron expire trong vòng một phút, admin không kịp duyệt. AC-13 giữ nguyên; check-in hôm nay giờ bị từ chối như các lỗi validation khác |
| 2026-09-24 | — | AC-6, §5.3 Hold expiry: chốt rằng việc chuyển `pending` → `expired` là của cron (mỗi 30 phút) và có thể trễ. Trong khoảng trễ, request vẫn `pending`: user huỷ được (F-010), và khi cron chạy sau thì không còn gì để ghi hết hạn. Số chỗ vẫn được trả ngay khi qua thời điểm hết hạn, vì kiểm tra chỗ trống bỏ qua hold quá hạn. Duyệt (F-011) vẫn phải từ chối hold đã quá hạn |
