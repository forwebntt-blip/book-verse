# Tài liệu thống nhất triển khai sản phẩm hoàn chỉnh

## 1. Mục đích

Tài liệu này là bản thống nhất cuối cùng của dự án, được tổng hợp từ `prd.md`, `spec.md` và `kehoach_morong_sanpham.md`, với một mục tiêu duy nhất:

**triển khai ra sản phẩm hoàn chỉnh, không còn giới hạn theo phạm vi MVP**

Từ thời điểm này:

- `sanpham_hoanchinh.md` là tài liệu gốc để lập kế hoạch và triển khai.
- `prd.md`, `spec.md`, `kehoach_morong_sanpham.md` là tài liệu nền tham chiếu.
- Mọi quyết định triển khai mới phải bám theo tài liệu này.

## 2. Năng lực sản phẩm cần có sau khi hoàn thành

Sau khi triển khai xong, hệ thống phải là một **nền tảng web bán sách vật lý tại Việt Nam có lớp phân tích hành vi người dùng và hỗ trợ ra quyết định dựa trên dữ liệu**, không chỉ là website bán hàng cơ bản.

Sản phẩm hoàn chỉnh phải đồng thời đạt 4 năng lực:

1. Vận hành được quy trình bán sách trực tuyến thực tế.
2. Quản trị được catalog, đơn hàng, thanh toán và dữ liệu nội bộ.
3. Thu thập và phân tích được hành vi người dùng xuyên suốt funnel.
4. Tạo nền tảng cho recommendation, xếp hạng sản phẩm và các bài toán khoa học dữ liệu.

## 3. Phạm vi sản phẩm chính thức

## 3.1. Phạm vi kinh doanh

- Thị trường: Việt Nam
- Sản phẩm: sách vật lý
- Kênh triển khai: website
- Thanh toán hỗ trợ:
  - COD
  - chuyển khoản ngân hàng
- Giao hàng:
  - hỗ trợ giao toàn quốc
  - phí ship cấu hình được, mặc định 30.000 VND

## 3.2. Người dùng chính

### Người mua có nhu cầu rõ ràng

- Tìm theo tên sách, tác giả, chủ đề
- Muốn mua nhanh
- Ưu tiên search chính xác và checkout ngắn

### Người dùng duyệt khám phá

- Chưa biết chính xác sẽ mua gì
- Bị ảnh hưởng bởi bìa sách, mô tả, badge, khối gợi ý
- Cần homepage, listing, collection, recommendation dễ khám phá

### Người mua nhạy cảm chi phí

- Quan tâm tổng tiền, phí ship, độ tin cậy của thanh toán
- Cần nhìn thấy giá, phí ship, phương thức thanh toán rõ ràng từ sớm

### Quản trị viên vận hành

- Quản lý catalog
- Quản lý đơn hàng
- Quản lý thanh toán chuyển khoản
- Quản lý nội dung, collection, trạng thái sách

### Người phân tích / quản lý sản phẩm

- Theo dõi funnel
- Theo dõi search behavior
- Theo dõi hiệu quả category, product, payment method
- Đọc dashboard để tối ưu chuyển đổi

## 4. Mục tiêu sản phẩm

## 4.1. Mục tiêu vận hành

- Người dùng có thể hoàn tất toàn bộ luồng mua sách từ truy cập trang chủ đến đặt hàng thành công.
- Hệ thống có thể quản lý catalog, giỏ hàng, checkout, đơn hàng và thanh toán một cách ổn định.
- Quản trị viên có thể vận hành sản phẩm mà không cần thao tác trực tiếp vào database.

## 4.2. Mục tiêu dữ liệu

- Theo dõi được đầy đủ hành vi người dùng theo phiên và theo funnel.
- Tính được các KPI kinh doanh và KPI hành vi quan trọng.
- Tạo được lớp dữ liệu đủ sạch để làm dashboard và phục vụ khoa học dữ liệu.

## 4.3. Mục tiêu tối ưu

- Tăng conversion rate
- Tăng add-to-cart rate
- Tăng checkout completion rate
- Giảm cart abandonment rate
- Tăng hiệu quả search và hiệu quả khám phá sản phẩm

