# Kế hoạch triển khai chi tiết sản phẩm hoàn chỉnh

## 1. Mục đích tài liệu

Tài liệu này gom toàn bộ backlog triển khai theo đúng spec hợp nhất của dự án, để có thể giao việc theo từng phần độc lập nhưng vẫn giữ đúng dependency kỹ thuật và nghiệp vụ.

Tài liệu nguồn tham chiếu chính:

- `sanpham_hoanchinh.md`

Nguyên tắc thực hiện:

- Bám đúng spec hợp nhất, không diễn giải lệch phạm vi.
- Triển khai theo thứ tự dependency, không làm ngược khiến phải sửa lại nền tảng.
- Không cắt lùi về tư duy MVP.
- Mọi thay đổi phải bám 4 ưu tiên chính trong spec:
  1. Commerce core hoàn chỉnh
  2. Admin và vận hành nội bộ
  3. Analytics và dashboard
  4. Recommendation và khoa học dữ liệu

## 2. Cách dùng tài liệu này

Tài liệu được chia thành `Phần 1` đến `Phần 10`. Mỗi phần đủ ngữ cảnh để giao việc độc lập theo một câu lệnh ngắn.

Ví dụ câu lệnh:

```text
Hãy làm Phần 4 trong file kehoach_trien_khai_chi_tiet.md
```

Quy ước sử dụng:

- Khi làm một phần, phải đọc toàn bộ phần đó.
- Đồng thời phải đọc mục `Dependency đầu vào` và các phần liên quan đã hoàn thành trước đó.
- Nếu một phần phụ thuộc phần trước, không được tự ý bỏ qua dependency.
- Nếu cần mở rộng ngoài phạm vi phần hiện tại, phải nói rõ đó là nhu cầu phát sinh chứ không ngầm gộp thêm việc.

## 3. Tổng quan roadmap

| Phần | Tên phần | Mục tiêu ngắn | Dependency chính | Trạng thái |
|---|---|---|---|---|
| 1 | Nền tảng hệ thống và shared contracts | Dựng khung ứng dụng, shared rules, security và observability baseline | Không có | Chưa làm |
| 2 | Schema dữ liệu vận hành và analytics | Hoàn thiện nền dữ liệu commerce, admin, analytics | Phần 1 | Chưa làm |
| 3 | Catalog storefront cơ bản | Render homepage, listing, category, collection, PDP | Phần 1, 2 | Chưa làm |
| 4 | Search và khám phá sản phẩm | Search usable, no-result handling, related suggestions | Phần 1, 2, 3 | Chưa làm |
| 5 | Cart và pricing engine | Giỏ hàng hoạt động đúng cho guest và logged-in | Phần 1, 2, 3 | Chưa làm |
| 6 | Checkout, order và payment flow | Hoàn tất luồng mua hàng end-to-end | Phần 1, 2, 5 | Chưa làm |
| 7 | Account và self-service | Tài khoản, lịch sử đơn, theo dõi trạng thái | Phần 1, 2, 5, 6 | Chưa làm |
| 8 | Admin catalog và content ops | CRUD catalog và duyệt dữ liệu staging trước publish | Phần 1, 2, 3 | Chưa làm |
| 9 | Admin order, payment và vận hành nội bộ | Xử lý đơn, xác nhận chuyển khoản, ghi chú vận hành | Phần 1, 2, 6 | Chưa làm |
| 10 | Analytics, dashboard và recommendation phase đầu | Tracking, dashboard, ranking, recommendation ban đầu | Phần 1 đến 9 | Chưa làm |

## 4. Danh sách API và interface chính thức

### Catalog

- `GET /api/v1/home`
- `GET /api/v1/books`
- `GET /api/v1/books/{slug}`
- `GET /api/v1/search`
- `GET /api/v1/categories`
- `GET /api/v1/categories/{slug}`
- `GET /api/v1/collections/{slug}`

### Cart

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{itemId}`
- `DELETE /api/v1/cart/items/{itemId}`
- `POST /api/v1/cart/recalculate`
- `POST /api/v1/cart/merge`

### Checkout / Order

- `POST /api/v1/checkout/start`
- `POST /api/v1/checkout/shipping-info`
- `POST /api/v1/checkout/payment-method`
- `GET /api/v1/checkout/summary`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{orderNumber}`
- `POST /api/v1/orders/{orderNumber}/cancel`
- `POST /api/v1/orders/{orderNumber}/bank-transfer/mark-received`

