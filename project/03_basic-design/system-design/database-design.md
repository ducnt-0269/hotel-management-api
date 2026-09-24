# Database Design

> Related: [Function list](../../02_requirements/function-list.md) ·
> [Non-functional requirements](../../02_requirements/non-function-list.md) ·
> [Glossary](../../02_requirements/glossary.md) · [API list](./api-design/api-list.md) ·
> ERD draw.io: [database-erd.drawio](./database-erd.drawio)
>
> Postgres 17 + TypeORM. Heading, tên bảng, tên cột, giá trị enum giữ tiếng Anh vì xuất hiện nguyên
> văn trong code; diễn giải bằng tiếng Việt.

> **Status: DRAFT — thiết kế dự kiến, chưa có code xác nhận.** Các quyết định ở đây là INFERRED từ
> requirement. Khi implement thấy không hợp lý: nêu mâu thuẫn, quyết xong ghi vào `## Deviations` rồi sửa phần chính.

## 1. Overview

Schema gồm **17 bảng**, chia ba nhóm theo Immutable Data Model:

| Nhóm            | Bảng                                                                                                                                                                            | Tính chất                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Resource        | `users`, `room_types`, `amenities`, `room_type_amenities`, `user_email_verification_tokens`                                                                                     | Sửa được (UPDATE)                                   |
| Long-term event | `booking_requests`, `reviews`                                                                                                                                                   | INSERT lúc tạo; sau đó chỉ cột `status` được UPDATE |
| Outcome / log   | `booking_request_{approvals, rejections, cancellations, expirations}`, `payments`, `review_{approvals, rejections}`, `user_{email_verifications, deactivations, reactivations}` | **Chỉ INSERT**, một timestamp, không cột nullable   |

Nguyên tắc bắt buộc:

- **`status` là projection.** Nó chỉ đổi khi có một dòng mới ở bảng outcome tương ứng, trong cùng
  transaction: `INSERT outcome` + `UPDATE ... SET status = <mới> WHERE id = ? AND status = <hiện tại>`,
  kiểm `rowCount = 1`, không thì rollback. Không có code path nào sửa `status` mà không INSERT outcome.
- **Không cột nullable** trong toàn schema. Thuộc tính chỉ có ở một loại sự kiện thì nằm ở bảng của
  sự kiện đó (ví dụ `reason` chỉ ở `booking_request_rejections`).
- **Enum = `varchar` + `CHECK`**, không dùng enum native của Postgres, để migration `down` chạy được (NFR-006).
- **Quy ước tên**: bảng snake_case số nhiều; `_at` = `timestamptz`, `_date` = `date`; `_id` = FK, thêm
  vai trò khi cần (`admin_user_id`); tiền = `bigint` VND.
- **Đơn vị bán là loại phòng.** Không có bảng phòng vật lý (xem `glossary.md` → Room).

## 2. ERD

```mermaid
erDiagram
    users ||--o{ booking_requests : ""
    room_types ||--o{ booking_requests : ""
    room_types ||--o{ room_type_amenities : ""
    amenities ||--o{ room_type_amenities : ""
    booking_requests ||--o| booking_request_approvals : ""
    booking_requests ||--o| booking_request_rejections : ""
    booking_requests ||--o| booking_request_cancellations : ""
    booking_requests ||--o| booking_request_expirations : ""
    booking_requests ||--o| payments : ""
    booking_requests ||--o| reviews : ""
    reviews ||--o| review_approvals : ""
    reviews ||--o| review_rejections : ""
    users ||--o| user_email_verification_tokens : ""
    users ||--o| user_email_verifications : ""
    users ||--o{ user_deactivations : ""
    users ||--o{ user_reactivations : ""
    users ||--o{ booking_request_approvals : "admin"
    users ||--o{ booking_request_rejections : "admin"
    users ||--o{ review_approvals : "admin"
    users ||--o{ review_rejections : "admin"
    users ||--o{ user_deactivations : "admin"
    users ||--o{ user_reactivations : "admin"
```

Bản đầy đủ cột: `database-erd.drawio` cùng thư mục.

