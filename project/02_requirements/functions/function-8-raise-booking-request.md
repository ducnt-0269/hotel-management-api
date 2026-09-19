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
| Summary | User đã đăng nhập xin một hoặc nhiều phòng cụ thể cho một khoảng ngày; request được ghi nhận ở trạng thái chờ admin quyết, và giữ các phòng đó cho tới khi có quyết định hoặc hết hạn giữ. |
| Priority | must |
| Target roles | ROLE-002 |
| Approver | |
| Approval date | |

## 2. Background & Purpose

Chức năng này giải vấn đề 1 trong system-overview §2 — booking request nhận qua điện thoại rồi ghi
vào sổ giấy, nên hai nhân viên có thể nhận hai request cho cùng một phòng cùng khoảng ngày, và khách
chỉ phát hiện ra lúc tới nơi. Đây cũng chính là chỗ mục tiêu 2, "từ chối booking bị overlap ngay tại
thời điểm ghi nhận request", được thực hiện thật; mọi bước sau của vòng đời booking đều mặc định
rằng request đã đúng từ lúc được nhận.

Không có nó thì danh mục phòng dẫn tới ngõ cụt: F-005 và F-006 cho khách xem phòng và tìm ngày trống,
nhưng không có gì biến cái đó thành một chỗ giữ, và khách sạn quay lại với điện thoại cùng cuốn sổ đã
gây ra vấn đề.

Coi là thành công khi một request bị trùng bị từ chối ngay lúc ghi nhận chứ không phải lúc khách tới
nhận phòng, và khi hai request gửi cùng một khoảnh khắc cho cùng phòng cùng ngày chỉ tạo ra đúng một
chỗ giữ.

## 3. Use Case & Business Flow

| Item | Value |
| --- | --- |
| Actor | ROLE-002 |
| Trigger | User gửi một request nêu một hoặc nhiều phòng và một khoảng lưu trú |
| Preconditions | User đã đăng nhập; mọi phòng được nêu đều tồn tại và đang on sale |

### 3.1 Basic flow

1. ROLE-002 gửi request nêu một hoặc nhiều phòng, một ngày check-in và một ngày check-out.
   Mọi phòng trong cùng một request dùng chung một khoảng ngày.
2. Hệ thống kiểm tra ngày check-out có rơi sau ngày check-in không.
3. Hệ thống kiểm tra từng phòng được nêu có trống suốt khoảng đó không — tức là không có request nào
   đang chờ quyết định, và không có booking đã duyệt nào, đang giữ phòng đó.
4. Hệ thống ghi nhận request ở trạng thái chờ admin quyết, và đặt hold lên mọi phòng được nêu trong
   khoảng ngày đã xin.
5. Hệ thống ấn định thời điểm hold hết hiệu lực: 24 giờ sau khi gửi, hoặc ngày check-in, tuỳ cái nào
   đến trước.
6. User được hiển thị request vừa ghi nhận — các phòng, khoảng ngày, trạng thái, và thời điểm hold
   hết hiệu lực.

### 3.2 Alternate flows

**A-1: Kỳ lưu trú bắt đầu trong vòng 24 giờ**

Hold hết hiệu lực vào ngày check-in thay vì 24 giờ sau khi gửi, để request không bao giờ sống lâu hơn
kỳ lưu trú mà chính nó xin.

### 3.3 Exception flows

**E-1: Một trong các phòng đã bị giữ ở một phần của khoảng ngày**

1. Hệ thống phát hiện trùng.
2. Không ghi nhận gì và không giữ phòng nào — kể cả những phòng đang trống. User được cho biết phòng
   nào bị trùng. Request được hoặc mất nguyên khối.

**E-2: Ngày check-out không rơi sau ngày check-in**

1. Hệ thống từ chối request trước khi kiểm tra bất kỳ phòng nào.
2. Không ghi nhận gì; user được cho biết khoảng ngày không hợp lệ.

**E-3: Hai user gửi request cho cùng phòng cùng khoảng ngày vào cùng một khoảnh khắc**

1. Đúng một request được ghi nhận.
2. User còn lại được cho biết phòng đã có người, và không giữ lại gì từ request của họ.

**E-4: Admin không quyết định trước khi hold hết hiệu lực**

1. Request thôi ở trạng thái chờ quyết định và các phòng của nó được trả lại cho người khác.
2. Admin không còn duyệt được nữa; user nhìn thấy request đã hết hạn.

**E-5: Một trong các phòng được nêu không on sale**

