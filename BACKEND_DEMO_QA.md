# Backend Demo Q&A

Tai lieu nay dung de on truoc khi demo. Thu tu ben duoi duoc sap xep theo xac suat thay hoi, uu tien luong dat hang truoc, sau do moi sang admin.

## 1. Thay bam dat hang va hoi: "Toan bo logic backend cua use case dat hang chay nhu the nao?"

Tra loi ngan gon:
Backend chia luong dat hang thanh 4 buoc ro rang:
- gio hang
- bat dau checkout
- luu thong tin giao hang va phuong thuc thanh toan
- tao order

Tra loi chi tiet:
Request vao app tai `src/app.ts`, di qua session, request context, auth context, CSRF, sau do moi vao router nghiep vu. Diem moc chinh:
- `src/app.ts:57` session PostgreSQL
- `src/app.ts:78` request context
- `src/app.ts:81` auth context
- `src/app.ts:123` rate limit cho `/api`
- `src/app.ts:124` CSRF protection
- `src/modules/index.ts:12` mount cac module vao `/api/v1`

Luong dat hang API:
- xem gio hang: `src/modules/cart/index.ts:166`
- add vao gio hang: `src/modules/cart/index.ts:179`
- cap nhat so luong: `src/modules/cart/index.ts:198`
- tinh lai gio hang: `src/modules/cart/index.ts:230`
- start checkout: `src/modules/checkout/index.ts:269`
- luu shipping: `src/modules/checkout/index.ts:272`
- luu payment method: `src/modules/checkout/index.ts:275`
- xem summary: `src/modules/checkout/index.ts:278`
- place order: `src/modules/checkout/index.ts:281`

Phan service xu ly nghiep vu:
- cart service: `src/modules/cart/cart.service.ts:62`
- checkout service: `src/modules/checkout/checkout.service.ts:123`

Y tuong kien truc:
- router chi nhan request, parse input, goi service
- service xu ly business logic
- repository moi la lop cham DB
- cac thao tac quan trong nhu tao order duoc chay trong transaction

## 2. Thay hoi: "Tai sao gia va tong tien khong tinh o frontend ma tinh o backend?"

Tra loi:
Gia, phi ship, subtotal, total deu tinh o backend de tranh gian lan va tranh sai lech du lieu giua client va database.

Bang chung:
- ham tinh tong tien nam o `src/modules/cart/cart.logic.ts:60`
- ham merge va chuan hoa gio hang nam o `src/modules/cart/cart.logic.ts:100`
- service moi lan add, update, remove, recalculate deu goi lai phan tinh toan server-side:
  - add item: `src/modules/cart/cart.service.ts:363`
  - update quantity: `src/modules/cart/cart.service.ts:453`
  - remove item: `src/modules/cart/cart.service.ts:516`
  - recalculate: `src/modules/cart/cart.service.ts:570`
  - luu ket qua vao DB: `src/modules/cart/cart.service.ts:229`

Logic cu the:
- `calculateCartTotals` tinh `itemCount`, `subtotalAmount`, `shippingFeeAmount`, `totalAmount`
- `shippingFeeAmount` duoc lay theo max shipping fee cua cac item trong gio
- `mergeCartSnapshots` tu cat bot item het hang va giam quantity neu vuot ton kho

Noi rat de nho khi demo:
"Frontend chi hien thi. Backend moi la noi quyet dinh so tien cuoi cung."

## 3. Thay hoi: "Khi bam Add to cart thi backend lam nhung gi?"

Tra loi:
Backend khong chi insert 1 dong vao cart item. No con:
- xac dinh cart hien tai theo session hoac user
- kiem tra sach co ton tai va dang duoc publish khong
- kiem tra co con mua duoc khong
- merge lai so luong neu sach da co san trong gio
- recalculate toan bo gio hang
- luu analytics event

Bang chung:
- route add cart: `src/modules/cart/index.ts:179`
- parse payload: `src/modules/cart/cart.query.ts:55`
- service addItem: `src/modules/cart/cart.service.ts:363`
- kiem tra sach publish: `src/modules/cart/cart.service.ts:382`
- kiem tra con mua duoc: `src/modules/cart/cart.service.ts:391`
- merge cart snapshot: `src/modules/cart/cart.service.ts:413`
- persist cart sau khi tinh lai: `src/modules/cart/cart.service.ts:427`
- analytics `ADD_TO_CART`: `src/modules/cart/cart.service.ts:429`

