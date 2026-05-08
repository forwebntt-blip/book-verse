# Backend Test Plan

## Muc tieu

Tai lieu nay dung lam baseline kiem thu backend-only cho roadmap Phan 1 den Phan 8 trong [kehoach_trien_khai_chi_tiet.md](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\kehoach_trien_khai_chi_tiet.md).

Phan frontend/EJS/SPA da duoc bo qua co chu dich. Muc tieu hien tai la:

- xac nhan backend commerce core da chay on
- xac nhan auth, cart, checkout, admin, content ops da pass regression
- chot contract API thuc te de lam SPA moi sau nay

## Trang thai hien tai

Ket qua kiem thu da chay tren repo:

- `npm run build` -> pass
- `npm run test` -> pass
- `npm run test:preflight` -> pass
- `npm run test:part1-5` -> pass
- `npm run test:part6` -> pass
- `npm run test:part7` -> pass
- `npm run test:part8` -> pass

Tom tat theo roadmap:

| Phan | Noi dung backend-only | Trang thai |
|---|---|---|
| 1 | Nen tang he thong, security, session, logging | PASS |
| 2 | Schema commerce + analytics + seed | PASS |
| 3 | Catalog API | PASS |
| 4 | Search + suggestions + no-result handling | PASS |
| 5 | Cart + pricing server-side | PASS |
| 6 | Checkout + order + payment flow | PASS |
| 7 | Auth + account + self-service | PASS |
| 8 | Admin catalog + content ops | PASS |

## Cach chay nhanh

### Gate co ban

```bash
npm run test:preflight
```

### Regression day du Phan 1-8

```bash
npm run test:acceptance
```

### Chay tung cum

```bash
npm run test:part1-5
npm run test:part6
npm run test:part7
npm run test:part8
```

Luu y:

- khong chay song song cac self-test vi tat ca dung cong `3000`
- neu gap `Port 3000 is already in use`, dung moi process dang chiem cong truoc

## Test matrix theo Phan 1-8

### Phan 1. Nen tang he thong va shared contracts

Can xac minh:

- app boot duoc
- `GET /health` tra `success=true` va `data.status=ok`
- `GET /csrf-token` tra token hop le
- session middleware, auth context, request logging khong pha flow
- build TypeScript pass

Lenh:

```bash
npm run build
npm run test
npm run test:part1-5
```

Bang chung chinh:

- [src/app.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\app.ts)
- [src/server.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\server.ts)
- [src/shared/contracts/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\shared\contracts\index.ts)
- [tests/manual/part1-5-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part1-5-selftest.ts)

### Phan 2. Schema du lieu van hanh va analytics

Can xac minh:

- Prisma schema co du cac bang commerce va analytics can thiet
- seed tao du lieu catalog, user, order, staging
- outbox analytics nhan event thuc te tu catalog/search/cart/checkout
- order item snapshot va payment record duoc tao dung

Lenh:

```bash
npm run prisma:generate
npm run prisma:seed
npm run test:part1-5
npm run test:part6
npm run test:part8
```

Bang chung chinh:

- [prisma/schema.prisma](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\prisma\schema.prisma)
- [prisma/seed.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\prisma\seed.ts)

### Phan 3. Catalog storefront co ban, nhung test o muc backend API

Can xac minh:

- `GET /api/v1/home`
- `GET /api/v1/books`
- `GET /api/v1/books/:slug`
- `GET /api/v1/categories`
- `GET /api/v1/categories/:slug`
- `GET /api/v1/collections/:slug`

Checklist:

- listing co filter metadata va pagination hop le
- category/collection listing tra sach da publish
- product detail co gia, shipping fee, availability, related books

Lenh:

```bash
npm run test:part1-5
```

Bang chung chinh:

- [src/modules/catalog/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\catalog\index.ts)
- [src/modules/catalog/catalog.service.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\catalog\catalog.service.ts)

### Phan 4. Search va kham pha san pham

Can xac minh:

- `GET /api/v1/search?q=...`
- `GET /api/v1/search/suggestions?q=...`

Checklist:

- search theo title tra dung ket qua
- search theo author/publisher tra ket qua hop ly
- no-result co `emptyState`
- no-result co `suggestionSection`
- suggestion endpoint tra `query`, `queries`, `books`, hoac `topics`
- analytics co event `SEARCH`, `SEARCH_NO_RESULT`

Lenh:

```bash
npm run test:part1-5
```

Bang chung chinh:

- [src/modules/search/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\search\index.ts)
- [src/modules/search/search.service.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\search\search.service.ts)

### Phan 5. Cart va pricing engine

Can xac minh:

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart/items/:itemId`
- `POST /api/v1/cart/recalculate`
- `POST /api/v1/cart/merge`

Checklist:

- guest add item thanh cong
- quantity update dung
- pricing va total tinh server-side
- delete item thanh cong
- recalculate thanh cong
- merge cart sau login giu du item hop le
- analytics co `ADD_TO_CART`, `VIEW_CART`

Lenh:

```bash
npm run test
npm run test:part1-5
npm run test:part7
```

Bang chung chinh:

- [src/modules/cart/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\cart\index.ts)
- [src/modules/cart/cart.service.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\cart\cart.service.ts)

### Phan 6. Checkout, order va payment flow

Can xac minh:

- guest COD
- guest bank transfer
- logged-in checkout
- idempotency submit order
- mark bank transfer received
- owner cancel order
- block foreign guest/user cancel order
- analytics `BEGIN_CHECKOUT`, `ADD_SHIPPING_INFO`, `SELECT_PAYMENT_METHOD`, `PURCHASE`, `PAYMENT_SUCCESS`

Lenh:

```bash
npm run test:part6
```

Bang chung chinh:

- [src/modules/checkout/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\checkout\index.ts)
- [src/modules/checkout/checkout.service.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\checkout\checkout.service.ts)
- [tests/manual/part6-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part6-selftest.ts)

### Phan 7. Account va self-service

Can xac minh:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/account/orders`
- order ownership control
- merge cart sau login

