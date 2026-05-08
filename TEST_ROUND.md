# Test Round Guide

## Mục tiêu

Vòng này dùng để chạy `pre-release regression` trên local cho app SPA + backend Node/Express.

## Điều kiện trước khi chạy

- DB local đã sẵn sàng.
- Seed đã được nạp nếu cần: `npm run prisma:seed`
- Không có process nào đang giữ cổng `3000` khi chạy `test:part6`, `test:part7`, `test:part8`, hoặc `test:acceptance`.

## Lệnh nên dùng

### 1. Gate kỹ thuật

```bash
npm run test:preflight
```

Lệnh này sẽ:
- kiểm tra cổng `3000` đang trống
- chạy `npm run build`
- chạy `npm run test`
- chạy `npm run prisma:generate`

### 2. Automated regression

```bash
npm run test:acceptance
```

Hoặc chạy từng phần:

```bash
npm run test:part6
npm run test:part7
npm run test:part8
```

Nếu runner báo:

- `Port 3000 is already in use`

thì đó là guard môi trường hoạt động đúng. Hãy dừng mọi app/server đang chạy trên `3000` rồi chạy lại.

### 3. Smoke local khi đang bật app dev

```bash
npm run dev
```

Ở terminal khác:

```bash
npm run test:smoke
```

Nếu `test:smoke` báo nội dung HTML lạ không thuộc Bookverse, nghĩa là cổng `3000` đang trỏ sang app khác. Hãy dừng app đó và bật lại đúng server của repo này.

## Tài khoản seed để test tay

- Admin:
  - `admin@bookverse.local`
  - `Admin@123456`
- Customer:
  - `customer@bookverse.local`
  - `Customer@123456`

## Checklist test tay

### Guest storefront

- Mở `/`
- Mở `/books`
- Mở một route sâu như `/books/mat-biec`
- Tìm kiếm có kết quả và no-result ở `/search`
- Add to cart, update quantity, remove item
- Checkout COD hoàn chỉnh
- Checkout bank transfer hoàn chỉnh
- Reopen order detail bằng session guest đúng

### Authenticated customer

- Đăng ký account mới
- Đăng nhập/đăng xuất
- Merge cart sau login
- Xem `/account`
- Xem `/account/orders`
- Xem `/account/orders/:orderNumber`
- Xác nhận user khác không xem được order không thuộc mình

### Admin

- Đăng nhập admin
- Mở `/admin`
- Mở `/admin/catalog`
- Mở `/admin/content-ops`
- Tạo author nhanh
- Chạy flow import -> normalize -> approve -> publish

### Negative/security

- Guest vào `/account` phải bị redirect login
- Guest gọi `/api/v1/account/orders` phải `401`
- User thường vào admin phải bị chặn đúng
- Mutation thiếu/sai CSRF phải fail đúng

## File log cần xem khi test fail

- `tests/manual/part6-selftest-server.log`
- `tests/manual/part7-selftest-server.log`
- `tests/manual/part8-selftest-server.log`

## Ghi chú vận hành

- Nếu thấy `EADDRINUSE`, `ECONNRESET`, hoặc `Server did not become healthy within 60000ms`, kiểm tra lại xem có process nào đang chạy trên cổng `3000` trước khi kết luận là bug app.
- Các runner acceptance hiện đã có guard cổng `3000`, nên lỗi môi trường sẽ báo sớm và rõ hơn.
- Khi muốn chạy nhiều lớp test:
  - `npm run test:preflight` hoặc `npm run test:acceptance` thì không chạy `npm run dev`
  - `npm run test:smoke` thì phải chạy cùng `npm run dev`