Neu thay hoi sau khi add ma het hang thi sao:
- backend nem `AppError` voi code `BOOK_UNAVAILABLE`
- vi logic kiem tra nam o `src/modules/cart/cart.service.ts:391`

## 4. Thay hoi: "He thong biet gio hang cua guest va cua user bang cach nao?"

Tra loi:
He thong uu tien dinh danh gio hang bang `cartId`, `sessionId`, va `userId`. Nghia la guest van co gio hang rieng theo session, dang nhap xong thi co the merge vao gio hang cua user.

Bang chung:
- session duoc tao trong `src/app.ts:57`
- request context co `sessionId` trong `src/shared/middleware/request-context.ts:12`
- auth context duoc do tu session tai `src/shared/middleware/auth-context.ts:7`
- service tim hoac tao gio hang tai `src/modules/cart/cart.service.ts:165`
- merge cart sau login tai `src/modules/cart/cart.service.ts:598`

Logic:
- neu co `existingCartId` thi tim cart do
- neu da login thi uu tien cart theo `userId`
- neu la guest thi tim theo `sessionId`
- neu khong co thi tao cart moi

## 5. Thay hoi: "Khi bat dau checkout thi backend lam gi?"

Tra loi:
Checkout khong tao order ngay. Backend tao hoac tai lai mot `checkoutAttempt`, recalculate lai cart, va ghi analytics `BEGIN_CHECKOUT`.

Bang chung:
- route start checkout: `src/modules/checkout/index.ts:269`
- service `startCheckout`: `src/modules/checkout/checkout.service.ts:378`
- dam bao cart hop le: `src/modules/checkout/checkout.service.ts:145`
- recalculate cart truoc checkout: `src/modules/checkout/checkout.service.ts:180`
- tao hoac lay checkout attempt: `src/modules/checkout/checkout.service.ts:300`
- analytics `BEGIN_CHECKOUT`: `src/modules/checkout/checkout.service.ts:425`
- bang du lieu checkout attempt: `prisma/schema.prisma:366`

Y nghia:
`CheckoutAttempt` la buoc trung gian giup luu trang thai checkout truoc khi order duoc tao that su.

## 6. Thay hoi: "Thong tin giao hang duoc validate o dau?"

Tra loi:
Thong tin giao hang duoc validate o lop query + logic truoc khi luu DB.

Bang chung:
- parse payload: `src/modules/checkout/checkout.query.ts:70`
- validate va normalize shipping info: `src/modules/checkout/checkout.logic.ts:65`
- save vao checkout attempt: `src/modules/checkout/checkout.service.ts:460`

Nhung gi duoc kiem tra:
- ho ten bat buoc
- so dien thoai bat buoc va dung regex
- dia chi, ward, district, province bat buoc
- trim khoang trang
- gioi han do dai field

Neu sai:
- backend doi thanh `AppError`
- code loi la `INVALID_CHECKOUT_PAYLOAD`

## 7. Thay hoi: "Trang thai checkout thay doi the nao?"

Tra loi:
Backend dung mot state machine don gian cho checkout attempt.

Bang chung:
- ham xac dinh status: `src/modules/checkout/checkout.logic.ts:109`
- bang enum trong schema: `prisma/schema.prisma:366`

Thu tu:
- `STARTED`
- `SHIPPING_INFO_CAPTURED`
- `PAYMENT_METHOD_SELECTED`
- `READY_TO_PLACE`
- `COMPLETED`

Noi de nho:
"Chi khi da co shipping info va payment method thi moi duoc `READY_TO_PLACE` va sau do moi place order."

## 8. Thay hoi: "Khi bam dat hang thi backend chong submit trung lap bang cach nao?"

Tra loi:
Backend dung idempotency key de tranh tao 2 order cho cung 1 checkout attempt.