1. Hệ thống từ chối request trước khi kiểm tra bất kỳ khoảng ngày nào.
2. Không ghi nhận gì và không giữ phòng nào. User được cho biết phòng nào không đặt được. Giống E-1,
   request được hoặc mất nguyên khối.

## 4. Input / Output

| Item | Kind | Content & constraints |
| --- | --- | --- |
| Room selection | Input | Bắt buộc. Từ 1 đến 5 phòng. Mỗi phòng phải tồn tại và đang on sale. Không phòng nào được nêu hai lần trong một request. |
| Arrival date | Input | Bắt buộc. Một ngày lịch, không sớm hơn hôm nay và không xa quá 12 tháng. |
| Departure date | Input | Bắt buộc. Một ngày lịch. Phải rơi sau ngày check-in, và kỳ lưu trú không quá 30 đêm. |
| Requesting user | Input (derived) | Lấy từ phiên đăng nhập, không bao giờ nhận từ phía gọi. Chỉ ROLE-002. |
| Request reference | Output | Định danh request vừa ghi nhận để user tìm lại được trong lịch sử của mình (F-009). |
| Request state | Output | Khi thành công: đang chờ admin quyết. |
| Rooms held | Output | Mọi phòng được nêu, mỗi phòng kèm khoảng ngày đang bị giữ. |
| Hold expiry | Output | Thời điểm hold hết hiệu lực: 24 giờ sau khi gửi, hoặc ngày check-in, tuỳ cái nào đến trước. |
| Total amount | Output, persisted | Chốt tại thời điểm ghi nhận request, từ giá mỗi đêm của từng phòng và số đêm. Không bao giờ tính lại, nên giá phòng đổi về sau không làm đổi một request đã tạo. |
| Clash report | Output (failure) | Nêu tên phòng đã bị giữ. Không ghi nhận gì và không giữ phòng nào — xem §3 E-1. |
| Booking request | Persisted | Request cùng user, khoảng ngày, trạng thái, tổng tiền và thời điểm hết hạn hold. |
| Room hold | Persisted | Một hold cho mỗi phòng được nêu, mang theo khoảng ngày, để một request cạnh tranh bị từ chối được (NFR-005). |
| External data | — | Không có. Chức năng này không trao đổi gì với hệ thống ngoài. |

<!-- Cách bố trí trường trên màn hình nằm ngoài phạm vi — đó là việc của 04_screen-design/. -->

## 5. Business Rules & Constraints

### 5.1 Validation

- Một request nêu từ 1 đến 5 phòng. Mỗi phòng phải tồn tại và đang on sale, và không phòng nào được
  nêu hai lần.
- Ngày check-in không được nằm trong quá khứ, cũng không xa quá 12 tháng.
- Ngày check-out phải rơi sau ngày check-in, và kỳ lưu trú không quá 30 đêm.
- Mọi phép kiểm chạy ở phía server khi request được gửi. Request trượt bất kỳ phép kiểm nào đều bị
  từ chối nguyên khối: không ghi nhận gì và không giữ phòng nào.

### 5.2 Permission control

- Chỉ ROLE-002 được tạo request. ROLE-001 chưa đăng nhập nên không tạo được; ROLE-003 quyết định trên
  các request (F-011) chứ không tạo chúng.
- User tạo request được lấy từ phiên đăng nhập. Phía gọi không thể tạo request dưới tên người khác.
- Phía gọi không có phiên hợp lệ bị coi như chưa đăng nhập và không biết được gì về phòng, hold hay
  các request đang có (NFR-004).

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

**Holding a room**

- Request ở `pending` hoặc `approved` giữ mọi phòng nó nêu, suốt khoảng ngày của nó.
- Request ở `rejected`, `cancelled` hoặc `expired` không giữ gì; phòng của nó là trống.

**Overlap**

- Khoảng ngày là nửa mở: `[arrival, departure)`. Một request trả phòng ngày 12 và một request nhận
  phòng ngày 12 không bị coi là trùng, nên phòng bán được cả hai đêm.

**Hold expiry**

- Hold hết hiệu lực sau 24 giờ kể từ lúc gửi, hoặc vào ngày check-in, tuỳ cái nào đến trước.
  Hệ quả được chấp nhận: request gửi chiều thứ 6 có thể hết hạn trước khi admin quay lại làm việc
  sáng thứ 2. Đây là điều đã biết và đã chấp nhận, không phải sơ suất.

**Amount**

- Tổng tiền chốt khi request được ghi nhận, từ giá mỗi đêm của từng phòng và số đêm. Không bao giờ
  tính lại, nên giá phòng đổi về sau không làm đổi một request đã tạo.

**All or nothing**

