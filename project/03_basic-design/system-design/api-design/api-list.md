# API List

> Related: [Function list](../../../02_requirements/function-list.md) ·
> [Role list](../../../02_requirements/role-list.md) · [Database design](../database-design.md)
>
> REST / JSON. Path, tên field, giá trị enum giữ tiếng Anh; diễn giải bằng tiếng Việt.
> Bản OpenAPI chính thức sẽ sinh từ code (Zod + `@nestjs/swagger`); file này là thiết kế đi trước.

> **Status: DRAFT — thiết kế dự kiến, chưa có code xác nhận.** Các quyết định ở đây là INFERRED từ
> requirement. Khi implement thấy không hợp lý: nêu mâu thuẫn, quyết xong ghi vào `## Deviations` rồi sửa phần chính.

## 1. Conventions

| Item                                    | Value                                                                                                                    |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Base path                               | `/api`, không version                                                                                                    |
| Auth                                    | `Authorization: Bearer <jwt>` · thiếu → 401 · sai role → 403                                                             |
| JSON keys                               | camelCase (DB là snake_case)                                                                                             |
| Ngày / thời điểm                        | `YYYY-MM-DD` cho `*Date`; ISO 8601 UTC cho `*At`                                                                         |
| Tiền                                    | số nguyên VND                                                                                                            |
| ID                                      | số nguyên                                                                                                                |
| Pagination                              | `?page=1&perPage=20` (tối đa 100) → `{ "data": [...], "meta": { "total", "page", "perPage" } }`                          |
| Lọc list                                | Tên field (`status`, `roomTypeId`…) = khớp đúng giá trị. `q` = tìm tự do, chứa chuỗi, không phân biệt hoa thường, trên nhiều field (liệt kê ở từng API) |
| Object đơn                              | Trả thẳng, không bọc                                                                                                     |
| Không có gì để trả                      | 204, body rỗng (logout, đổi mật khẩu, delete)                                                                            |
| `password`                              | Tối thiểu 8, tối đa **72 byte** — giới hạn thật của bcrypt, không phải 72 ký tự (tiếng Việt có dấu 3 byte/ký tự)         |
| `fullName`                              | Chỉ chữ mọi hệ chữ + dấu tổ hợp + khoảng trắng + `' ’ . -`                                                               |
| Tạo sub-resource (approval, rejection…) | `POST` → 201, body = bản ghi vừa tạo                                                                                     |
| Lỗi                                     | Shape mặc định của NestJS: `{ "statusCode", "message", "error" }`; validation `message` là mảng `"<path>: <msg>"`        |
| Mã lỗi                                  | 400 validation · 401 chưa đăng nhập · 403 sai quyền · 404 không có / không phải của mình · 409 trạng thái không cho phép |
| Field vắng mặt                          | `null` trong JSON (DB không có null; API có)                                                                             |
| Resource theo role                      | Route chỉ admin nằm dưới `/admin/...`, controller riêng, `@Roles('admin')` cả class. Route của user/public giữ path gốc, list của user chỉ trả của mình. Mỗi route một shape, không field tuỳ role |
| Transition                              | Danh từ sub-resource, khớp bảng outcome: `/approval`, `/rejection`, `/cancellation`, `/deactivation`, `/reactivation`    |

## 2. Shapes