### Auth / Account

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/account/orders`

### Analytics

- `POST /api/v1/analytics/events`
- `POST /api/v1/analytics/identify`
- `POST /api/v1/analytics/flush-critical`

## 5. Template chuẩn áp dụng cho mọi phần

Mỗi phần từ 1 đến 10 phải luôn được hiểu theo cùng một cấu trúc:

- Mục tiêu
- Phạm vi
- Không bao gồm
- Dependency đầu vào
- Backend cần làm
- Frontend cần làm
- Database / schema
- API / interface liên quan
- Rule nghiệp vụ cần tuân thủ
- Analytics / logging cần có
- Kiểm thử / acceptance criteria
- Đầu ra kỳ vọng sau khi xong phần này
- Lệnh mẫu để giao việc cho Codex

## 6. Chi tiết từng phần triển khai

### Phần 1. Nền tảng hệ thống và shared contracts

**Mục tiêu**

Dựng khung dự án ổn định theo kiến trúc `modular monolith`, đủ nền để triển khai các module nghiệp vụ về sau mà không phải refactor kiến trúc lớn.

**Phạm vi**

- Khởi tạo Express application với cấu trúc module-first.
- Tổ chức các module: `shared`, `catalog`, `search`, `cart`, `checkout`, `auth`, `analytics`, `content-ops`, `admin`.
- Kết nối PostgreSQL qua Prisma.
- Cấu hình session với `express-session` và `connect-pg-simple`.
- Dựng tầng view server-rendered với EJS.
- Tích hợp Bootstrap 5 cho UI nền và Vanilla JavaScript + Fetch API cho tương tác.
- Tạo shared contracts: enums, DTO cơ bản, money rules, order/payment status, availability status, publish status, event taxonomy.
- Thiết lập baseline security: CSRF, secure HttpOnly cookies, rate limit, password hashing strategy, RBAC khung cho admin.
- Thiết lập baseline observability: structured logs, request id, session id, cart id, order id theo khả năng gắn ngữ cảnh.

**Không bao gồm**

- Business flow cụ thể của catalog, cart, checkout, order.
- Dashboard analytics.
- Recommendation logic.

**Dependency đầu vào**

- Tài liệu gốc `sanpham_hoanchinh.md`.
- Quyết định stack đã chốt trong spec: Node.js, Express.js, PostgreSQL, Prisma, EJS, Bootstrap 5.

**Backend cần làm**

- Tạo entrypoint ứng dụng, router chính và cơ chế mount module.
- Thiết kế convention cho controller, service, repository, validator, view model.
- Tạo shared library cho money helpers, enum constants, API response shape, error handling.
- Tạo middleware cho logging, correlation id, CSRF, auth context, admin guard khung.
- Thiết kế cấu trúc config môi trường cho DB, session, security, analytics relay.

**Frontend cần làm**

- Tạo layout EJS nền: head, navbar, footer, flash/error slots.
- Tạo partials chung để các phần sau tái sử dụng.
- Tạo base asset pipeline tối thiểu cho CSS/JS tĩnh.

**Database / schema**

- Kết nối Prisma với PostgreSQL.
- Chuẩn bị convention migration, seed và naming.
- Chưa cần đầy đủ business tables ở phần này, nhưng cần chốt quy ước schema và enum strategy.

**API / interface liên quan**

- Chưa triển khai full API nghiệp vụ.
- Có thể tạo health endpoint hoặc base `/api/v1` wiring nếu cần.

**Rule nghiệp vụ cần tuân thủ**

- Kiến trúc module-first.
- Shared contracts là nguồn sự thật chung cho enum và money rules.
- Không để logic tính tiền, order, payment ở client.

**Analytics / logging cần có**

- Structured logs cho request lifecycle.
- Gắn `request_id`, `session_id` nếu có.
- Chuẩn bị taxonomy event dùng chung cho các phần sau.

**Kiểm thử / acceptance criteria**

- Ứng dụng khởi động được trên local với DB kết nối thành công.
- Session lưu được vào PostgreSQL.
- View engine render được trang mẫu.
- Middleware security/logging không phá luồng request cơ bản.
- Cấu trúc module đủ rõ để thêm module mới mà không sửa entrypoint lớn.

**Đầu ra kỳ vọng sau khi xong phần này**

- Có skeleton ứng dụng production-oriented.
- Có shared contracts và baseline security/observability dùng lại cho toàn dự án.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 1 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 2. Schema dữ liệu vận hành và analytics

**Mục tiêu**

Hoàn thiện nền dữ liệu chuẩn cho commerce, admin và analytics để các phần sau chỉ việc bám vào schema ổn định.

**Phạm vi**

- Thiết kế và migrate các bảng vận hành:
  - `authors`
  - `publishers`
  - `categories`
  - `books`
  - `book_categories`
  - `collections`
  - `collection_items`
  - `users`
  - `sessions`
  - `carts`
  - `cart_items`
  - `checkout_attempts`
  - `orders`
  - `order_addresses`
  - `order_items`
  - `payment_records`
  - `content_import_jobs`
  - `staged_books`
- Thiết kế và migrate các bảng analytics:
  - `analytics_event_outbox`
  - `fact_sessions`
  - `fact_search`
  - `fact_product_views`
  - `fact_cart_events`
  - `fact_checkout_events`
  - `fact_orders`
- Chốt quan hệ, khóa ngoại, index, unique constraints.
- Chốt các enum/bảng trạng thái theo shared contracts.

**Không bao gồm**

- Dashboard query/reporting.
- Recommendation feature tables phase 2 nâng cao.
- Giao diện thao tác dữ liệu.

**Dependency đầu vào**

- Phần 1 hoàn thành.
- Shared enum/status/money rules đã có.

**Backend cần làm**

- Định nghĩa Prisma schema cho toàn bộ entity nền.
- Chốt repository contract hoặc data access pattern thống nhất.
- Tạo seed tối thiểu cho category, collection, admin account nếu cần cho dev.

**Frontend cần làm**

- Không có UI lớn trong phần này.
- Chỉ hỗ trợ nếu cần trang debug hoặc seed preview cho môi trường dev.

**Database / schema**

- Tiền tệ thống nhất là VND.
- Mọi giá trị tiền lưu dạng integer.
- `order_items` phải lưu snapshot tại thời điểm đặt hàng.
- Phân tách dữ liệu vận hành và analytics ngay từ schema.
- Index cho search/filter/order lookup cần được chuẩn bị từ sớm.

**API / interface liên quan**

- Chưa cần public API hoàn chỉnh.
- Có thể tạo internal data access interfaces cho các module sau.

**Rule nghiệp vụ cần tuân thủ**

- Server là nguồn sự thật cho giá, shipping fee, subtotal, total.
- Dữ liệu crawl không được publish trực tiếp.
- Hệ thống phải phân biệt guest và logged-in user.

**Analytics / logging cần có**

- Tạo nền outbox để phát và lưu event analytics tin cậy.
- Chuẩn bị cột liên kết session/cart/order phù hợp để phục vụ funnel.

**Kiểm thử / acceptance criteria**

- Migration chạy sạch từ đầu.
- Quan hệ giữa cart, checkout, order, payment hợp lý và không mâu thuẫn.
- Có thể tạo dữ liệu mẫu cho books, users, carts, orders.
- Snapshot order item lưu được thông tin độc lập với book gốc.
- Schema analytics đủ nhận các event trong taxonomy bắt buộc.

**Đầu ra kỳ vọng sau khi xong phần này**

- Có nền dữ liệu ổn định để các phần commerce, admin, analytics cùng dùng.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 2 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 3. Catalog storefront cơ bản

**Mục tiêu**

Cho phép người dùng duyệt catalog qua homepage, listing, category, collection và product detail page theo đúng spec.

**Phạm vi**

- Homepage:
  - banner chính
  - khối sách nổi bật
  - khối sách bán chạy
  - khối sách theo danh mục
  - khối sách theo chủ đề / collection
  - điều hướng rõ ràng tới search, category, collection
- Listing/category/collection:
  - duyệt sách theo category
  - duyệt sách theo collection
  - filter theo category, author, publisher, khoảng giá, availability status
  - sort theo nổi bật, bán chạy, mới nhất, giá tăng dần, giá giảm dần
  - phân trang
  - breadcrumb
- PDP:
  - ảnh bìa, tên, tác giả, giá bán, giá niêm yết nếu có
  - phí ship hiển thị rõ
  - mô tả ngắn, mô tả chi tiết
  - metadata sách
  - trạng thái còn hàng/hết hàng
  - badge nổi bật/bán chạy/khuyến nghị
  - CTA thêm vào giỏ, mua ngay
  - khối sách liên quan ở mức placeholder hoặc dữ liệu tĩnh ban đầu nếu phần 4 chưa xong

**Không bao gồm**

- Search nâng cao.
- Cart/checkout logic.
- Recommendation đầy đủ theo hành vi.

**Dependency đầu vào**

- Phần 1 và 2 hoàn thành.
- Có dữ liệu catalog seed hoặc dữ liệu thử nghiệm tối thiểu.

**Backend cần làm**

- Triển khai read APIs cho catalog.
- Service lấy dữ liệu homepage/listing/PDP.
- Logic filter/sort/pagination/breadcrumb.
- Logic chỉ hiển thị sách hợp lệ theo publish status và availability status phù hợp storefront.

**Frontend cần làm**

- Dựng các page EJS cho homepage, listing, category, collection, PDP.
- Dựng card sách, filter bar, sort control, pagination, badge, metadata display.
- Bảo đảm hiển thị mobile-friendly và không dồn tổng giá trị/chi phí quá muộn.

**Database / schema**

- Dùng các bảng `books`, `authors`, `publishers`, `categories`, `book_categories`, `collections`, `collection_items`.
- Tôn trọng `slug`, `publish status`, `availability status`, badge fields.

**API / interface liên quan**

- `GET /api/v1/home`
- `GET /api/v1/books`
- `GET /api/v1/books/{slug}`
- `GET /api/v1/categories`
- `GET /api/v1/categories/{slug}`
- `GET /api/v1/collections/{slug}`

**Rule nghiệp vụ cần tuân thủ**

- Chỉ hiển thị dữ liệu đã sẵn sàng cho storefront.
- Phải hiển thị giá và phí ship sớm, rõ ràng.
- Không để sản phẩm hết hàng đi vào flow mua mà không có cảnh báo.

**Analytics / logging cần có**

- Chuẩn bị event hooks cho:
  - `page_view`
  - `session_start`
  - `view_homepage`
  - `view_landing_page`
  - `view_category`
  - `view_collection`
  - `view_item`
  - `click_product_card`

**Kiểm thử / acceptance criteria**

- User duyệt được homepage và điều hướng sang category/collection/PDP.
- Filter và sort cho kết quả đúng.
- Pagination ổn định.
- Breadcrumb phản ánh đúng ngữ cảnh.
- PDP hiển thị đúng metadata, availability, giá và phí ship.

**Đầu ra kỳ vọng sau khi xong phần này**

- Storefront đọc catalog hoàn chỉnh, sẵn sàng nối tiếp với search và cart.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 3 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 4. Search và khám phá sản phẩm

**Mục tiêu**

Làm cho search usable trong ngữ cảnh bán sách, đồng thời hỗ trợ khám phá sản phẩm khi user không có kết quả chính xác.

**Phạm vi**

- Search theo tên sách.
- Search theo tác giả.
- Search theo từ khóa.
- Search theo nhà xuất bản.
- Trang kết quả search.
- No-result handling.
- Gợi ý sản phẩm liên quan khi không có kết quả.
- Logging từ khóa search phục vụ analytics.
- Khối related/basic recommendation ở mức rule-based để hỗ trợ khám phá.

**Không bao gồm**

- Recommendation phase dữ liệu nâng cao.
- Segmentation, clustering, forecast.

**Dependency đầu vào**

- Phần 1, 2, 3 hoàn thành.
- Catalog read flow đã usable.

**Backend cần làm**

- Search service và query strategy phù hợp cho tên sách, tác giả, publisher, keyword.
- Chuẩn hóa input tìm kiếm.
- Xử lý no-result và fallback query.
- Ghi log search vào fact/outbox phù hợp.
- Tạo rule-based related suggestions từ metadata chung: category, author, publisher, badge hoặc popularity seed.

**Frontend cần làm**

- Search input/submit flow.
- Search results page.
- No-result UI có định hướng tiếp theo.
- Hiển thị block gợi ý liên quan.

**Database / schema**

- Sử dụng dữ liệu catalog hiện có.
- Tận dụng `fact_search` và `analytics_event_outbox` cho logging.

**API / interface liên quan**

- `GET /api/v1/search`

**Rule nghiệp vụ cần tuân thủ**

- Search phải phản hồi tốt.
- Khi không có kết quả phải có no-result handling thay vì trang trống.
- Log từ khóa để dùng cho phân tích về sau.

**Analytics / logging cần có**

- `search`
- `view_search_results`
- `search_no_result`
- `select_search_result`

**Kiểm thử / acceptance criteria**

- User search theo tên sách và nhận đúng kết quả.
- User search theo tác giả/keyword/publisher và có kết quả hợp lý.
- Khi không có kết quả, hệ thống hiện no-result message và gợi ý liên quan.
- Search terms được lưu để dùng cho dashboard sau này.

**Đầu ra kỳ vọng sau khi xong phần này**

- Search usable và tạo được dữ liệu đầu vào cho analytics cùng recommendation phase đầu.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 4 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 5. Cart và pricing engine

**Mục tiêu**

Làm cho giỏ hàng hoạt động đúng, bền vững giữa phiên, và tính tiền hoàn toàn server-side.

**Phạm vi**

- Tạo cart theo session.
- Giữ cart cho guest giữa các phiên theo khả năng session/persistence đã chọn.
- Merge cart khi user đăng nhập.
- Add item vào cart.
- Tăng giảm số lượng.
- Xóa sản phẩm khỏi giỏ.
- Recalculate cart.
- Tính `subtotal`, `shipping fee`, `total`.
- Cảnh báo nếu sản phẩm hết hàng hoặc không thể mua.

**Không bao gồm**

- Tạo order.
- Xử lý thanh toán.

**Dependency đầu vào**

- Phần 1, 2, 3 hoàn thành.
- Catalog và availability status hoạt động đúng.

**Backend cần làm**

- Cart service và cart item service.
- Pricing service tính tiền server-side.
- Validation stock/availability trước khi chấp nhận cart mutation.
- Merge strategy giữa guest cart và user cart.

**Frontend cần làm**

- CTA thêm vào giỏ từ PDP và nơi cần thiết.
- Trang cart hiển thị line items, quantity controls, remove action, summary.
- Cảnh báo rõ khi item không còn mua được.

**Database / schema**

- Dùng `carts`, `cart_items`, `sessions`, `users`.
- Chuẩn bị mapping giữa guest session và logged-in user.

**API / interface liên quan**

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{itemId}`
- `DELETE /api/v1/cart/items/{itemId}`
- `POST /api/v1/cart/recalculate`
- `POST /api/v1/cart/merge`