## 5. Các khối chức năng bắt buộc của sản phẩm

## 5.1. Storefront

### Homepage

- Banner chính
- Khối sách nổi bật
- Khối sách bán chạy
- Khối sách theo danh mục
- Khối sách theo chủ đề / collection
- Điều hướng rõ ràng đến search, category, collection

### Listing / category / collection

- Duyệt sách theo category
- Duyệt sách theo collection
- Filter theo:
  - category
  - author
  - publisher
  - khoảng giá
  - availability status
- Sort theo:
  - nổi bật
  - bán chạy
  - mới nhất
  - giá tăng dần
  - giá giảm dần
- Phân trang bắt buộc
- Breadcrumb

### Search

- Tìm theo tên sách
- Tìm theo tác giả
- Tìm theo từ khóa
- Tìm theo nhà xuất bản
- Có no-result handling
- Có gợi ý sản phẩm liên quan nếu không có kết quả
- Lưu log từ khóa tìm kiếm phục vụ phân tích

### Product Detail Page

- Ảnh bìa
- Tên sách
- Tác giả
- Giá bán
- Giá niêm yết nếu có
- Phí ship hiển thị rõ
- Mô tả ngắn và mô tả chi tiết
- Metadata:
  - thể loại
  - nhà xuất bản
  - số trang
  - ngôn ngữ
  - ISBN nếu có
  - ngày xuất bản nếu có
- Tình trạng còn hàng / hết hàng
- Badge nổi bật / bán chạy / khuyến nghị
- CTA thêm vào giỏ
- CTA mua ngay
- Sách liên quan
- Sách thường mua cùng hoặc gợi ý thêm

## 5.2. Cart

- Tạo giỏ theo session
- Giữ giỏ cho guest user giữa các phiên
- Merge cart khi đăng nhập
- Tăng giảm số lượng
- Xóa sản phẩm
- Tính:
  - subtotal
  - shipping fee
  - total
- Hiển thị cảnh báo nếu sản phẩm hết hàng hoặc không thể mua

## 5.3. Checkout

- Guest checkout là luồng mặc định
- Logged-in checkout được hỗ trợ đầy đủ
- Form thông tin nhận hàng gồm:
  - họ tên
  - số điện thoại
  - địa chỉ
  - phường/xã
  - quận/huyện
  - tỉnh/thành
  - ghi chú đơn hàng
- Chọn phương thức thanh toán:
  - COD
  - chuyển khoản
- Trang summary cuối
- Xử lý submit an toàn bằng idempotency key
- Trang order success
- Hiển thị hướng dẫn chuyển khoản nếu chọn bank transfer

## 5.4. Account

- Đăng ký
- Đăng nhập
- Đăng xuất
- Xem hồ sơ cơ bản
- Xem lịch sử đơn hàng
- Xem chi tiết từng đơn hàng
- Theo dõi trạng thái đơn hàng

## 5.5. Quản trị catalog

- CRUD sách
- CRUD tác giả
- CRUD nhà xuất bản
- CRUD category
- CRUD collection
- Quản lý ảnh bìa
- Quản lý slug
- Quản lý badge
- Quản lý trạng thái:
  - draft
  - review
  - published
  - archived
- Quản lý availability status:
  - còn hàng
  - sắp hết
  - hết hàng

## 5.6. Quản trị đơn hàng

- Danh sách đơn hàng
- Lọc theo trạng thái đơn
- Lọc theo trạng thái thanh toán
- Tìm theo mã đơn
- Xem chi tiết đơn
- Cập nhật trạng thái đơn:
  - placed
  - awaiting_transfer
  - confirmed
  - packed
  - shipped
  - delivered
  - cancelled
- Hủy đơn
- Ghi nhận lý do hủy
- Xác nhận chuyển khoản
- Ghi chú vận hành nội bộ

## 5.7. Quản trị thanh toán

- Lưu payment record
- Xác nhận thanh toán chuyển khoản thủ công hoặc bán tự động
- Gắn bằng chứng thanh toán nếu cần
- Theo dõi trạng thái:
  - pending
  - awaiting_verification
  - paid
  - failed

## 5.8. Content ops và nhập dữ liệu