```jsonc
// User
{ "id": 7, "email": "an@example.com", "fullName": "Nguyễn Văn An", "role": "user",
  "status": "active", "createdAt": "2026-09-21T07:41:00Z" }

// RoomType   (công khai: không có số phòng của khách sạn)
{ "id": 3, "name": "Deluxe Sea View", "description": "…", "pricePerNight": 1500000,
  "amenities": ["wifi", "tv", "balcony", "bed_king", "view_sea"], "createdAt": "…", "updatedAt": "…" }

// AdminRoomType = RoomType + "totalRooms": 3   (chỉ route /admin/room-types)

// BookingRequest   (bản `/admin`: thêm "user": { id, email, fullName })
{ "id": 42, "roomType": { "id": 3, "name": "Deluxe Sea View" }, "roomsRequested": 2,
  "checkInDate": "2026-10-10", "checkOutDate": "2026-10-12", "nights": 2, "totalAmount": 6000000,
  "status": "pending", "expiresAt": "2026-09-22T07:41:00Z", "rejectionReason": null, "createdAt": "…" }

// Review
{ "id": 5, "bookingRequestId": 42, "roomTypeId": 3, "rating": 5, "comment": "…",
  "status": "pending", "author": { "fullName": "Nguyễn Văn An" }, "createdAt": "…" }

// PaymentSession   (link trang thanh toán của Stripe; khách trả ở đó, không qua API)
{ "url": "https://checkout.stripe.com/c/pay/cs_test_…", "expiresAt": "2026-09-26T07:41:00Z" }

// Outcome
{ "bookingRequestId": 42, "adminUserId": 1, "createdAt": "…" }             // rejection thêm "reason"
{ "bookingRequestId": 42, "createdAt": "…" }                                // cancellation
{ "reviewId": 5, "adminUserId": 1, "createdAt": "…" }
{ "userId": 7, "adminUserId": 1, "createdAt": "…" }

// Auth
{ "accessToken": "eyJ…", "user": User }

// Statistics
{ "groupBy": "month", "from": "2026-01-01", "to": "2026-06-30",
  "data": [ { "key": "2026-01", "total": 38,
              "byStatus": { "approved": 25, "rejected": 6, "cancelled": 4, "expired": 3, "pending": 0 } } ] }
{ "groupBy": "month", "from": "…", "to": "…", "currency": "VND", "totalRevenue": 412500000,
  "data": [ { "key": "2026-01", "revenue": 62000000, "payments": 21 } ] }
// groupBy = roomType → "key": { "id": 3, "name": "…" }
```

## 3. API List