**Rule nghiệp vụ cần tuân thủ**

- Server là nguồn sự thật cho giá, shipping fee, subtotal, total.
- Giá trị tiền lưu integer VND.
- Cart phải dùng được cho guest.

**Analytics / logging cần có**

- `add_to_cart`
- `remove_from_cart`
- `update_cart_quantity`
- `view_cart`

**Kiểm thử / acceptance criteria**

- User add sách vào giỏ thành công.
- User update quantity và total cập nhật đúng.
- User remove item khỏi giỏ thành công.
- Guest cart được giữ lại hợp lý giữa các phiên.
- Khi đăng nhập, cart merge không làm mất item hợp lệ.
- Item hết hàng bị chặn mua và có cảnh báo rõ.

**Đầu ra kỳ vọng sau khi xong phần này**

- Cart flow ổn định, tiền tính đúng, đủ nền cho checkout.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 5 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 6. Checkout, order và payment flow

**Mục tiêu**

Hoàn tất luồng mua hàng end-to-end từ cart sang order thành công cho cả COD và bank transfer.

**Phạm vi**

- Guest checkout là luồng mặc định.
- Logged-in checkout được hỗ trợ đầy đủ.
- Checkout start.
- Nhập shipping info:
  - họ tên
  - số điện thoại
  - địa chỉ
  - phường/xã
  - quận/huyện
  - tỉnh/thành
  - ghi chú đơn hàng