Bang chung:
- parse idempotency key: `src/modules/checkout/checkout.query.ts:102`
- tao key mac dinh: `src/modules/checkout/checkout.logic.ts:153`
- logic place order: `src/modules/checkout/checkout.service.ts:608`
- check order ton tai theo idempotency key: `src/modules/checkout/checkout.service.ts:618`
- check lai sau khi co checkout attempt that: `src/modules/checkout/checkout.service.ts:715`
- field DB: `prisma/schema.prisma:404`

Y nghia:
- neu client bam 2 lan
- backend se tra lai order cu thay vi tao order moi

## 9. Thay hoi: "Order duoc tao tu dau va backend luu nhung gi?"

Tra loi:
Order duoc tao tu checkout attempt sau khi backend xac nhan checkout da day du thong tin.

Bang chung:
- service `placeOrder`: `src/modules/checkout/checkout.service.ts:608`
- neu thieu thong tin thi bao `CHECKOUT_INCOMPLETE`: `src/modules/checkout/checkout.service.ts:670`
- xac dinh trang thai order ban dau: `src/modules/checkout/checkout.logic.ts:133`
- danh dau checkout completed: `src/modules/checkout/checkout.service.ts:737`
- danh dau cart da checked out: `src/modules/checkout/checkout.service.ts:751`
- tao analytics purchase: `src/modules/checkout/checkout.service.ts:753`
- tao fact order: `src/modules/checkout/checkout.service.ts:801`

Du lieu lien quan trong schema:
- `Order`: `prisma/schema.prisma:404`
- `PaymentRecord`: `prisma/schema.prisma:496`
- `FactCheckoutEvent`: `prisma/schema.prisma:709`
- `FactOrder`: `prisma/schema.prisma:733`

Neu thay hoi order luu gi:
- thong tin khach hang
- tong tien
- payment method
- shipping address
- tung item trong order
- payment records
- analytics / fact data

## 10. Thay hoi: "COD va chuyen khoan khac nhau o dau trong backend?"

Tra loi:
Khac nhau o trang thai order va payment ngay luc tao order.

Bang chung:
- logic phan nhanh COD/bank transfer: `src/modules/checkout/checkout.logic.ts:133`
- tao huong dan chuyen khoan: `src/modules/checkout/checkout.logic.ts:161`
- build bank transfer instruction cho trang order: `src/modules/checkout/checkout.service.ts:984`

Khac biet:
- COD:
  - order status ban dau la `PLACED`
  - payment status la `PENDING`
- Bank transfer:
  - order status ban dau la `AWAITING_TRANSFER`
  - payment status la `AWAITING_VERIFICATION`

## 11. Thay hoi: "Ai duoc xem va huy don hang?"

Tra loi:
Backend khong cho ai xem hoac huy order tuy y. No check viewer theo 3 truong hop:
- admin/co vai tro dac quyen
- user chu so huu order
- guest dung chinh session da tao order

Bang chung:
- xem order storefront: `src/modules/checkout/index.ts:156`
- huy order storefront: `src/modules/checkout/index.ts:175`
- phan quyen xem order: `src/modules/checkout/checkout.service.ts:1115`
- phan quyen huy order: `src/modules/checkout/checkout.service.ts:1146`

Logic:
- privileged role thi duoc xem
- authenticated owner thi duoc xem
- guest phai trung `sessionId`
- sai owner hoac sai session thi backend tra `ORDER_ACCESS_DENIED`

## 12. Thay hoi: "Analytics duoc ghi o nhung dau trong luong dat hang?"

Tra loi:
Analytics duoc ghi o nhieu diem trong suot commerce flow, khong phai chi den luc mua xong.

Bang chung:
- event cart: `src/modules/cart/cart.service.ts:123`
- event begin checkout: `src/modules/checkout/checkout.service.ts:425`
- event add shipping info: `src/modules/checkout/checkout.service.ts:490`
- event select payment method: `src/modules/checkout/checkout.service.ts:549`
- event purchase: `src/modules/checkout/checkout.service.ts:753`
- event payment success cho COD va bank transfer: `src/modules/checkout/checkout.service.ts:775`, `src/modules/checkout/checkout.service.ts:920`
- outbox schema: `prisma/schema.prisma:581`
- fact cart event: `prisma/schema.prisma:685`
- fact checkout event: `prisma/schema.prisma:709`
- fact order: `prisma/schema.prisma:733`