- Nhập sách thủ công
- Import dữ liệu từ nguồn crawl vào vùng staging
- Review dữ liệu trước publish
- Chuẩn hóa metadata trước khi publish
- Từ chối bản ghi không hợp lệ
- Mapping staged book sang book chính thức

## 5.9. Analytics và dashboard

### Event tracking bắt buộc

- page_view
- session_start
- view_homepage
- view_landing_page
- search
- view_search_results
- search_no_result
- select_search_result
- view_category
- view_collection
- apply_filter
- remove_filter
- apply_sort
- click_product_card
- view_item
- click_related_product
- add_to_cart
- remove_from_cart
- update_cart_quantity
- view_cart
- begin_checkout
- add_shipping_info
- select_payment_method
- checkout_error
- purchase
- payment_success
- payment_failed

### Dashboard bắt buộc

- Funnel homepage -> PDP -> cart -> checkout -> purchase
- Funnel search -> result -> PDP -> cart -> purchase
- Funnel checkout step-by-step
- Doanh thu theo ngày / tuần / tháng
- Tỷ lệ theo payment method
- Tỷ lệ theo device
- Tỷ lệ theo category
- Top books
- Top search terms
- No-result search terms
- Guest vs logged-in conversion

## 5.10. Khối khoa học dữ liệu

### Phase 1

- Bestseller ranking tự động
- Featured ranking bán tự động có hỗ trợ dữ liệu
- Search analytics
- Recommendation theo metadata + hành vi

### Phase 2

- Frequently viewed together
- Frequently bought together
- User segmentation theo hành vi
- RFM hoặc behavioral clustering
- Dự báo nhu cầu theo category / book

## 6. Các quy tắc nghiệp vụ cố định

- Tiền tệ thống nhất là VND
- Mọi giá trị tiền lưu dưới dạng integer
- Server là nguồn sự thật cho giá, shipping fee, subtotal, total
- Guest checkout phải luôn hoạt động
- COD và bank transfer đều phải hoạt động
- Order chỉ được tạo khi dữ liệu checkout hợp lệ
- Purchase event phải được phát từ backend
- Không đưa PII thô vào analytics
- Dữ liệu crawl không được publish trực tiếp, bắt buộc qua review
- Order item phải lưu snapshot tại thời điểm đặt hàng
- Hệ thống phải phân biệt được guest và logged-in user

## 7. Kiến trúc triển khai thống nhất

## 7.1. Kiến trúc tổng thể

- Kiến trúc: modular monolith
- Backend: Node.js + Express.js
- Database: PostgreSQL
- ORM: Prisma
- Session: express-session + connect-pg-simple
- Frontend server-rendered: EJS
- UI: Bootstrap 5
- Frontend interaction: Vanilla JavaScript + Fetch API
- Analytics: GA4 + analytics relay nội bộ

## 7.2. Các module chính

- shared
- catalog
- search
- cart
- checkout
- auth
- analytics
- content-ops
- admin

## 7.3. Nguyên tắc kiến trúc

- Module-first
- Shared contracts cho enum, DTO, money rules, event taxonomy
- API nội bộ thống nhất theo `/api/v1`
- Phân tách rõ dữ liệu vận hành và dữ liệu phân tích
- Mọi rule tính tiền, order và payment xử lý server-side

## 8. Thiết kế dữ liệu thống nhất

## 8.1. Dữ liệu vận hành

- authors
- publishers
- categories
- books
- book_categories
- collections
- collection_items
- users
- sessions
- carts
- cart_items
- checkout_attempts
- orders
- order_addresses
- order_items
- payment_records
- content_import_jobs
- staged_books

## 8.2. Dữ liệu analytics

- analytics_event_outbox
- fact_sessions
- fact_search
- fact_product_views
- fact_cart_events
- fact_checkout_events
- fact_orders

## 8.3. Dữ liệu khoa học dữ liệu

- feature_user_behavior
- feature_book_popularity
- feature_search_terms
- recommendation_candidates

## 9. Interfaces và API chính thức

## Catalog