- Chọn payment method:
  - COD
  - bank transfer
- Trang summary cuối.
- Tạo order.
- Idempotency key cho submit order an toàn.
- Trang order success.
- Hướng dẫn chuyển khoản nếu chọn bank transfer.
- Lưu payment records và order statuses.
- Phát `purchase` event từ backend.

**Không bao gồm**

- Admin xử lý đơn hậu kiểm.
- Dashboard funnel.

**Dependency đầu vào**

- Phần 1, 2, 5 hoàn thành.
- Cart và pricing engine đã ổn định.

**Backend cần làm**

- Checkout attempt lifecycle.
- Validate shipping data và payment method.
- Tạo order từ cart snapshot.
- Tạo order address, order items, payment records.
- Áp dụng idempotency cho order submit.
- Xử lý status theo luồng COD và bank transfer.

**Frontend cần làm**

- Checkout form nhiều bước hoặc một luồng rõ ràng theo kiến trúc đã chọn.
- Summary page hiển thị subtotal, shipping fee, total.
- Order success page.
- Bank transfer instruction UI nếu cần thanh toán chuyển khoản.

**Database / schema**

- Dùng `checkout_attempts`, `orders`, `order_addresses`, `order_items`, `payment_records`.
- Lưu snapshot order item tại thời điểm đặt hàng.