Noi de nho:
"He thong nay ghi ca operational data lan analytics data."

## 13. Thay hoi: "Neu request loi thi backend xu ly o dau?"

Tra loi:
Backend dung `AppError` de chuan hoa loi nghiep vu, va `errorHandler` de doi thanh JSON hoac page error.

Bang chung:
- `AppError`: `src/shared/errors/app-error.ts`
- error handler: `src/shared/middleware/error-handler.ts:26`
- not found handler: `src/shared/middleware/error-handler.ts:8`

Y nghia:
- loi business se co `statusCode`, `code`, `message`
- neu la `/api/...` thi tra JSON error
- neu la route page thi render trang loi

## 14. Thay hoi: "Du lieu vao duoc parse va validate theo kieu nao?"

Tra loi:
Moi module co lop `query.ts` rieng de parse request body/query, khong de route va service tu lay truc tiep raw input.

Bang chung:
- cart query: `src/modules/cart/cart.query.ts:55`
- checkout query: `src/modules/checkout/checkout.query.ts:70`
- admin query: `src/modules/admin/admin.query.ts:285`

Vi du:
- add cart parse o `src/modules/cart/cart.query.ts:55`
- shipping info parse o `src/modules/checkout/checkout.query.ts:70`
- place order parse o `src/modules/checkout/checkout.query.ts:102`
- create/update book parse o `src/modules/admin/admin.query.ts:373`
- import payload parse o `src/modules/admin/admin.query.ts:497`

## 15. Thay hoi: "Admin vao duoc backend bang cach nao? Role va permission check o dau?"

Tra loi:
Admin khong chi check dang nhap. Backend check ca role va permission.

Bang chung:
- auth context middleware: `src/shared/middleware/auth-context.ts:7`
- RBAC helper: `src/shared/security/rbac.ts:11`
- require authenticated user: `src/shared/security/rbac.ts:15`
- require admin permission: `src/shared/security/rbac.ts:34`
- admin storefront gate: `src/modules/admin/index.ts:56`

Logic:
- role admin hop le gom `ADMIN`, `CONTENT_EDITOR`, `OPS`
- sau do co the yeu cau them permission cu the nhu:
  - `CATALOG_MANAGE`
  - `CONTENT_REVIEW`
  - `ORDER_MANAGE`

## 16. Thay hoi: "Khi admin sua / tao sach thi backend lam gi?"

Tra loi:
Admin service khong update sach mot cach don gian. No validate consistency, check slug trung, check ISBN trung, sau do transaction de update sach va quan he category.

Bang chung:
- route tao book: `src/modules/admin/index.ts:283`
- route update status book: `src/modules/admin/index.ts:308`
- parse payload sach: `src/modules/admin/admin.query.ts:373`
- service tao book: `src/modules/admin/admin.service.ts:832`
- service update book: `src/modules/admin/admin.service.ts:907`
- service update status book: `src/modules/admin/admin.service.ts:983`

Logic quan trong:
- slug phai unique
- ISBN phai unique
- `compareAtAmount` khong duoc nho hon `priceAmount`
- neu sach publish thi phai co it nhat 1 category

Bang chung cho luat publish phai co category:
- `src/modules/admin/admin.service.ts:165`

## 17. Thay hoi: "Tai sao publish sach lai bat buoc phai co category?"

Tra loi:
Vi catalog storefront va bo loc du lieu phu thuoc rat manh vao category. Neu cho publish sach khong co category thi listing, filter, breadcrumb, va discovery se khong day du.

Bang chung:
- rule business: `src/modules/admin/admin.service.ts:165`
- listing category o catalog: `src/modules/catalog/catalog.service.ts:578`
- schema quan he sach - category: `prisma/schema.prisma:195`

## 18. Thay hoi: "Admin quan ly don hang nhu the nao?"

Tra loi:
Admin co 3 nhom thao tac lon:
- xem danh sach va chi tiet order
- doi trang thai order theo workflow hop le
- huy don hoac xac nhan da nhan chuyen khoan

Bang chung:
- route list orders: `src/modules/admin/index.ts:463`
- route order detail: `src/modules/admin/index.ts:472`
- route update status: `src/modules/admin/index.ts:481`
- route cancel: `src/modules/admin/index.ts:494`
- route mark transfer received: `src/modules/admin/index.ts:508`