- `GET /api/v1/home`
- `GET /api/v1/books`
- `GET /api/v1/books/{slug}`
- `GET /api/v1/search`
- `GET /api/v1/categories`
- `GET /api/v1/categories/{slug}`
- `GET /api/v1/collections/{slug}`

## Cart

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/{itemId}`
- `DELETE /api/v1/cart/items/{itemId}`
- `POST /api/v1/cart/recalculate`
- `POST /api/v1/cart/merge`

## Checkout / Order

- `POST /api/v1/checkout/start`
- `POST /api/v1/checkout/shipping-info`
- `POST /api/v1/checkout/payment-method`
- `GET /api/v1/checkout/summary`
- `POST /api/v1/orders`
- `GET /api/v1/orders/{orderNumber}`
- `POST /api/v1/orders/{orderNumber}/cancel`
- `POST /api/v1/orders/{orderNumber}/bank-transfer/mark-received`

## Auth / Account

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/account/orders`

## Analytics

- `POST /api/v1/analytics/events`
- `POST /api/v1/analytics/identify`
- `POST /api/v1/analytics/flush-critical`

## Admin

- CRUD books
- CRUD authors
- CRUD publishers
- CRUD categories
- CRUD collections
- order management endpoints
- content import and review endpoints

## 10. Trải nghiệm người dùng bắt buộc

- Thời gian tải nhanh trên mobile
- Search phải phản hồi tốt
- Không để tổng tiền chỉ xuất hiện ở bước cuối
- Không bắt buộc tạo tài khoản trước khi mua
- Có trang giới thiệu, liên hệ, giao hàng, đổi trả, thanh toán, privacy, cookie
- Có tín hiệu tin cậy rõ ràng ở PDP và checkout

## 11. NFR bắt buộc

## Performance

- LCP mobile p75 < 2.5s cho homepage, listing, PDP
- Search/listing API p95 < 500ms
- Cart/checkout API p95 < 700ms

## Security

- HTTPS
- Secure HttpOnly cookies
- CSRF protection
- Rate limit
- Password hash mạnh
- RBAC cho admin
- Không rò PII vào analytics

## Observability

- Structured logs
- request_id, session_id, cart_id, order_id
- Metrics cho API latency, error rate, no-result search, checkout errors
- Alert cho giảm purchase, tăng checkout_error, lỗi analytics delivery

## Privacy

- Consent banner
- Cookie/privacy policy
- Tracking theo consent policy

## 12. Các phần không triển khai ở giai đoạn đầu

Những phần sau **không phải trọng tâm của lần triển khai sản phẩm đầu tiên**, nhưng có thể bổ sung sau khi hệ thống cốt lõi ổn định:

- app mobile native
- loyalty nâng cao
- voucher engine phức tạp
- attribution đa kênh
- A/B testing nâng cao
- microservices

Lưu ý:

- Chúng không bị loại bỏ khỏi tầm nhìn dài hạn.
- Chúng chỉ không được phép làm chậm việc hoàn thành sản phẩm cốt lõi.

## 13. Tiêu chí xác nhận đã triển khai xong sản phẩm

Sản phẩm được xem là hoàn thành khi:

### Về nghiệp vụ

- người dùng có thể mua hàng trọn luồng
- admin có thể quản trị sách và đơn hàng
- thanh toán COD và chuyển khoản hoạt động

### Về dữ liệu

- event tracking hoạt động đúng taxonomy
- dashboard funnel hoạt động
- dashboard doanh thu hoạt động
- analytics phản ánh được hành vi user

### Về hệ thống

- database schema ổn định
- API ổn định
- lỗi chính có logging
- có kiểm thử các luồng cốt lõi

### Về khoa học dữ liệu

- có ít nhất 1 recommendation flow
- có bestseller ranking tự động
- có search analytics usable

## 14. Hướng triển khai từ tài liệu này

Mọi kế hoạch tiếp theo phải được xây dựa trên 4 nhóm ưu tiên:

1. Commerce core hoàn chỉnh
2. Admin và vận hành nội bộ
3. Analytics và dashboard
4. Recommendation và khoa học dữ liệu

Nếu cần chia roadmap hoặc backlog, chỉ được chia theo thứ tự trên, không quay lại tư duy cắt scope về MVP.