## 3. Table Definitions

Mọi bảng: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, mọi cột `NOT NULL`, `created_at timestamptz DEFAULT now()`. Chỉ ghi các cột còn lại.

### 3.1 Resource

**users**

| Column        | Type         | Constraint                                                          | Note                                                                                    |
| ------------- | ------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| email         | varchar(255) | unique index trên `lower(email)`                                    |                                                                                         |
| password_hash | varchar(255) |                                                                     | bcrypt (NFR-003)                                                                        |
| full_name     | varchar(100) |                                                                     |                                                                                         |
| role          | varchar(10)  | CHECK IN ('user','admin')                                           | Visitor không phải giá trị DB (role-list §1)                                            |
| status        | varchar(12)  | CHECK IN ('unverified','active','deactivated') DEFAULT 'unverified' | Projection của `user_email_verifications` / `user_deactivations` / `user_reactivations` |
| updated_at    | timestamptz  | DEFAULT now()                                                       |                                                                                         |

**room_types**

| Column          | Type         | Constraint    | Note                  |
| --------------- | ------------ | ------------- | --------------------- |
| name            | varchar(100) | UNIQUE        |                       |
| description     | text         |               |                       |
| price_per_night | bigint       |               | VND; `> 0` kiểm ở app |
| total_rooms     | integer      | CHECK >= 0    | 0 = ngừng bán         |
| updated_at      | timestamptz  | DEFAULT now() |                       |

**amenities**

| Column | Type        | Constraint | Note                                                                                                                                                         |
| ------ | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| code   | varchar(20) | UNIQUE     | Seed 14 dòng: air_conditioning, wifi, tv, minibar, balcony, bathtub, bed_single, bed_double, bed_twin, bed_king, view_sea, view_city, view_garden, view_none |

**room_type_amenities**

| Column       | Type   | Constraint                        | Note                                                              |
| ------------ | ------ | --------------------------------- | ----------------------------------------------------------------- |
| room_type_id | bigint | FK → room_types ON DELETE CASCADE |                                                                   |
| amenity_id   | bigint | FK → amenities                    |                                                                   |
|              |        | UNIQUE (room_type_id, amenity_id) | DB không ép "đúng một bed / một view" — trách nhiệm lúc nhập liệu |

**user_email_verification_tokens**

| Column     | Type        | Constraint                           | Note                                       |
| ---------- | ----------- | ------------------------------------ | ------------------------------------------ |
| user_id    | bigint      | FK → users ON DELETE CASCADE, UNIQUE | Gửi lại mail = thay dòng; xoá sau khi dùng |
| token_hash | varchar(64) |                                      |                                            |
| expires_at | timestamptz |                                      |                                            |

### 3.2 Long-term event

**booking_requests**

| Column          | Type        | Constraint                                                                         | Note                                                               |
| --------------- | ----------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| user_id         | bigint      | FK → users                                                                         |                                                                    |
| room_type_id    | bigint      | FK → room_types                                                                    |                                                                    |
| rooms_requested | integer     | CHECK > 0                                                                          | 1..5 kiểm ở app (F-008 §5.1)                                       |
| check_in_date   | date        |                                                                                    |                                                                    |
| check_out_date  | date        | CHECK (check_out_date > check_in_date)                                             | Nửa mở `[in, out)`; ≤ 30 đêm, từ ngày mai, ≤ 12 tháng kiểm ở app |
| total_amount    | bigint      |                                                                                    | VND; chốt lúc tạo, không tính lại (AC-11)                          |
| status          | varchar(10) | CHECK IN ('pending','approved','rejected','cancelled','expired') DEFAULT 'pending' | Projection của 4 bảng outcome                                      |
| expires_at      | timestamptz |                                                                                    | App tính: `min(created_at + 24h, check_in_date 00:00 Asia/Saigon)` |
| updated_at      | timestamptz | DEFAULT now()                                                                      | Cột dư có chủ ý — luôn bằng `created_at` của dòng outcome          |

**reviews**