- Một phòng không dùng được là từ chối cả request. Những phòng đang trống cũng không bị giữ.

**Event log**

- Mỗi lần đổi trạng thái đều ghi lại ai đổi, lúc nào, và lý do nếu có nêu. Sổ này chỉ ghi thêm:
  không bao giờ sửa hay xoá dòng đã ghi.

### 5.4 Constraints from the non-functional requirements

- **NFR-005** — chính database từ chối hai hold chồng nhau trên cùng một phòng và cùng khoảng ngày.
  Một phép kiểm trong code ứng dụng là không đủ: hai request tới cùng một khoảnh khắc phải cho ra
  đúng một hold.
- **NFR-004** — endpoint đòi token hợp lệ và từ chối phía gọi không có token.
- **NFR-001, NFR-002** — không áp dụng. Hai cái đó chi phối chức năng tìm kiếm và danh sách
  (F-006, F-009), không chi phối chức năng này.

## 6. Acceptance Criteria

| # | Criterion | Traces to |
| --- | --- | --- |
| AC-1 | User đã đăng nhập xin một phòng trống cho một khoảng ngày hợp lệ thì có một request được ghi nhận ở `pending`, phòng bị giữ, và được hiển thị khoảng ngày, tổng tiền cùng thời điểm hold hết hiệu lực. | 3.1 |
| AC-2 | Một request nêu tới năm phòng đang trống thì giữ được cả năm phòng dưới đúng một request đó. | 3.1 · 5.1 |
| AC-3 | Một request nêu một phòng đã bị giữ ở bất kỳ phần nào của khoảng ngày thì không ghi nhận gì và không giữ gì — kể cả những phòng trong request đó đang trống. | 3.3 E-1 |
| AC-4 | Một request có ngày check-out không rơi sau ngày check-in thì không ghi nhận gì. | 3.3 E-2 |
| AC-5 | Hai request cho cùng một phòng và cùng một khoảng ngày, gửi vào cùng một khoảnh khắc, cho ra đúng một hold; phía còn lại được báo phòng đã có người. | 3.3 E-3 · NFR-005 |
| AC-6 | Khi thời điểm hết hạn hold của một request `pending` đã đi qua, request đó không còn `pending`, phòng của nó trống cho người khác, và admin không duyệt được nữa. | 3.3 E-4 · 5.3 |
| AC-7 | Một request nêu phòng không on sale thì không ghi nhận gì. | 3.3 E-5 |
| AC-8 | Một request có ngày check-in rơi trong vòng 24 giờ thì hold hết hiệu lực vào ngày check-in, không phải 24 giờ sau khi gửi. | 3.2 A-1 · 5.3 |
| AC-9 | Phía gọi không có phiên hợp lệ bị từ chối, không request nào được ghi nhận, và không lộ ra gì về phòng hay các request đang có. | 5.2 · NFR-004 |
| AC-10 | Request được ghi nhận thuộc về user đang đăng nhập; phía gọi không thể tạo request dưới tên người khác. | 5.2 |
| AC-11 | Đổi giá mỗi đêm của một phòng sau khi request đã được ghi nhận thì tổng tiền của request đó không đổi. | 5.3 Amount |
| AC-12 | Với cùng một phòng, một request trả phòng vào một ngày và một request nhận phòng đúng ngày đó đều được chấp nhận. | 5.3 Overlap |
| AC-13 | Một request nêu sáu phòng, hoặc xin 31 đêm, hoặc check-in xa hơn 12 tháng, đều bị từ chối. | 5.1 |
| AC-14 | Duyệt, từ chối, huỷ, hoặc để một request hết hạn đều ghi thêm một dòng log nêu ai đã đổi và lúc nào. | 5.3 Event log |

## 7. Related Documents

| Document | Relation |
| --- | --- |
| [Function list](../function-list.md) | Dòng gốc mà chức năng này được đào sâu từ đó |

Phạm vi giáp ranh với F-006 (tìm phòng trống), F-009 (lịch sử của chính user), F-010 (huỷ),
F-011 (quyết định của admin) và F-012 (thanh toán). Chưa cái nào được phân tích nên không đặt link
ở đây.

## 8. Revision History

| Date | Updated by | Content |
| --- | --- | --- |
| 2026-09-19 | ba-analyze-requirement skill | Bản đầu tiên. Viết bằng tiếng Anh thay vì tiếng Nhật như skill quy định, theo quyết định của dự án. |
| 2026-09-19 | — | Dịch phần diễn giải sang tiếng Việt; heading, tên cột, mã tham chiếu và tên trạng thái giữ tiếng Anh |