Lenh:

```bash
npm run test:part7
```

Checklist:

- dang ky thanh cong
- duplicate register bi chan
- login sai mat khau tra `401`
- logout thanh cong
- guest khong vao duoc account order API
- user chi xem duoc don cua minh
- cart guest merge vao user cart

Bang chung chinh:

- [src/modules/auth/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\auth\index.ts)
- [tests/manual/part7-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part7-selftest.ts)

### Phan 8. Admin catalog va content ops

Can xac minh:

- admin authz
- CRUD author
- CRUD book
- list publishers/categories
- import staging
- normalize -> approve -> publish
- staged record map sang book chinh thuc

Lenh:

```bash
npm run test:part8
```

Checklist:

- guest vao `/admin` bi redirect
- admin login thanh cong
- `GET /api/v1/admin/books` co data
- `POST /api/v1/admin/authors` tao duoc author
- `POST /api/v1/admin/books` tao duoc book
- `POST /api/v1/admin/import-jobs` tao staging job
- normalize/approve/publish thanh cong

Bang chung chinh:

- [src/modules/admin/index.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\admin\index.ts)
- [src/modules/content-ops/content-ops.service.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\src\modules\content-ops\content-ops.service.ts)
- [tests/manual/part8-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part8-selftest.ts)

## Contract API thuc te hien tai

### Catalog

- `GET /api/v1/home`
- `GET /api/v1/books`
- `GET /api/v1/books/:slug`
- `GET /api/v1/categories`
- `GET /api/v1/categories/:slug`
- `GET /api/v1/collections/:slug`

### Search

- `GET /api/v1/search`
- `GET /api/v1/search/suggestions`

### Cart

- `GET /api/v1/cart`
- `POST /api/v1/cart/items`
- `PATCH /api/v1/cart/items/:itemId`
- `DELETE /api/v1/cart/items/:itemId`
- `POST /api/v1/cart/recalculate`
- `POST /api/v1/cart/merge`

### Auth / Account

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `GET /api/v1/account/orders`

### Checkout / Order

Route chuan hien tai:

- `POST /api/v1/checkout/start`
- `POST /api/v1/checkout/shipping-info`
- `POST /api/v1/checkout/payment-method`
- `GET /api/v1/checkout/summary`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:orderNumber`
- `POST /api/v1/orders/:orderNumber/cancel`
- `POST /api/v1/orders/:orderNumber/bank-transfer/mark-received`

Alias cu van duoc giu tam de tranh gay regression:

- `POST /api/v1/start`
- `POST /api/v1/shipping-info`
- `POST /api/v1/payment-method`
- `GET /api/v1/summary`

### Admin

- `GET /api/v1/admin/dashboard`
- `GET /api/v1/admin/books`
- `POST /api/v1/admin/books`
- `POST /api/v1/admin/books/:id`
- `POST /api/v1/admin/books/:id/status`
- `POST /api/v1/admin/books/:id/delete`
- `GET /api/v1/admin/authors`
- `POST /api/v1/admin/authors`
- `POST /api/v1/admin/authors/:id`
- `PATCH /api/v1/admin/authors/:id`
- `DELETE /api/v1/admin/authors/:id`
- `GET /api/v1/admin/publishers`
- `POST /api/v1/admin/publishers`
- `GET /api/v1/admin/categories`
- `POST /api/v1/admin/categories`
- `GET /api/v1/admin/collections`
- `POST /api/v1/admin/collections`
- `GET /api/v1/admin/import-jobs`
- `POST /api/v1/admin/import-jobs`
- `GET /api/v1/admin/staged-books`
- `POST /api/v1/admin/staged-books/:id/normalize`
- `POST /api/v1/admin/staged-books/:id/approve`
- `POST /api/v1/admin/staged-books/:id/reject`
- `POST /api/v1/admin/staged-books/:id/publish`

## Do lech giua spec va implementation hien tai

Day la cac diem nen uu tien chot truoc khi lam SPA moi:

- namespace checkout da duoc chuan hoa theo spec, nhung route cu van con la alias tam thoi
- can quyet dinh thoi diem xoa alias cu `/api/v1/start`, `/api/v1/shipping-info`, `/api/v1/payment-method`, `/api/v1/summary`
- analytics public ingestion API trong spec chua duoc implement thuc te o Phan 1-8; hien tai analytics duoc ghi noi bo qua outbox va domain flows

## De xuat cho vong tiep theo

Neu muc tieu la chuan bi cho SPA moi, nen lam theo thu tu nay:

1. Dong bang response shape cho catalog/search/cart/checkout/auth/admin.
2. Viet mot file OpenAPI hoac Markdown contract rut gon.
3. Xac dinh deadline de xoa alias checkout cu.
4. Chi sau do moi tao SPA de tranh sua API 2 lan.

## File can xem khi regression fail

- [tests/manual/part1-5-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part1-5-selftest.ts)
- [tests/manual/part6-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part6-selftest.ts)
- [tests/manual/part7-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part7-selftest.ts)
- [tests/manual/part8-selftest.ts](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\tests\manual\part8-selftest.ts)
- [scripts/test-runner-utils.mjs](D:\nguyentatthang\NttProjects\ThucTapCoSo\duan3\scripts\test-runner-utils.mjs)

## Lenh khuyen dung moi ngay

```bash
npm run test:preflight
npm run test:acceptance
```

Neu chi muon check backend sau mot thay doi nho:

```bash
npm run build
npm run test
```