| Column             | Type        | Constraint                                                   | Note                                                    |
| ------------------ | ----------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| booking_request_id | bigint      | FK → booking_requests, UNIQUE                                | 1 booking = 1 review; loại phòng suy từ booking (F-013) |
| rating             | smallint    | CHECK BETWEEN 1 AND 5                                        |                                                         |
| comment            | text        |                                                              |                                                         |
| status             | varchar(10) | CHECK IN ('pending','approved','rejected') DEFAULT 'pending' | Projection của `review_approvals` / `review_rejections` |
| updated_at         | timestamptz | DEFAULT now()                                                |                                                         |

### 3.3 Outcome / log

| Table                         | Columns (ngoài id, created_at)                 | Constraint                                              | Note                                                                |
| ----------------------------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------- |
| booking_request_approvals     | booking_request_id, admin_user_id              | booking_request_id UNIQUE; FK → booking_requests, users |                                                                     |
| booking_request_rejections    | booking_request_id, admin_user_id, reason text | booking_request_id UNIQUE                               | `reason` NOT NULL; không rỗng kiểm ở app                            |
| booking_request_cancellations | booking_request_id                             | UNIQUE                                                  | Không actor — luôn là `booking_requests.user_id`                    |
| booking_request_expirations   | booking_request_id                             | UNIQUE                                                  | Do cron ghi                                                         |
| payments                      | booking_request_id, amount bigint              | booking_request_id UNIQUE                               | Mock: một dòng = đã trả; doanh thu (F-019/F-020) tính trên bảng này |
| review_approvals              | review_id, admin_user_id                       | review_id UNIQUE                                        |                                                                     |
| review_rejections             | review_id, admin_user_id                       | review_id UNIQUE                                        | Sheet không bắt lý do                                               |
| user_email_verifications      | user_id                                        | UNIQUE                                                  | `users.status`: unverified → active                                 |
| user_deactivations            | user_id, admin_user_id                         | —                                                       | Không UNIQUE: khoá/mở nhiều lần. active → deactivated               |
| user_reactivations            | user_id, admin_user_id                         | —                                                       | deactivated → active                                                |

## 4. Indexes

| Index                                                                                                   | Purpose                        | Ref            |
| ------------------------------------------------------------------------------------------------------- | ------------------------------ | -------------- |
| `users (lower(email))` UNIQUE                                                                           | Đăng ký / đăng nhập            | F-001, F-002   |
| `users (status)`                                                                                        | Lọc admin, JwtStrategy         | F-004          |
| `booking_requests (user_id, created_at DESC)`                                                           | Lịch sử của user               | F-009          |
| `booking_requests (room_type_id)`                                                                       | FK                             |                |
| `booking_requests (room_type_id, check_in_date, check_out_date) WHERE status IN ('pending','approved')` | Đếm capacity theo ngày         | F-006, NFR-005 |
| `booking_requests (expires_at) WHERE status = 'pending'`                                                | Cron hết hạn hold              | F-008 E-4      |
| `booking_requests (created_at)`                                                                         | Thống kê theo tháng / quý      | F-018          |
| `reviews (status) WHERE status = 'pending'`                                                             | Hàng đợi duyệt                 | F-014          |
| `payments (created_at)`                                                                                 | Doanh thu theo kỳ              | F-019, F-020   |
| `user_deactivations (user_id)`, `user_reactivations (user_id)`                                          | Lịch sử một user               | F-004          |
| `admin_user_id` trên 6 bảng có admin                                                                    | FK                             |                |
| `*_id` UNIQUE trên mọi bảng outcome                                                                     | Tối đa một dòng, kiêm index FK |                |

## 5. State Transitions

```mermaid
stateDiagram-v2
    state "booking_requests.status" as BR {
        [*] --> pending
        pending --> approved : booking_request_approvals
        pending --> rejected : booking_request_rejections
        pending --> cancelled : booking_request_cancellations
        pending --> expired : booking_request_expirations
    }
    state "reviews.status" as RV {
        [*] --> pending_r : INSERT reviews
        pending_r --> approved_r : review_approvals
        pending_r --> rejected_r : review_rejections
    }
    state "users.status" as US {
        [*] --> unverified : register
        unverified --> active : user_email_verifications
        active --> deactivated : user_deactivations
        deactivated --> active : user_reactivations
    }
```