| No  | F-ID                | Method | Path                                 | Role        | Request                                                              | Response               | Note                                                                                     |
| --- | ------------------- | ------ | ------------------------------------ | ----------- | -------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| 1   | F-001               | POST   | `/auth/register`                     | Visitor     | body: email, password, fullName                                      | User (unverified)      | 409 email trùng; phát job mail kích hoạt, viết theo header `Accept-Language` (`vi` / `en`, mặc định `vi`) |
| 2   | F-016               | GET    | `/auth/activate`                     | Visitor     | query: token                                                         | User (active)          | GET vì là link trong mail; 404 / 409 hết hạn. Token 32 byte ngẫu nhiên, lưu sha256 hex ở `token_hash`, TTL 24h; link `{APP_BASE_URL}/api/auth/activate?token=` (không có frontend nên trỏ thẳng vào API) |
| 3   | F-002               | POST   | `/auth/login`                        | Visitor     | body: email, password                                                | Auth                   | 401 sai; 403 chưa kích hoạt / bị khoá                                                    |
| 4   | F-002               | POST   | `/auth/logout`                       | User, Admin | —                                                                    | —                      | Stateless; client bỏ token                                                               |
| 5   | F-003               | GET    | `/me`                                | User, Admin | —                                                                    | User                   |                                                                                          |
| 6   | F-003               | PATCH  | `/me`                                | User, Admin | body: fullName                                                       | User                   |                                                                                          |
| 7   | F-003               | PUT    | `/me/password`                       | User, Admin | body: currentPassword, newPassword                                   | —                      | 401 mật khẩu cũ sai                                                                      |
| 8   | F-006               | GET    | `/room-types`                        | Public      | query: checkInDate, checkOutDate (bắt buộc), rooms (1–5, mặc định 1), amenities[], page, perPage | List\<RoomType\>       | Thiếu ngày → 400; ngày cùng luật với dòng 14 (check-in từ ngày mai, ≤ 12 tháng, 1–30 đêm), `rooms` cùng giới hạn với `roomsRequested`. Chỉ trả loại còn ≥ `rooms` phòng trống ở mọi đêm; `meta.total` chỉ đếm các loại này. Item là RoomType thường, không có số phòng trống |
| 9   | F-005               | GET    | `/room-types/:id`                    | Public      | —                                                                    | RoomType               |                                                                                          |
| 10  | F-013               | GET    | `/room-types/:id/reviews`            | Public      | query: page, perPage                                                 | List\<Review\>         | Chỉ `approved`                                                                           |
| 11  | F-007               | POST   | `/admin/room-types`                  | Admin       | body: name, description, pricePerNight, totalRooms, amenities[]      | AdminRoomType          | 409 name trùng                                                                           |
| 12  | F-007               | PATCH  | `/admin/room-types/:id`              | Admin       | body: các field trên, tuỳ chọn                                       | AdminRoomType          | `amenities` gửi = thay toàn bộ                                                           |
| 13  | F-007               | DELETE | `/admin/room-types/:id`              | Admin       | —                                                                    | —                      | 409 khi đã có request (FK)                                                               |
| 14  | F-008               | POST   | `/booking-requests`                  | User        | body: roomTypeId, roomsRequested, checkInDate, checkOutDate          | BookingRequest         | Check-in sớm nhất là ngày mai. Admin → 403; `roomTypeId` không có → 404; 409 `Room type is not bookable` khi `totalRooms = 0`, 409 `Not enough rooms on <ngày>, …` liệt kê mọi đêm thiếu |
| 15  | F-009               | GET    | `/booking-requests`                  | User        | query: page, perPage, status, roomTypeId                             | List\<BookingRequest\> | Chỉ của mình (admin → 403); `createdAt` giảm dần. `status` là giá trị trong DB: hold quá hạn vẫn `pending` tới lượt cron kế tiếp |
| 16  | F-009               | GET    | `/booking-requests/:id`              | User        | —                                                                    | BookingRequest         | 404 nếu của user khác — không lộ là có tồn tại. `rejectionReason` chưa trả — hoãn lại, không làm cùng F-011 |
| 17  | F-010               | POST   | `/booking-requests/:id/cancellation` | User (chủ)  | —                                                                    | Outcome                | Admin → 403; 404 nếu không có hoặc của user khác; 409 `Booking request is not pending` khi `status` không còn `pending`. Hết hạn là việc của cron: hold đã qua `expiresAt` mà cron chưa quét vẫn `pending`, huỷ được |
| 18  | F-011               | POST   | `/admin/booking-requests/:id/approval` | Admin       | —                                                                    | Outcome                | Guest → 403; 404 nếu không có; 409 `Booking request is not pending`; 409 `Booking request has expired` khi còn `pending` nhưng đã qua `expiresAt`. Không kiểm tra lại chỗ trống: hold `pending` còn hạn đã được tính. Sau commit → job mail (F-015) |
| 19  | F-011               | POST   | `/admin/booking-requests/:id/rejection` | Admin       | body: reason                                                         | Outcome                | `reason` trim, 1–500 ký tự, rỗng → 400; 403/404/409 `not pending` như dòng 18, nhưng không kiểm tra `expiresAt`: hold quá hạn đã nhả phòng, từ chối không lấy gì của ai. Sau commit → job mail kèm lý do (F-015) |
| 20  | F-012               | POST   | `/payment-sessions`                  | User (chủ)  | body: bookingRequestId                                               | PaymentSession         | 201, cả khi trả lại link còn mở. 404 không có / không phải của mình; 409 chưa approved, đã trả, link cũ đã hết hạn nhưng Stripe chưa báo (thử lại sau), hoặc hai request cùng lúc; 502 Stripe lỗi. Chỉ nhận thẻ, VND |
| 21  | F-013               | POST   | `/booking-requests/:id/review`       | User (chủ)  | body: rating, comment                                                | Review (pending)       | 409 chưa approved / chưa qua checkOutDate / đã có review                                 |
| 22  | F-014               | GET    | `/admin/reviews`                     | Admin       | query: status (mặc định pending), page, perPage                      | List\<Review\>         |                                                                                          |
| 23  | F-014               | POST   | `/admin/reviews/:id/approval`        | Admin       | —                                                                    | Outcome                | 409 không còn pending                                                                    |
| 24  | F-014               | POST   | `/admin/reviews/:id/rejection`       | Admin       | —                                                                    | Outcome                | 409                                                                                      |
| 25  | F-004               | GET    | `/admin/users`                       | Admin       | query: page, perPage, status, role, q                                | List\<User\>           | `q` tìm theo email / tên                                                                 |
| 26  | F-004               | GET    | `/admin/users/:id`                   | Admin       | —                                                                    | User                   |                                                                                          |
| 27  | F-004               | POST   | `/admin/users/:id/deactivation`      | Admin       | —                                                                    | Outcome                | 409 không active; 409 tự khoá mình                                                       |
| 28  | F-004               | POST   | `/admin/users/:id/reactivation`      | Admin       | —                                                                    | Outcome                | 409 không deactivated                                                                    |
| 29  | F-018               | GET    | `/admin/statistics/booking-requests` | Admin       | query: groupBy (month, quarter, roomType), from, to                  | Statistics             | Theo `createdAt`                                                                         |
| 30  | F-019               | GET    | `/admin/statistics/revenue`          | Admin       | query: from, to, roomTypeId, groupBy (month, roomType)               | Statistics             | Theo `payments.paid_at`                                                                  |
| 31  | F-011               | GET    | `/admin/booking-requests`            | Admin       | query: page, perPage, status, roomTypeId, userId                     | List\<BookingRequest\> | Tất cả, kèm `user`; `createdAt` giảm dần                                                  |
| 32  | F-011               | GET    | `/admin/booking-requests/:id`        | Admin       | —                                                                    | BookingRequest         | Kèm `user`                                                                               |
| 33  | F-005, F-017        | GET    | `/admin/room-types`                  | Admin       | query: page, perPage, amenities[], format                            | List\<AdminRoomType\>  | Mọi loại phòng, không cần ngày, kể cả loại đã ngừng bán; `format=xlsx` → file (F-017)    |
| 34  | F-012               | POST   | `/payment-sessions/stripe-webhook`   | Stripe      | Event đã ký (header `Stripe-Signature`, raw body)                    | 204                    | Public, không có trong `/api/docs`. Chữ ký sai / cũ → 400. `checkout.session.completed` → ghi `payments`; `checkout.session.expired` → đóng session; event khác bỏ qua. Lỗi bất ngờ → 5xx để Stripe gửi lại |