**API / interface liên quan**

- `POST /api/v1/checkout/start`
- `POST /api/v1/checkout/shipping-info`
- `POST /api/v1/checkout/payment-method`
- `GET /api/v1/checkout/summary`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{orderNumber}`
- `POST /api/v1/orders/{orderNumber}/cancel`
- `POST /api/v1/orders/{orderNumber}/bank-transfer/mark-received`

**Rule nghiệp vụ cần tuân thủ**

- Guest checkout phải luôn hoạt động.
- COD và bank transfer đều phải hoạt động.
- Order chỉ được tạo khi dữ liệu checkout hợp lệ.
- Purchase event phải được phát từ backend.
- Không đưa PII thô vào analytics.

**Analytics / logging cần có**

- `begin_checkout`
- `add_shipping_info`
- `select_payment_method`
- `checkout_error`
- `purchase`
- `payment_success`
- `payment_failed`

**Kiểm thử / acceptance criteria**

- Guest checkout COD thành công.
- Guest checkout bank transfer thành công.
- Logged-in user checkout thành công.
- Idempotency ngăn tạo trùng order khi submit lại.
- Order summary dùng số liệu server-side.
- Payment record phản ánh đúng trạng thái ban đầu của COD/bank transfer.

**Đầu ra kỳ vọng sau khi xong phần này**

- User mua hàng trọn luồng được và tạo order ổn định.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 6 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 7. Account và self-service

**Mục tiêu**

Cung cấp khu vực tài khoản để user đăng nhập, xem thông tin cơ bản và theo dõi đơn hàng của chính mình.

**Phạm vi**

- Đăng ký.
- Đăng nhập.
- Đăng xuất.
- `auth/me`.
- Hồ sơ cơ bản.
- Danh sách đơn hàng.
- Chi tiết từng đơn hàng.
- Theo dõi trạng thái đơn hàng.
- Đồng bộ cart giữa guest và logged-in user ở mức trải nghiệm không gãy.

**Không bao gồm**

- Admin RBAC chi tiết.
- Loyalty hoặc hồ sơ người dùng nâng cao.

**Dependency đầu vào**

- Phần 1, 2, 5, 6 hoàn thành.

**Backend cần làm**

- Auth service cho register/login/logout.
- Password hashing.
- Session-based auth flow.
- Account order history queries.
- Authorization để user chỉ xem được đơn của chính mình.

**Frontend cần làm**

- Form đăng ký/đăng nhập.
- Trang hồ sơ cơ bản.
- Trang danh sách đơn.
- Trang chi tiết đơn và hiển thị trạng thái.

**Database / schema**

- Dùng `users`, `sessions`, `orders`.
- Hỗ trợ liên kết guest cart sang user cart khi login.

**API / interface liên quan**

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/account/orders`