Giao thức chung cho mọi mũi tên (tầng service, không dùng trigger):

```sql
BEGIN;
INSERT INTO <outcome_table> (...) VALUES (...);
UPDATE <parent> SET status = '<new>' WHERE id = $1 AND status = '<expected>';
-- rowCount = 1 → COMMIT; = 0 → ROLLBACK (409: trạng thái đã đổi bởi người khác)
```

Riêng tạo booking (F-008): trong cùng transaction, khoá dòng `room_types` (`SELECT … FOR UPDATE`), đếm `SUM(rooms_requested)`
của request `pending`/`approved` **từng ngày** trong `[check_in_date, check_out_date)`, so với `total_rooms`,
rồi mới INSERT. Ràng buộc thật ở tầng DB cho NFR-005 (trigger hay bảng đếm theo ngày) vẫn hoãn — xem §7.

## 6. Design Decisions

| Decision                                                                           | Rationale                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bốn bảng outcome thay vì một bảng `events`                                         | Mỗi kết cục có cột khác nhau (`reason`, `admin_user_id`); gộp một bảng thì hai cột đó NULL ở phần lớn dòng. Tách ra: không nullable, `UNIQUE` mỗi bảng tự ép "tối đa một kết cục" |
| `status` trên bảng cha dù dựng lại được từ outcome                                 | Đọc một cột cho list / guard / capacity; mọi nguồn IDM trong RDBMS đều làm hybrid này                                                                                             |
| Không `updated_at` trên bảng outcome; có trên `booking_requests`                   | Outcome một timestamp. `booking_requests.updated_at` là dư có chủ ý, tiện cho `@UpdateDateColumn`                                                                                 |
| Không event "created"                                                              | `created_at` của bảng cha đã là sự kiện tạo                                                                                                                                       |
| `_cancellations`, `_expirations` không có actor                                    | Suy ra được: chủ request / hệ thống                                                                                                                                               |
| `total_amount` lưu dù tính được                                                    | AC-11: đổi giá sau không đổi request                                                                                                                                              |
| `expires_at` tính ở app, không generated column                                    | Cast date → timestamptz phụ thuộc múi giờ; giữ `Asia/Saigon` ở config                                                                                                             |
| Amenity: một bảng master + một junction, bed/view gộp chung, không ép đúng-một     | Một cơ chế lọc cho mọi tiêu chí; danh mục cố định nên không cần `name`; đúng-một là trách nhiệm nhập liệu                                                                         |
| Token kích hoạt ở bảng riêng                                                       | Sau kích hoạt cột token/hạn sẽ NULL nếu để trên `users`                                                                                                                           |
| `user_deactivations` / `user_reactivations` là log, không UNIQUE                   | Khoá / mở lặp nhiều lần; cờ `is_active` không nói ai và lúc nào                                                                                                                   |
| `reviews` FK vào booking, không vào room_type                                      | "Chỉ review cái mình đã ở" thành ràng buộc cấu trúc                                                                                                                               |
| `payments` một bảng, một dòng một booking                                          | Mock, không cổng thật, không đường hoàn tiền (không huỷ được request đã duyệt). Mở rộng sau: `status`, `provider`, `payment_failures`, `refunds`                                  |
| Doanh thu tính trên `payments`, không trên `total_amount`                          | Tiền đã thu ≠ giá đã chốt                                                                                                                                                         |
| Rule chính sách (1..5 phòng, ≤30 đêm, ≤12 tháng, giá > 0, reason không rỗng) ở app | Là số có thể đổi; DB chỉ giữ invariant (thứ tự ngày, enum, `>= 0`, NOT NULL)                                                                                                      |
| `bigint` PK, không uuid                                                            | Khoá nội bộ; auth mới là hàng rào; nhất quán toàn schema                                                                                                                          |
| Email unique trên `lower(email)`                                                   | Không cần extension `citext`                                                                                                                                                      |