Service:
- list orders: `src/modules/admin/admin.service.ts:537`
- get order: `src/modules/admin/admin.service.ts:547`
- update status: `src/modules/admin/admin.service.ts:561`
- cancel order: `src/modules/admin/admin.service.ts:605`
- mark transfer received: `src/modules/admin/admin.service.ts:637`

## 19. Thay hoi: "Order status co bi nhay tung khong?"

Tra loi:
Khong. Backend co rule transition ro rang.

Bang chung:
- bang transition: `src/modules/admin/admin.service.ts:119`
- check transition hop le: `src/modules/admin/admin.service.ts:246`
- update order status: `src/modules/admin/admin.service.ts:561`

Workflow:
- `PLACED` -> `CONFIRMED` -> `PACKED` -> `SHIPPED` -> `DELIVERED`
- co the `CANCELLED` o mot so buoc
- khong duoc nhay bat hop le, vi du tu `PLACED` len `SHIPPED`

Neu la bank transfer:
- truoc khi `CONFIRMED`, payment phai da `PAID`
- bang chung: `src/modules/admin/admin.service.ts:576`

## 20. Thay hoi: "Admin xac nhan da nhan tien chuyen khoan thi backend lam gi?"

Tra loi:
Admin khong update tay tung field o order. Admin service goi lai checkout service de di dung commerce flow.

Bang chung:
- route admin mark received: `src/modules/admin/index.ts:508`
- parse payload: `src/modules/admin/admin.query.ts:479`
- admin service mark received: `src/modules/admin/admin.service.ts:637`
- checkout service mark received: `src/modules/checkout/checkout.service.ts:893`

Logic:
- neu co `proofUrl` thi update vao payment record gan nhat
- sau do goi commerce flow de set payment success
- ghi admin log action
- ghi checkout analytics `PAYMENT_SUCCESS`

## 21. Thay hoi: "Content ops import -> normalize -> approve -> publish la gi?"

Tra loi:
Day la luong staging du lieu truoc khi dua sach vao catalog chinh. Muc tieu la tach du lieu nhap thap chat luong khoi bang `Book` san xuat.

Bang chung:
- import jobs schema: `prisma/schema.prisma:521`
- staged book schema: `prisma/schema.prisma:545`
- import route: `src/modules/admin/index.ts:385`
- normalize route: `src/modules/admin/index.ts:410`
- approve route: `src/modules/admin/index.ts:422`
- reject route: `src/modules/admin/index.ts:434`
- publish route: `src/modules/admin/index.ts:451`

Service:
- import staged books: `src/modules/content-ops/content-ops.service.ts:191`
- normalize: `src/modules/content-ops/content-ops.service.ts:286`
- approve: `src/modules/content-ops/content-ops.service.ts:326`
- reject: `src/modules/content-ops/content-ops.service.ts:360`
- publish: `src/modules/content-ops/content-ops.service.ts:389`

## 22. Thay hoi: "Normalize staged book cu the la lam gi?"

Tra loi:
Normalize la chuan hoa du lieu staging thanh payload co the dua vao catalog:
- tao slug
- compact text
- chuan hoa keywords
- gan publish status / availability status mac dinh
- gan shipping fee
- gan inventory mac dinh

Bang chung:
- `slugify`: `src/modules/content-ops/content-ops.service.ts:23`
- `toNormalizedPayload`: `src/modules/content-ops/content-ops.service.ts:47`
- normalize staged book: `src/modules/content-ops/content-ops.service.ts:286`

## 23. Thay hoi: "Publish staged book vao catalog backend xu ly the nao?"

Tra loi:
Khi publish, backend:
- chi cho publish neu record da approve
- tim sach ton tai theo `mappedBookId`, `isbn`, hoac `slug`
- tu tao author/publisher neu chua co
- update sach cu hoac tao sach moi
- danh dau staged book da `PUBLISHED`