**Rule nghiệp vụ cần tuân thủ**

- Không bắt buộc tạo tài khoản trước khi mua.
- Hệ thống phải phân biệt guest và logged-in user.
- Merge cart khi đăng nhập phải giữ trải nghiệm nhất quán.

**Analytics / logging cần có**

- Logging auth success/failure ở mức vận hành.
- Phân biệt guest và logged-in trong dữ liệu conversion theo spec.

**Kiểm thử / acceptance criteria**

- User đăng ký và đăng nhập thành công.
- User đăng xuất sạch session.
- Logged-in user xem được lịch sử đơn.
- Logged-in user xem được chi tiết đơn của mình.
- User không xem được đơn của người khác.
- Cart không mất sau đăng nhập nếu có logic merge.

**Đầu ra kỳ vọng sau khi xong phần này**

- Account area usable, hỗ trợ self-service cơ bản cho người mua.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 7 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 8. Admin catalog và content ops

**Mục tiêu**

Cho phép admin quản trị catalog và xử lý dữ liệu nhập vào theo đúng nguyên tắc staging -> review -> publish.

**Phạm vi**

- CRUD `books`.
- CRUD `authors`.
- CRUD `publishers`.
- CRUD `categories`.
- CRUD `collections`.
- Quản lý cover image.
- Quản lý slug.
- Quản lý badge.
- Quản lý publish status:
  - `draft`
  - `review`
  - `published`
  - `archived`
- Quản lý availability status:
  - `còn hàng`
  - `sắp hết`
  - `hết hàng`
- Nhập sách thủ công.
- Import dữ liệu từ nguồn crawl vào staging.
- Review dữ liệu trước publish.
- Chuẩn hóa metadata trước publish.
- Từ chối bản ghi không hợp lệ.
- Mapping staged book sang book chính thức.

**Không bao gồm**

- Xử lý đơn hàng và payment operations.
- Dashboard analytics nâng cao.

**Dependency đầu vào**

- Phần 1, 2, 3 hoàn thành.

**Backend cần làm**

- Admin CRUD endpoints/services cho toàn bộ catalog entity.
- Workflow state transition cho staged content và published content.
- Validation slug, metadata, required fields.
- Import job tracking.

**Frontend cần làm**

- Admin pages/form cho CRUD catalog.
- Giao diện review dữ liệu staging.
- Giao diện publish/reject/normalize.

**Database / schema**

- Dùng `books`, `authors`, `publishers`, `categories`, `collections`, `collection_items`, `content_import_jobs`, `staged_books`.

**API / interface liên quan**

- CRUD books
- CRUD authors
- CRUD publishers
- CRUD categories
- CRUD collections
- content import and review endpoints

**Rule nghiệp vụ cần tuân thủ**

- Dữ liệu crawl không được publish trực tiếp.
- Bắt buộc qua review trước khi đưa lên storefront.
- Admin phải quản trị được catalog mà không sửa DB tay.

**Analytics / logging cần có**

- Audit logs cho hành động publish/reject/update quan trọng.
- Logging import job status và lỗi chuẩn hóa dữ liệu.

**Kiểm thử / acceptance criteria**

- Admin CRUD catalog thành công.
- Admin đổi publish status và availability status đúng.
- Dữ liệu staging có thể review và reject.
- Dữ liệu staging chỉ lên storefront sau khi publish hợp lệ.
- Slug và metadata không gây xung đột rõ ràng.

**Đầu ra kỳ vọng sau khi xong phần này**