## 4. Triggers (không phải endpoint)

| F-ID      | Trigger                                      | Việc                                                                                                                  |
| --------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F-015     | Sau commit approval / rejection / expiration | Một mail vào hàng đợi `mail` (BullMQ) → mail cho user kèm tóm tắt booking, rejection kèm lý do. Viết bằng tiếng Việt (ngôn ngữ mặc định): không có request của khách để lấy ngôn ngữ |
| F-016     | Sau register                                 | Một mail vào hàng đợi `mail` → mail kèm link `/auth/activate?token=`, ngôn ngữ lấy từ request đăng ký |
| F-008 E-4 | Cron mỗi 30 phút                             | `booking_requests` `pending` có `expiresAt < now()` → INSERT `booking_request_expirations` + UPDATE status → job mail. Kiểm tra chỗ trống đã bỏ qua hold quá hạn ngay lập tức, nên cron chỉ đồng bộ `status`; duyệt (F-011) phải tự kiểm tra `expiresAt`; từ chối và huỷ thì không |
| F-020     | Cron 23:59 ngày cuối tháng                   | Tổng hợp doanh thu tháng (cùng service với No 30) → mail cho mọi admin                                                |

## 5. Open Items

| #   | Item                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------- |
| 1   | ~~`POST /auth/register` trả User hay 201 rỗng?~~ **Đã chốt 2026-09-22**: trả User (`status: unverified`) |
| 2   | Có cần `GET /booking-requests/:id/timeline` gộp 4 outcome? Hiện `status` + `rejectionReason` đủ cho F-009 |
| 3   | Rate limit `/auth/*` (`@nestjs/throttler`) — không phải must, thêm nếu còn thời gian                      |
| 4   | Khoá user (No 27) thì request `pending` của họ ra sao? **Đã chốt 2026-09-23**: không đụng tới — admin vẫn duyệt/từ chối, hoặc để tự hết hạn |
| 5   | BookingRequest có cần `paidAt` (đã trả lúc nào) không? Để lại, làm cùng list / detail admin (dòng 31–32). Mail xác nhận thanh toán cũng chưa làm |