Bang chung:
- rule chi publish khi approved: `src/modules/content-ops/content-ops.service.ts:402`
- tim sach cu: `src/modules/content-ops/content-ops.service.ts:429`
- tao author/publisher neu chua co: `src/modules/content-ops/content-ops.service.ts:453`
- create/update book tu staged data: `src/modules/content-ops/content-ops.service.ts:470`
- update staged book sau publish: `src/modules/content-ops/content-ops.service.ts:513`

## 24. Thay hoi: "Search backend dang lam theo kieu gi?"

Tra loi:
Search dung rule-based ranking, khong phai full-text engine rieng. Backend tim candidate bang Prisma, sau do score tren title, slug, author, publisher, keyword, description.

Bang chung:
- route search API: `src/modules/search/index.ts:32`, `src/modules/search/index.ts:44`, `src/modules/search/index.ts:53`
- service search: `src/modules/search/search.service.ts:520`
- where search chinh: `src/modules/search/search.service.ts:180`
- ham score book: `src/modules/search/search.service.ts:356`
- lay search result: `src/modules/search/search.service.ts:718`
- suggestion: `src/modules/search/search.service.ts:931`

Noi de nho:
"Backend tim candidate bang query, roi tu xep hang bang luat nghiep vu."

## 25. Thay hoi: "Backend co transaction khong, va dung o dau?"

Tra loi:
Co. Cac flow thay doi du lieu nhieu bang deu dung transaction.

Bang chung:
- helper transaction: `src/shared/database/repository.ts:51`
- prisma client: `src/infra/database/prisma.ts:13`
- pg pool: `src/infra/database/pg.ts:7`

Noi dung dung transaction ro nhat:
- cart service: add, update, remove, merge
- checkout service: place order, cancel order, mark bank transfer received
- admin service: create/update book, create/update collection
- content ops service: import, normalize, approve, publish

## 26. Thay hoi: "Session, auth context, request context khac nhau the nao?"

Tra loi:
- session la du lieu luu dai hon cho user/session
- auth context la thong tin dang nhap da duoc backend chuan hoa de route dung ngay
- request context la metadata phuc vu trace va log cua tung request

Bang chung:
- session setup: `src/app.ts:57`
- request context: `src/shared/middleware/request-context.ts:12`
- auth context: `src/shared/middleware/auth-context.ts:7`
- view locals: `src/shared/middleware/locals.ts:5`

## 27. Thay hoi: "Neu toi can noi 1 cau tong ket kien truc backend cua de tai nay thi noi sao?"

Tra loi goi y:
"Backend cua em duoc to chuc theo kieu modular monolith. Moi tinh nang co router, query parser, service va repository rieng. Session, auth, CSRF, validation, analytics va transaction deu duoc xu ly o server. Vi vay frontend chu yeu hien thi, con business logic va tinh dung du lieu nam o backend."

## 28. Cac cau hoi phu nhung van de bi hoi

1. "Health check o dau?"
- `src/app.ts:90`

2. "CSRF token o dau?"
- token route: `src/app.ts:107`
- csrf middleware: `src/shared/security/csrf.ts`

3. "Rate limit o dau?"
- `src/shared/middleware/rate-limit.ts`
- mount o `src/app.ts:123`

4. "Auth me o dau?"
- route: `src/modules/auth/index.ts:328`
- service: `src/modules/auth/auth.service.ts:169`

5. "Profile update o dau?"
- route: `src/modules/auth/index.ts:396`
- service: `src/modules/auth/auth.service.ts:206`

6. "Catalog detail lay o dau?"
- route: `src/modules/catalog/index.ts:140`
- service: `src/modules/catalog/catalog.service.ts:884`

## 29. Cach tra loi khi thay hoi bat ngo trong luc demo

Mau tra loi 3 buoc:

Buoc 1:
"Request nay backend vao qua router cua module X."

Buoc 2:
"Sau do payload duoc parse o file query, business logic nam trong service, va DB duoc cap nhat qua repository."

Buoc 3:
"Neu thay muon em mo code, em se mo file router truoc, roi sang service la thay ro nhat."

Mau ung dung:
"Vi du voi dat hang, em se mo `src/modules/checkout/index.ts` truoc, sau do mo `src/modules/checkout/checkout.service.ts`, va neu can kiem tra trang thai/validate thi mo them `src/modules/checkout/checkout.logic.ts` va `src/modules/checkout/checkout.query.ts`."