- Team vận hành quản trị catalog và content pipeline mà không cần thao tác trực tiếp vào DB.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 8 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 9. Admin order, payment và vận hành nội bộ

**Mục tiêu**

Cho phép admin xử lý vòng đời đơn hàng, xác nhận chuyển khoản và ghi chú vận hành nội bộ.

**Phạm vi**

- Danh sách đơn hàng.
- Lọc theo trạng thái đơn.
- Lọc theo trạng thái thanh toán.
- Tìm theo mã đơn.
- Xem chi tiết đơn.
- Cập nhật trạng thái đơn:
  - `placed`
  - `awaiting_transfer`
  - `confirmed`
  - `packed`
  - `shipped`
  - `delivered`
  - `cancelled`
- Hủy đơn.
- Ghi nhận lý do hủy.
- Xác nhận chuyển khoản.
- Gắn bằng chứng thanh toán nếu cần.
- Ghi chú vận hành nội bộ.

**Không bao gồm**

- Dashboard phân tích nâng cao.
- Recommendation.

**Dependency đầu vào**

- Phần 1, 2, 6 hoàn thành.

**Backend cần làm**

- Order management service cho admin.
- Payment verification flow cho bank transfer.
- Audit log cho status transition.
- Validation transition để tránh trạng thái nhảy sai logic.

**Frontend cần làm**

- Admin order list.
- Admin order detail.
- Form/actions cho update status, cancel, confirm transfer, notes.

**Database / schema**

- Dùng `orders`, `order_items`, `order_addresses`, `payment_records`.
- Có thể bổ sung audit fields hoặc notes fields nếu schema chưa đủ.

**API / interface liên quan**

- order management endpoints
- `POST /api/v1/orders/{orderNumber}/cancel`
- `POST /api/v1/orders/{orderNumber}/bank-transfer/mark-received`

**Rule nghiệp vụ cần tuân thủ**

- COD và bank transfer đều phải vận hành được tới tầng admin.
- Xác nhận chuyển khoản phải cập nhật payment record và order status nhất quán.
- Admin phải vận hành được mà không thao tác DB trực tiếp.

**Analytics / logging cần có**

- Audit logs cho đổi trạng thái đơn.
- Logging payment verification và cancel reasons.

**Kiểm thử / acceptance criteria**

- Admin xem được danh sách đơn và tìm theo mã đơn.
- Admin lọc được theo order status/payment status.
- Admin cập nhật trạng thái đúng flow.
- Admin xác nhận chuyển khoản thành công.
- Admin hủy đơn và lưu được lý do hủy.
- Internal notes lưu được và không lộ ra phía khách hàng.

**Đầu ra kỳ vọng sau khi xong phần này**