## 6. Deviations

> Mỗi lần code làm khác thiết kế: một dòng. Rỗng = tài liệu còn đúng với code.

| Date | What changed | Why |
| --- | --- | --- |
| 2026-09-24 | §4: không có job `booking-request.notify` / `user.activation` riêng; mọi mail đi chung một hàng đợi `mail` của `MailerQueueModule` | Module mailer đã có sẵn queue và worker, job chỉ cần mang mail đã dựng. Tách job theo loại mail sẽ phải tự viết processor mà không được thêm gì |
| 2026-09-24 | `RoomType` công khai (dòng 8–9) bỏ `totalRooms`; route admin (dòng 11–12, 33) trả `AdminRoomType` có `totalRooms` | Số phòng là tồn kho nội bộ của khách sạn: khách không cần để quyết định đặt (tìm kiếm đã lọc theo `rooms`), dễ bị đọc nhầm thành số phòng còn trống, và lộ quy mô khách sạn cho bất kỳ ai |
| 2026-09-24 | Dòng 8 chỉ còn là tìm kiếm (F-006): `checkInDate`, `checkOutDate` bắt buộc, thêm `rooms`; bỏ `availableRooms` khỏi RoomType. Không còn danh sách loại phòng không kèm ngày; F-005 chỉ còn phần chi tiết (dòng 9) | Người dùng xem loại phòng là để chuẩn bị đặt, nên luôn có kỳ lưu trú; một danh sách không ngày không trả lời được câu "còn phòng không". Server tự so số phòng trống với `rooms`, nên client không phải tự so với `availableRooms`: luật "đủ phòng" chỉ nằm một chỗ, giống lúc đặt. Danh sách không ngày chuyển sang admin (F-005, dòng 33); chi tiết (dòng 9) vẫn công khai |
| 2026-09-24 | Route chỉ admin chuyển xuống `/admin/...` (dòng 11–13, 18–19, 22–30); dòng 15–16 chỉ còn phần của user, phần admin tách thành dòng 31–32; export Excel (F-017) tách khỏi dòng 8 thành dòng 33 | Mỗi route một shape, service không rẽ nhánh theo role, một guard cho mỗi controller admin |
| 2026-09-25 | Dòng 20 `PUT /booking-requests/:id/payment` (trả Payment) thành `POST /payment-sessions` với `bookingRequestId` trong body, trả link Stripe Checkout; thêm dòng 34 cho webhook của Stripe | Thanh toán thật đi qua trang của Stripe nên API chỉ mở link, còn việc ghi nhận tiền đến từ webhook có chữ ký. Mở link không phải transition của booking (`status` không đổi) mà tạo ra resource mới `payment_sessions`, nên nó là resource riêng thay vì sub-resource `/booking-requests/:id/...` |
| 2026-09-25 | Dòng 20 luôn trả 201, kể cả khi trả lại link còn mở | Link mới hay cũ là chuyện của server; client chỉ cần một `url` còn dùng được |