## 7. Open Items

| #   | Item                                                                                                                                                                                  | Owner |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1   | Cơ chế chặn capacity ở tầng DB (NFR-005). **2026-09-21: tạm hoãn** — đi advisory lock (`pg_advisory_xact_lock(room_type_id)`) + kiểm tra trong transaction ở service. **2026-09-23**: khoá đổi thành row lock trên `room_types`, xem §8; thêm ràng buộc thật ở DB (bảng `room_type_daily_inventory`) chỉ khi còn thời gian. Schema hiện tại không đổi | Dev   |
| 2   | ~~TypeORM `^1.1.1` với `"type": "module"`~~ **Đã xác nhận 2026-09-21** bằng spike: `@Check`, `@Index({ where })` sinh SQL đúng; `migration:generate` / `run` / `revert` chạy qua `dist/database/data-source.js` (ESM, không cần ts-node). Script: `npm run migration:*` | Dev   |
| 3   | Giảm `total_rooms` xuống dưới số đang giữ (F-007 / F-011) — câu hỏi treo từ `ba-memory.md`                                                                                            | BA    |

## 8. Deviations

> Mỗi lần code làm khác thiết kế: một dòng. Rỗng = tài liệu còn đúng với code.

| Date | What changed | Why |
| --- | --- | --- |
| 2026-09-22 | Transition kích hoạt chạy `UPDATE users ... WHERE status='unverified'` **trước**, rồi mới `INSERT user_email_verifications` — ngược thứ tự mô tả ở §5 | Hai request kích hoạt cùng token chạy song song: nếu INSERT trước, request thứ hai đâm vào UNIQUE `user_id` và nhận `23505` → 500. Cho UPDATE chạy trước thì nó chờ row lock của `users`, tỉnh dậy thấy `status` không còn `unverified` → `affected = 0` → 409 đúng như thiết kế. Vẫn một transaction, `status` không bao giờ đổi mà thiếu dòng outcome. Có e2e chứng minh (`settles concurrent activations of the same token`) |
| 2026-09-22 | `users.email` lưu lower-case, UNIQUE đặt thẳng trên cột, thay cho unique index trên `lower(email)` | TypeORM `@Index` không diễn đạt được function index. Index viết tay trong migration còn tệ hơn: `RdbmsSchemaBuilder.dropOldIndices()` xoá mọi index của bảng mà entity metadata không biết, nên mỗi lần `migration:generate` sau này sẽ sinh một câu DROP cho nó. Chuẩn hoá lower-case lúc ghi và lúc tra cho ràng buộc tương đương, và TypeORM mô tả được trọn vẹn |
| 2026-09-23 | Tạo booking khoá bằng row lock `SELECT … FROM room_types WHERE id = $1 FOR UPDATE` thay cho `pg_advisory_xact_lock(room_type_id)` | Cùng mức tuần tự hoá (một booking một lúc cho mỗi loại phòng) nhưng khoá chính dòng dữ liệu: mọi câu ghi vào dòng đó sau này (F-007 sửa `total_rooms`, xoá loại phòng) tự động phải chờ, không cần nhớ lấy chung một advisory lock; đọc dòng và khoá gộp một câu. Advisory lock được chọn lúc kiểm tra còn định nằm trong trigger — khi đã chuyển về service thì lý do đó không còn. e2e `never overbooks under concurrent requests` fail (4/5 request được nhận) khi bỏ khoá |
| 2026-09-24 | Khoá / mở khoá user (`user_deactivations`, `user_reactivations`) đọc user, kiểm `status` trong code rồi mới `UPDATE users SET status` theo `id` — không có `AND status = <hiện tại>`, không kiểm `rowCount` | Chỉ admin làm, hai admin cùng bấm vào một user đúng một lúc gần như không xảy ra; đổi lại code đọc thẳng theo luật nghiệp vụ (404 → 409 → ghi). Race nếu có chỉ để lại hai dòng outcome cho một lần đổi, `status` vẫn đúng. Chấp nhận có chủ ý |