- Order ops flow hoàn chỉnh cho vận hành nội bộ.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 9 trong file kehoach_trien_khai_chi_tiet.md
```

### Phần 10. Analytics, dashboard và recommendation phase đầu

**Mục tiêu**

Hoàn thiện lớp dữ liệu hành vi, báo cáo vận hành sản phẩm và recommendation/ranking phase đầu đúng với spec.

**Phạm vi**

- Consent banner.
- Cookie/privacy policy hooks liên quan tracking.
- Analytics event ingestion API.
- Relay sang GA4.
- Analytics relay nội bộ và outbox processing.
- Populate các fact tables.
- Dashboard bắt buộc:
  - funnel homepage -> PDP -> cart -> checkout -> purchase
  - funnel search -> result -> PDP -> cart -> purchase
  - funnel checkout step-by-step
  - doanh thu theo ngày/tuần/tháng
  - tỷ lệ theo payment method
  - tỷ lệ theo device
  - tỷ lệ theo category
  - top books
  - top search terms
  - no-result search terms
  - guest vs logged-in conversion
- Recommendation/data science phase 1:
  - bestseller ranking tự động
  - featured ranking bán tự động có hỗ trợ dữ liệu
  - search analytics usable
  - recommendation theo metadata + hành vi
- Chuẩn bị điểm mở rộng cho phase 2 nhưng chưa triển khai đầy đủ.

**Không bao gồm**

- `Frequently viewed together`
- `Frequently bought together`
- user segmentation đầy đủ
- RFM/clustering đầy đủ
- demand forecast production-grade

**Dependency đầu vào**

- Phần 1 đến 9 hoàn thành ở mức dữ liệu chính đã chạy được.

**Backend cần làm**

- `/api/v1/analytics/events`, `/identify`, `/flush-critical`.
- Relay logic sang GA4 và hệ nội bộ.
- Event normalization và consent-aware filtering.
- Outbox processor/fact table loader.
- Service tính bestseller/featured/recommendation phase đầu.

**Frontend cần làm**

- Consent banner UI.
- Hook gửi event từ storefront/cart/checkout/account phù hợp.
- Dashboard views hoặc admin analytics pages nếu dự án đặt dashboard nội bộ trong cùng app.

**Database / schema**

- Dùng `analytics_event_outbox`, `fact_sessions`, `fact_search`, `fact_product_views`, `fact_cart_events`, `fact_checkout_events`, `fact_orders`.
- Dùng hoặc bổ sung các bảng feature:
  - `feature_user_behavior`
  - `feature_book_popularity`
  - `feature_search_terms`
  - `recommendation_candidates`

**API / interface liên quan**

- `POST /api/v1/analytics/events`
- `POST /api/v1/analytics/identify`
- `POST /api/v1/analytics/flush-critical`

**Rule nghiệp vụ cần tuân thủ**

- Không đưa PII thô vào analytics.
- Tracking phải theo consent policy.
- Purchase event phải phát từ backend.
- Analytics phải phản ánh được guest vs logged-in conversion.

**Analytics / logging cần có**

- Bắt buộc hỗ trợ taxonomy:
  - `page_view`
  - `session_start`
  - `view_homepage`
  - `view_landing_page`
  - `search`
  - `view_search_results`
  - `search_no_result`
  - `select_search_result`
  - `view_category`
  - `view_collection`
  - `apply_filter`
  - `remove_filter`
  - `apply_sort`
  - `click_product_card`
  - `view_item`
  - `click_related_product`
  - `add_to_cart`
  - `remove_from_cart`
  - `update_cart_quantity`
  - `view_cart`
  - `begin_checkout`
  - `add_shipping_info`
  - `select_payment_method`
  - `checkout_error`
  - `purchase`
  - `payment_success`
  - `payment_failed`
- Metrics/alerts cho:
  - API latency
  - error rate
  - no-result search
  - checkout errors
  - giảm purchase
  - lỗi analytics delivery

**Kiểm thử / acceptance criteria**

- Event taxonomy được ghi đúng theo từng luồng chính.
- Dashboard funnel hiển thị số liệu hợp lý.
- Dashboard doanh thu hiển thị được theo ngày/tuần/tháng.
- Có top books, top search terms, no-result search terms.
- Phân biệt được guest và logged-in conversion.
- Có ít nhất 1 recommendation flow usable.
- Có bestseller ranking tự động usable.
- Search analytics đủ dùng cho tối ưu sản phẩm.

**Đầu ra kỳ vọng sau khi xong phần này**

- Dữ liệu hành vi, dashboard và lớp recommendation/ranking phase đầu hoạt động usable cho vận hành và tối ưu sản phẩm.

**Lệnh mẫu để giao việc cho Codex**

```text
Hãy làm Phần 10 trong file kehoach_trien_khai_chi_tiet.md
```

## 7. Bộ acceptance tối thiểu xuyên suốt dự án

Các scenario dưới đây phải xuất hiện trong quá trình triển khai và kiểm thử, không được bỏ qua:

- User duyệt catalog qua homepage, listing, category, collection và PDP.
- User search và gặp `no-result`, sau đó vẫn thấy hướng khám phá tiếp theo.
- User add to cart và update quantity thành công.
- Guest checkout COD thành công.
- Guest checkout bank transfer thành công.
- Logged-in user xem được lịch sử đơn và chi tiết đơn.
- Admin CRUD catalog thành công.
- Admin xác nhận chuyển khoản thành công.
- Analytics ghi đúng event taxonomy.
- Dashboard lên được funnel cơ bản.

## 8. Thứ tự khuyến nghị để triển khai

Thứ tự triển khai khuyến nghị:

1. Phần 1. Nền tảng hệ thống và shared contracts
2. Phần 2. Schema dữ liệu vận hành và analytics
3. Phần 3. Catalog storefront cơ bản
4. Phần 4. Search và khám phá sản phẩm
5. Phần 5. Cart và pricing engine
6. Phần 6. Checkout, order và payment flow
7. Phần 7. Account và self-service
8. Phần 8. Admin catalog và content ops
9. Phần 9. Admin order, payment và vận hành nội bộ
10. Phần 10. Analytics, dashboard và recommendation phase đầu

Ghi chú về song song:

- Có thể có một ít phần việc phụ chạy song song sau khi xong Phần 1 và 2, nhưng nhìn chung roadmap này vẫn nên đi tuần tự.
- Các phần 3, 5, 6 là commerce core nên không nên triển khai rời rạc ngoài dependency chính.
- Phần 10 chỉ nên làm sau khi dữ liệu commerce và admin đã đủ tin cậy.

## 9. Gợi ý câu lệnh giao việc nhanh

```text
Hãy làm Phần 1 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 2 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 3 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 4 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 5 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 6 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 7 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 8 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 9 trong file kehoach_trien_khai_chi_tiet.md
Hãy làm Phần 10 trong file kehoach_trien_khai_chi_tiet.md
```
