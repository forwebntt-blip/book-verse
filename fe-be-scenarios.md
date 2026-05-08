# Kich ban Frontend -> Backend cua du an

## Muc tieu cua tai lieu

Tai lieu nay dung de tra loi dang cau hoi:

- "Neu bam nut nay thi sau do code chay nhu the nao?"
- "Frontend goi vao dau?"
- "Backend di qua middleware nao, route nao, service nao, repository nao?"
- "Du lieu tra nguoc ve UI va render lai o dau?"

Tai lieu tap trung vao SPA trong `frontend/main.ts` va he thong API/route trong `src/`.

## 1. Ban do tong quan kien truc

### 1.1. Frontend

- FE entry: `frontend/main.ts:3202` -> `boot()`
- FE dang SPA TypeScript thuan, khong dung React/Vue.
- FE giu state trong bo nho qua `state` tao boi `createInitialState(...)`.
- FE gan event handler toan cuc trong `frontend/main.ts:2932` -> `installEventHandlers()`.
- FE dieu huong noi bo bang `loadRoute(...)` o `frontend/main.ts:2580`.
- FE goi API JSON bang `requestJson(...)` trong `frontend/app/network.ts`.

### 1.2. Backend

- BE entry: `src/server.ts`
- Tao app Express tai `src/app.ts`
- Middleware quan trong:
  - `src/app.ts:78` -> `requestContextMiddleware`
  - `src/app.ts:81` -> `authContextMiddleware`
  - `src/app.ts:118` -> `createSpaApiRouter()`
  - Sau do moi toi CSRF va cac router module
- API business chinh duoc mount qua `registerModuleRoutes(app)` trong `src/modules/index.ts`
- Du lieu DB di qua Prisma/Repository

### 1.3. Dong chay tong quat cua 1 thao tac SPA

1. User click / submit / input tren DOM.
2. `installEventHandlers()` bat su kien.
3. FE goi mot ham xu ly nhu `loadRoute`, `handleAuthForm`, `quickAddToCart`, `placeOrder`...
4. Ham xu ly goi `jsonFetch(...)` hoac `mutateJson(...)`.
5. Request vao Express, di qua middleware request context, auth context, rate limit, CSRF.
6. Route module bat request.
7. Route parse input, goi service.
8. Service goi repository/Prisma, co the ghi analytics, session, cart, order...
9. Route tra `successResponse(...)` ve FE.
10. FE cap nhat `state`, co the xoa cache route, set flash/toast, render lai UI bang `renderApp()`.

## 2. Cac diem neo quan trong de mo code

### 2.1. Frontend

- `frontend/main.ts:2580` -> `loadRoute(...)`
- `frontend/main.ts:2690` -> `handleAuthForm(...)`
- `frontend/main.ts:2715` -> `handleSearchForm(...)`
- `frontend/main.ts:2730` -> `handleCheckoutShipping(...)`
- `frontend/main.ts:2749` -> `handleCheckoutPayment(...)`
- `frontend/main.ts:2768` -> `quickAddToCart(...)`
- `frontend/main.ts:2798` -> `updateCartItem(...)`
- `frontend/main.ts:2821` -> `removeCartItem(...)`
- `frontend/main.ts:2852` -> `recalculateCart(...)`
- `frontend/main.ts:2869` -> `placeOrder(...)`
- `frontend/main.ts:2895` -> `cancelOrder(...)`
- `frontend/main.ts:2908` -> `createAdminAuthor(...)`
- `frontend/main.ts:2920` -> `runStagedAction(...)`
- `frontend/main.ts:2932` -> `installEventHandlers(...)`
- `frontend/main.ts:3202` -> `boot(...)`

### 2.2. SPA bridge / route-data

- `src/spa/app-router.ts:94` -> `GET /api/v1/app/bootstrap`
- `src/spa/app-router.ts:102` -> `GET /api/v1/app/route-data`
- `src/spa/route-data.ts:131` -> `buildSpaRouteData(...)`

### 2.3. Service chinh

- `src/modules/catalog/catalog.service.ts:335` -> `getHomePageData()`
- `src/modules/catalog/catalog.service.ts:524` -> `getListingPageData()`
- `src/modules/catalog/catalog.service.ts:830` -> `getBookDetailPageData()`
- `src/modules/search/search.service.ts:718` -> `getSearchPageData()`
- `src/modules/search/search.service.ts:931` -> `getSearchSuggestions()`
- `src/modules/cart/cart.service.ts:288` -> `getCartView()`
- `src/modules/cart/cart.service.ts:322` -> `getCartPageModel()`
- `src/modules/cart/cart.service.ts:363` -> `addItem()`
- `src/modules/cart/cart.service.ts:453` -> `updateItemQuantity()`
- `src/modules/cart/cart.service.ts:516` -> `removeItem()`
- `src/modules/cart/cart.service.ts:570` -> `recalculate()`
- `src/modules/cart/cart.service.ts:598` -> `mergeCarts()`
- `src/modules/checkout/checkout.service.ts:378` -> `startCheckout()`
- `src/modules/checkout/checkout.service.ts:460` -> `saveShippingInfo()`
- `src/modules/checkout/checkout.service.ts:519` -> `savePaymentMethod()`
- `src/modules/checkout/checkout.service.ts:577` -> `getCheckoutSummary()`
- `src/modules/checkout/checkout.service.ts:608` -> `placeOrder()`
- `src/modules/checkout/checkout.service.ts:814` -> `cancelOrder()`
- `src/modules/checkout/checkout.service.ts:893` -> `markBankTransferReceived()`
- `src/modules/checkout/checkout.service.ts:1115` -> `getOrderForViewer()`

## 3. Kich ban nen: app khoi dong va tai trang dau tien

### Muc dich

Giai thich luc user mo website thi SPA duoc dung len nhu the nao.

### Luong chay

1. Browser tai file JS da build tu `frontend/main.ts`.
2. `boot()` chay tai `frontend/main.ts:3202`.
3. `boot()` goi `renderApp()` de ve UI ban dau.
4. `boot()` goi `installEventHandlers()` de gan click/submit/input/popstate handlers.
5. `boot()` goi `refreshBootstrap()`.
6. `refreshBootstrap()` goi `GET /api/v1/app/bootstrap`.
7. Route backend o `src/spa/app-router.ts:94` xu ly.
8. Route goi `buildSpaBootstrap(...)`.
9. `buildSpaBootstrap(...)` lay:
  - thong tin user dang dang nhap qua `AuthService.getMe(...)`
  - flash message tu session
  - csrf token
  - `cartItemCount` trong session
10. Bootstrap JSON tra ve FE.
11. FE cap nhat `state.bootstrap`, cap nhat csrf token vao the `meta`.
12. Neu chua co `state.routeData` thi `boot()` goi `loadRoute(currentPath)`.
13. `loadRoute(...)` goi `GET /api/v1/app/route-data?path=...`.
14. Backend vao `src/spa/app-router.ts:102`.
15. Route nay goi `buildSpaRouteData(req, requestedPath)` tai `src/spa/route-data.ts:131`.
16. `buildSpaRouteData(...)` phan tich pathname roi dieu huong den service dung voi tung trang.
17. Payload route tra ve FE.
18. FE gan `state.routeData`, cache route, `history.pushState/replaceState` neu can, sau do `renderApp()`.

### Neu thay hoi "tai sao can 2 API bootstrap va route-data?"

- `bootstrap` chua thong tin chung cua app: user, quyen, cart badge, flash, csrf.
- `route-data` chua noi dung rieng cua trang hien tai.
- Tach 2 loai du lieu nay giup SPA doi route noi bo ma van co the refresh phan user/cart/flash rieng.

## 4. Kich ban dieu huong noi bo trong SPA

### Trigger

- Click vao link co `data-link`
- `popstate` khi bam back/forward
- FE chu dong goi `loadRoute(...)`

### Luong chay

1. User click link noi bo.
2. `installEventHandlers()` bat click.
3. Tim `closest("[data-link]")`.
4. Neu cung origin thi `preventDefault()`.
5. Goi `loadRoute(path)`.
6. `loadRoute(...)` kiem tra `RouteCache`.
7. Neu co cache con han:
  - lay routeData tu cache
  - pushState/replaceState
  - render ngay, khong goi backend
8. Neu khong co cache:
  - abort request route cu neu dang co
  - `state.loading = true`
  - render loading
  - goi `/api/v1/app/route-data?path=...`
9. Backend vao `buildSpaRouteData(...)`.
10. Tuan theo pathname:
  - `/` -> `CatalogService.getHomePageData()`
  - `/books` -> `CatalogService.getListingPageData()`
  - `/categories/:slug` -> `CatalogService.getListingPageData()`
  - `/collections/:slug` -> `CatalogService.getListingPageData()`
  - `/books/:slug` -> `CatalogService.getBookDetailPageData()`
  - `/search` -> `SearchService.getSearchPageData()`
  - `/cart` -> `CartService.getCartPageModel()`
  - `/checkout` -> `CheckoutService.startCheckout()`
  - `/orders/:orderNumber/success` -> `CheckoutService.getOrderForViewer()`
  - `/orders/:orderNumber` -> `CheckoutService.getOrderForViewer()`
  - `/login` -> `buildLoginPageModel()`
  - `/register` -> `buildRegisterPageModel()`
  - `/account` -> `buildAccountPageModel()`
  - `/account/orders` -> `buildAccountOrdersPageModel()`
  - `/account/orders/:orderNumber` -> `CheckoutService.getOrderForViewer()`
  - `/admin` -> `AdminService.buildDashboardPageModel()`
  - `/admin/catalog` -> `AdminService.buildCatalogPageModel()`
  - `/admin/content-ops` -> `ContentOpsService.buildContentOpsPageModel()`
11. FE nhan payload, ghi cache, cap nhat history, render lai app.

### Nhanh loi

- Neu API fail, FE tao route error va render trang loi noi bo.
- Neu request bi abort thi FE bo qua khong xu ly tiep.

## 5. Kich ban xem trang chu

### Trigger

- Mo `/`
- Hoac click link ve trang chu

### Luong FE -> BE

1. `loadRoute("/")`
2. `GET /api/v1/app/route-data?path=/`
3. `buildSpaRouteData(...)` gap `pathname === "/"`.
4. Goi `CatalogService.getHomePageData()` tai `src/modules/catalog/catalog.service.ts:335`.
5. Service goi repository de lay song song:
  - sach noi bat
  - sach ban chay
  - category
  - collection
  - tong so sach
6. Service map DB records thanh `ProductCardViewModel`.
7. Service tao payload gom:
  - banner
  - spotlightBook
  - featuredBooks
  - bestsellerBooks
  - categorySections
  - collectionSections
  - analytics
8. Payload tra ve FE.
9. FE `renderApp()` -> route `"home"` -> render hero, section sach, category, collection.

### Diem de chi trong code

- FE route load: `frontend/main.ts:2580`
- SPA route mapping: `src/spa/route-data.ts`
- Home data service: `src/modules/catalog/catalog.service.ts:335`

## 6. Kich ban xem danh muc sach / loc / sap xep

### Trigger

- Vao `/books`
- Vao `/categories/:slug`
- Vao `/collections/:slug`
- Submit form loc danh muc (`data-form="catalog-filters"`)

### Luong FE

1. User submit form filter.
2. `installEventHandlers()` bat `submit`.
3. `formKind === "catalog-filters"` -> goi `handleCatalogFilters(...)`.
4. `handleCatalogFilters(...)` build URL moi tu form.
5. Goi `loadRoute(nextPath)`.

### Luong BE

1. `GET /api/v1/app/route-data?path=/books?...` hoac `/categories/...` hoac `/collections/...`
2. `buildSpaRouteData(...)` phan nhanh theo pathname.
3. Goi `CatalogService.getListingPageData(scope, query)` tai `src/modules/catalog/catalog.service.ts:524`.
4. Service:
  - parse filter/sort/page
  - xac dinh `where` cho Prisma
  - dem tong sach
  - lay facet data de build bo loc
  - lay sach theo trang
  - build activeFilters, pagination, resultSummary
5. FE render lai listing page.

### Cac nhanh quan trong

- Neu category slug sai -> nem `CATEGORY_NOT_FOUND`
- Neu collection slug sai/khong publish -> nem `COLLECTION_NOT_FOUND`
- Neu khong co ket qua -> payload co `emptyState`

### Khi bi hoi "gia tri bo loc duoc tinh o FE hay BE?"

- FE chi dong vai tro gom input va doi URL.
- Toan bo ket qua filter, so trang, activeFilters, facet counts duoc tinh o service backend.

## 7. Kich ban xem chi tiet sach

### Trigger

- Click card sach trong home/listing/search
- Vao `/books/:slug`

### Luong

1. User click the sach `data-link`.
2. FE goi `loadRoute("/books/:slug...")`.
3. `buildSpaRouteData(...)` gap route chi tiet sach.
4. Goi `CatalogService.getBookDetailPageData(slug)` tai `src/modules/catalog/catalog.service.ts:830`.
5. Service:
  - lay sach theo slug
  - neu khong ton tai -> `BOOK_NOT_FOUND`
  - tim `primaryCategory`
  - tim sach lien quan theo author/category
  - map thanh detail payload + relatedBooks
6. Neu URL co `searchLogId` va `searchRank`, `buildSpaRouteData(...)` con goi `captureSearchSelectionFromPath(...)`.
7. Ham nay dung `SearchService.captureSearchSelection(...)` de ghi nhan user da chon ket qua tim kiem.
8. FE render trang detail.

### Ghi chu

- Day la vi du dep de giai thich "1 click tren card sach co the vua lay detail vua ghi analytics tim kiem".

## 8. Kich ban tim kiem sach

### 8.1. Go tu khoa de lay suggestion

#### Trigger

- User go vao o search co `data-search-input`

#### Luong

1. `input` event bi bat trong `installEventHandlers()`.
2. FE cap nhat `state.searchDraft`.
3. FE debounce 220ms.
4. Goi `syncSearchSuggestions(query)` ben trong `frontend/main.ts`.
5. `syncSearchSuggestions(...)` goi `fetchSearchSuggestions(...)`.
6. `fetchSearchSuggestions(...)` goi `GET /api/v1/search/suggestions?q=...`.
7. Backend vao `src/modules/search/index.ts:44`.
8. Route goi `SearchService.getSearchSuggestions(query)` tai `src/modules/search/search.service.ts:931`.
9. Service:
  - parse query
  - tim candidate books
  - score/rank ket qua
  - tao `queries`, `books`, `topics`, `viewAllHref`
10. FE nhan response, cap nhat `state.searchSuggestions`, render dropdown suggestion.

### 8.2. Submit tim kiem

#### Trigger

- Submit form `data-form="search"`

#### Luong

1. `handleSearchForm(...)` tai `frontend/main.ts:2715`.
2. FE lay `q`, luu recent search vao `localStorage`.
3. FE goi `loadRoute("/search?q=...")`.
4. Backend vao `buildSpaRouteData(...)`, nhanh `pathname === "/search"`.
5. Goi `SearchService.getSearchPageData(...)` tai `src/modules/search/search.service.ts:718`.
6. Service:
  - neu khong co query -> tra trang search entry + suggestionSection
  - neu co query -> tim candidate
  - neu khong co exact result -> fallback term expansion
  - neu van khong co -> broad published search roi rescore
  - score tung sach
  - log search qua `searchRepository.createSearchLog(...)`
  - phan trang ket qua
  - tao suggestionSection va exploreLinks
7. FE render trang search ket qua.

### Nhanh can nho

- Search trong du an nay khong don gian chi la `LIKE`.
- No co:
  - chuan hoa query
  - fallback mode
  - scoring rule
  - logging search
  - logging search selection khi mo chi tiet sach tu ket qua search

## 9. Kich ban dang ky

### Trigger

- Submit form `data-form="register"`

### Luong FE

1. `installEventHandlers()` bat submit.
2. `formKind === "register"` -> `handleAuthForm(form, "register")`.
3. `handleAuthForm(...)` serialise form.
4. Goi `POST /api/v1/auth/register` qua `mutateJson(...)`.

### Luong BE

1. Route `src/modules/auth/index.ts:257`
2. Parse payload bang `parseRegisterPayload(...)`
3. Luu `previousCartId = req.session.cartId`
4. Goi `AuthService.register(payload)`
5. `await regenerateSession(req)` de tranh session fixation
6. `syncAuthenticatedSession(...)`
7. Trong `syncAuthenticatedSession(...)`:
  - luu `req.session.auth`
  - neu co cart cu truoc dang nhap thi goi `CartService.mergeCarts(...)`
8. `saveSession(req)`
9. Tra JSON user ve FE.

### Luong FE sau khi thanh cong

1. `clearRouteCache()`
2. `refreshBootstrap({ silent: true })`
3. set flash success
4. Xac dinh `returnTo` hoac mac dinh `/account`
5. `loadRoute(returnTo)`

### Diem can noi khi duoc hoi

- Dang ky khong chi tao user.
- No con:
  - tao session moi
  - dua user vao auth context
  - hop nhat guest cart neu co
  - refresh bootstrap de navbar, role, cart badge doi theo trang thai moi

## 10. Kich ban dang nhap

### Trigger

- Submit form `data-form="login"`

### Luong

1. FE vao `handleAuthForm(form, "login")` tai `frontend/main.ts:2690`.
2. Goi `POST /api/v1/auth/login`.
3. Backend vao `src/modules/auth/index.ts:285`.
4. Parse payload.
5. Ghi nho `previousCartId`.
6. Goi `AuthService.login(payload)`.
7. `regenerateSession(req)`.
8. `syncAuthenticatedSession(...)`.
9. Ben trong `syncAuthenticatedSession(...)`:
  - session auth moi duoc gan
  - merge cart guest vao cart user neu can bang `CartService.mergeCarts()` tai `src/modules/cart/cart.service.ts:598`
10. `saveSession(req)`.
11. Tra user JSON.
12. FE clear route cache, refresh bootstrap, set flash, load `/account` hoac `returnTo`.

### Nhanh loi

- Sai email/password -> `AuthService.login(...)` se throw, di vao error handler, FE hien toast danger.

## 11. Kich ban dang xuat

### Trigger

- Click button `data-action="logout"`

### Luong

1. FE vao `handleLogout()`.
2. Goi `POST /api/v1/auth/logout`.
3. Backend vao `src/modules/auth/index.ts:313`.
4. `regenerateSession(req)`.
5. `saveSession(req)`.
6. Tra `{ loggedOut: true }`.
7. FE clear route cache.
8. FE refresh bootstrap.
9. FE set flash success.
10. FE `loadRoute("/")`.

### Ghi chu

- Regenerate session khi logout cung quan trong de reset thong tin cu.

## 12. Kich ban them nhanh vao gio hang

### Trigger

- Click button `data-action="quick-add"` tren card sach

### Luong FE

1. Click bi bat trong `installEventHandlers()`.
2. Case `"quick-add"` -> `quickAddToCart(bookId)` tai `frontend/main.ts:2768`.
3. FE danh dau pending action.
4. FE tang tam `state.bootstrap.cartSummary.itemCount += 1` de tao cam giac nhanh.
5. `renderApp()`.
6. Goi `POST /api/v1/cart/items` voi `{ bookId, quantity: 1 }`.

### Luong BE

1. Route `src/modules/cart/index.ts:180`
2. Goi `CartService.addItem(...)` tai `src/modules/cart/cart.service.ts:363`
3. Service:
  - validate quantity
  - `ensureCartIdentity(...)` tim hoac tao cart theo `existingCartId`, `sessionId`, `userId`
  - lay book tu DB
  - check sach co ton tai, da publish, co the mua duoc
  - tron item vao danh sach hien tai
  - goi `mergeCartSnapshots(...)`
  - goi `persistRecalculatedCart(...)`
  - ghi analytics event `ADD_TO_CART`
4. Route sync lai `req.session.cartId` va `req.session.cartItemCount`
5. Route tra cart view model ve FE.

### Luong FE sau response

1. Neu fail:
  - giam lai cart badge da tang optimistic
  - show flash danger
2. Neu success:
  - `applyCartView(result.data)`
  - `routeCache.delete("/cart")`
  - flash success
  - render lai
  - them animation bounce cho cart badge

### Nhanh loi quan trong

- `BOOK_NOT_FOUND`
- `BOOK_UNAVAILABLE`

## 13. Kich ban cap nhat so luong gio hang

### Trigger

- Click button `data-action="cart-qty"` trong trang gio hang

### Luong

1. FE vao `updateCartItem(itemId, quantity)` tai `frontend/main.ts:2798`.
2. FE optimistic update so luong trong state cart hien tai.
3. Goi `PATCH /api/v1/cart/items/:itemId`.
4. Backend vao `src/modules/cart/index.ts:199`.
5. Goi `CartService.updateItemQuantity(...)` tai `src/modules/cart/cart.service.ts:453`.
6. Service:
  - `ensureCartIdentity(...)`
  - tim item theo `itemId`
  - validate quantity
  - tinh lai cart bang `mergeCartSnapshots(...)`
  - persist lai tong tien
  - ghi analytics `UPDATE_CART_QUANTITY`
7. FE:
  - neu fail -> rollback optimistic quantity cu
  - neu success -> `applyCartView(...)`, xoa cache `/cart`, flash success, render lai

## 14. Kich ban xoa san pham khoi gio hang

### Trigger

- Click `data-action="cart-remove"`

### Luong

1. FE confirm bang `window.confirm(...)`.
2. Neu dong y -> `removeCartItem(itemId)` tai `frontend/main.ts:2821`.
3. FE optimistic remove item khoi state.
4. Goi `DELETE /api/v1/cart/items/:itemId`.
5. Backend vao `src/modules/cart/index.ts:218`.
6. Goi `CartService.removeItem(...)` tai `src/modules/cart/cart.service.ts:516`.
7. Service:
  - `ensureCartIdentity(...)`
  - tim item
  - xoa item khoi DB
  - tinh lai cart
  - ghi analytics `REMOVE_FROM_CART`
8. FE:
  - neu fail -> goi lai `loadRoute("/cart", { force: true })` de dong bo
  - neu success -> `applyCartView(...)`, xoa cache `/cart`, flash success, render lai

## 15. Kich ban tinh lai gio hang

### Trigger

- Click `data-action="cart-recalculate"`

### Luong

1. FE vao `recalculateCart()` tai `frontend/main.ts:2852`.
2. Goi `POST /api/v1/cart/recalculate`.
3. Backend vao `src/modules/cart/index.ts:233`.
4. Goi `CartService.recalculate(...)` tai `src/modules/cart/cart.service.ts:570`.
5. Service dung `mergeCartSnapshots(...)` tren item hien co de:
  - loai item khong hop le
  - clamp quantity neu qua ton kho
  - tinh lai subtotal / shipping / total
6. Tra cart moi ve FE.
7. FE cap nhat cart view va render lai.

### Y nghia

- Day la nut "dong bo lai su that tu backend" cua gio hang.

## 16. Kich ban mo trang checkout

### Trigger

- Click link den `/checkout`

### Luong

1. FE `loadRoute("/checkout")`
2. Backend `buildSpaRouteData(...)` gap route `/checkout`
3. Goi `CheckoutService.startCheckout(...)` tai `src/modules/checkout/checkout.service.ts:378`
4. Service:
  - kiem tra phai co cart
  - cart khong rong
  - recalculate cart cho checkout qua `recalculateCartForCheckout(...)`
  - tim checkout attempt cu cho cart
  - neu khong co hoac da complete -> tao attempt moi
  - neu co attempt chua complete -> update amount, status
  - ghi analytics `BEGIN_CHECKOUT`
5. `req.session.checkoutAttemptId = attempt.id`
6. Build `CheckoutPageModel`
7. FE render trang checkout.

### Nhanh loi

- `CART_REQUIRED`
- `CART_NOT_FOUND`
- `CART_EMPTY`
- `CHECKOUT_CART_UNAVAILABLE`

## 17. Kich ban luu thong tin giao hang

### Trigger

- Submit form `data-form="checkout-shipping"`

### Luong FE

1. FE vao `handleCheckoutShipping(...)` tai `frontend/main.ts:2730`.
2. Goi `POST /api/v1/checkout/shipping-info`.

### Luong BE

1. Route `src/modules/checkout/index.ts:220`
2. Parse payload.
3. Goi `CheckoutService.saveShippingInfo(...)` tai `src/modules/checkout/checkout.service.ts:460`
4. Service:
  - tim checkout attempt hien tai
  - update cac field shipping
  - update status attempt dua theo shipping/payment da du chua
  - ghi analytics `ADD_SHIPPING_INFO`
5. Route sync `req.session.checkoutAttemptId`
6. Tra `checkout` view ve FE.

### Luong FE sau response

1. `applyCheckoutView(result.data)`
2. `routeCache.delete("/checkout")`
3. flash success
4. render lai

## 18. Kich ban chon phuong thuc thanh toan

### Trigger

- Submit form `data-form="checkout-payment"`

### Luong

1. FE vao `handleCheckoutPayment(...)` tai `frontend/main.ts:2749`.
2. Goi `POST /api/v1/checkout/payment-method`.
3. Backend vao `src/modules/checkout/index.ts:235`.
4. Goi `CheckoutService.savePaymentMethod(...)` tai `src/modules/checkout/checkout.service.ts:519`.
5. Service:
  - tim checkout attempt
  - update `paymentMethod`
  - update `status`
  - ghi analytics `SELECT_PAYMENT_METHOD`
6. FE `applyCheckoutView(...)`, xoa cache `/checkout`, flash success, render lai.

## 19. Kich ban dat hang

### Trigger

- Click `data-action="place-order"`

### Luong FE

1. FE vao `placeOrder(checkoutAttemptId, idempotencyKey)` tai `frontend/main.ts:2869`.
2. Goi `POST /api/v1/orders`.

### Luong BE

1. Route `src/modules/checkout/index.ts:268`
2. Goi `CheckoutService.placeOrder(...)` tai `src/modules/checkout/checkout.service.ts:608`.
3. Service rat quan trong, cac buoc chinh:
  - tao/kiem tra `idempotencyKey`
  - neu da ton tai order voi key nay -> tra lai order cu
  - tim checkout attempt
  - dam bao cart dung voi request
  - recalculate lai cart lan cuoi
  - cap nhat amount trong checkout attempt
  - check da du shipping info va payment method chua
  - neu chua du -> ghi checkout error va throw `CHECKOUT_INCOMPLETE`
  - tao order moi tu checkout
  - danh dau checkout attempt `COMPLETED`
  - danh dau cart `checked out`
  - ghi analytics `PURCHASE`
  - neu COD -> ghi them `PAYMENT_SUCCESS` dang pending-thu-tien-khi-giao
  - tao fact orders cho analytics
4. Route:
  - `req.session.lastPlacedOrderNumber = order.orderNumber`
  - clear `checkoutAttemptId`
  - `req.session.cartId = undefined`
  - `req.session.cartItemCount = 0`
5. Tra JSON order success ve FE.

### Luong FE sau response

1. `clearRouteCache()`
2. `state.bootstrap.cartSummary.itemCount = 0`
3. Neu co `orderNumber` -> `loadRoute("/orders/:orderNumber/success")`
4. FE render trang thanh cong dat hang.

### Nhanh loi quan trong

- `CHECKOUT_INCOMPLETE`
- `CART_EMPTY`
- `CART_NOT_FOUND`
- `idempotencyKey` giup click nhieu lan khong tao nhieu don

## 20. Kich ban xem trang dat hang thanh cong

### Trigger

- Sau khi dat hang thanh cong
- Vao `/orders/:orderNumber/success`

### Luong

1. FE `loadRoute(...)`
2. `buildSpaRouteData(...)` match regex `/orders/:orderNumber/success`
3. Goi `CheckoutService.getOrderForViewer(...)` tai `src/modules/checkout/checkout.service.ts:1115`
4. Service:
  - lay order
  - neu admin/content/ops -> xem duoc
  - neu customer dang nhap -> phai dung owner
  - neu guest -> phai dung `sessionId` tao don
  - neu khong dung -> `ORDER_ACCESS_DENIED`
5. Service build `OrderSuccessPageModel`
6. FE render trang thanh cong.

## 21. Kich ban xem chi tiet don hang

### Trigger

- Vao `/orders/:orderNumber`
- Hoac `/account/orders/:orderNumber`

### Luong

1. FE `loadRoute(...)`
2. `buildSpaRouteData(...)` match route order detail hoac account-order-detail
3. Goi `CheckoutService.getOrderForViewer(...)`
4. Backend verify quyen xem nhu kich ban tren
5. Build `OrderDetailPageModel`
6. FE render trang chi tiet don.

## 22. Kich ban huy don hang

### Trigger

- Click `data-action="cancel-order"`

### Luong FE

1. FE prompt ly do bang `window.prompt(...)`
2. Goi `POST /api/v1/orders/:orderNumber/cancel`
3. Backend vao `src/modules/checkout/index.ts:299`
4. Goi `CheckoutService.cancelOrderForViewer(...)` tai `src/modules/checkout/checkout.service.ts:1146`
5. Ham nay:
  - goi `getOrderForViewer(...)` de check quyen
  - neu hop le -> goi `cancelOrder(...)` tai `src/modules/checkout/checkout.service.ts:814`
6. `cancelOrder(...)`:
  - lay order
  - neu da cancel -> tra luon
  - cap nhat trang thai order
  - ghi analytics `CHECKOUT_ERROR` voi `ORDER_CANCELLED`
  - neu bank transfer chua thanh toan -> ghi them `PAYMENT_FAILED`
7. FE set flash success.
8. FE `loadRoute(window.location.pathname, { replace: true })` de refresh lai trang hien tai.

## 23. Kich ban vao trang tai khoan va lich su don

### Trigger

- Vao `/account`
- Vao `/account/orders`

### Luong

1. FE `loadRoute(...)`
2. `buildSpaRouteData(...)`
3. Neu `/account`:
  - goi `requireAuthenticatedUser(req)`
  - goi `buildAccountPageModel(userId)`
4. Neu `/account/orders`:
  - goi `requireAuthenticatedUser(req)`
  - goi `buildAccountOrdersPageModel(userId)`
5. Neu chua dang nhap -> throw `AUTH_REQUIRED`
6. FE render trang account hoac error/redirect logic phu thuoc flow.

## 24. Kich ban admin tao tac gia

### Trigger

- Submit form `data-form="admin-author"`

### Luong FE

1. FE vao `createAdminAuthor(form)` tai `frontend/main.ts:2908`.
2. Goi `POST /api/v1/admin/authors`.

### Luong BE

1. Route `src/modules/admin/index.ts:110`
2. `requireCatalogManage()` kiem tra permission
3. Parse payload bang `parseAuthorPayload(...)`
4. Lay actor user id
5. Goi `AdminService.createAuthor(...)`
6. Tao author trong DB
7. Tra author JSON ve FE

### Luong FE sau response

1. flash success
2. `loadRoute("/admin/catalog", { replace: true })`

### Neu thay hoi "permission kiem tra o dau?"

- O route layer, truoc khi vao service, qua `requireAdminPermission(...)` / `requireCatalogManage()`.

## 25. Kich ban admin xu ly sach staging: normalize / approve / publish

### Trigger

- Click:
  - `data-action="staged-normalize"`
  - `data-action="staged-approve"`
  - `data-action="staged-publish"`

### Luong FE

1. `runStagedAction(id, action)` tai `frontend/main.ts:2920`.
2. Goi:
  - `POST /api/v1/admin/staged-books/:id/normalize`
  - hoac `/approve`
  - hoac `/publish`

### Luong BE

- Normalize route: `src/modules/admin/index.ts:372`
- Approve route: `src/modules/admin/index.ts:384`
- Publish route: `src/modules/admin/index.ts:413`

Moi route deu:

1. Check permission `CONTENT_REVIEW`
2. Lay `stagedBookId`
3. Lay `reviewerUserId`
4. Goi `ContentOpsService` tuong ung:
  - `normalizeStagedBook(...)`
  - `approveStagedBook(...)`
  - `publishStagedBook(...)`
5. Tra record moi ve FE

### Luong FE sau response

1. flash success
2. `loadRoute("/admin/content-ops", { replace: true })`

## 26. Kich ban cua route-data cho cac trang quan trong

Day la bang nho de nho "path nao map vao service nao":

| Path | Noi backend xu ly |
|---|---|
| `/` | `CatalogService.getHomePageData()` |
| `/books` | `CatalogService.getListingPageData()` |
| `/categories/:slug` | `CatalogService.getListingPageData()` |
| `/collections/:slug` | `CatalogService.getListingPageData()` |
| `/books/:slug` | `CatalogService.getBookDetailPageData()` |
| `/search` | `SearchService.getSearchPageData()` |
| `/cart` | `CartService.getCartPageModel()` |
| `/checkout` | `CheckoutService.startCheckout()` |
| `/orders/:orderNumber/success` | `CheckoutService.getOrderForViewer()` + build success page |
| `/orders/:orderNumber` | `CheckoutService.getOrderForViewer()` + build detail page |
| `/login` | `buildLoginPageModel()` |
| `/register` | `buildRegisterPageModel()` |
| `/account` | `buildAccountPageModel()` |
| `/account/orders` | `buildAccountOrdersPageModel()` |
| `/account/orders/:orderNumber` | `CheckoutService.getOrderForViewer()` |
| `/admin` | `AdminService.buildDashboardPageModel()` |
| `/admin/catalog` | `AdminService.buildCatalogPageModel()` |
| `/admin/content-ops` | `ContentOpsService.buildContentOpsPageModel()` |

## 27. Middleware backend can thuoc long khi giai thich

Trong `src/app.ts`, request thuong di qua:

1. `helmet`
2. `compression`
3. `express.urlencoded`
4. `express.json`
5. `cookieParser`
6. `session(...)`
7. `requestContextMiddleware`
8. `requestLifecycleLogger`
9. `httpLoggerMiddleware`
10. `authContextMiddleware`
11. `viewLocalsMiddleware`
12. `express.static(...)`
13. `/api` rate limit
14. SPA API router
15. `csrfSynchronisedProtection`
16. storefront routers
17. module API routers `/api/v1/...`
18. `notFoundHandler`
19. `errorHandler`

## 28. Session duoc dung nhu the nao

Session trong du an nay rat quan trong. Nhung key chinh:

- `req.session.auth`: thong tin dang nhap
- `req.session.cartId`: cart hien tai
- `req.session.cartItemCount`: so item de hien cart badge
- `req.session.checkoutAttemptId`: checkout attempt dang lam do
- `req.session.lastPlacedOrderNumber`: don vua tao
- `req.session.flash`: thong diep 1 lan

### Vi du

- Dang nhap / dang ky co the merge guest cart vao user cart.
- Bootstrap doc `cartItemCount` tu session de ve badge tren navbar.
- Checkout luu `checkoutAttemptId` trong session de tiep tuc luong thanh toan.
- Order guest duoc xem lai dua tren `sessionId`.

## 29. Cache route o frontend

### Co che

- `RouteCache` nam o `frontend/app/network.ts`
- TTL mac dinh 45 giay

### Khi nao duoc dung

- `loadRoute(path)` se doc cache truoc

### Khi nao bi xoa

- Dang nhap / dang ky / dang xuat -> `clearRouteCache()`
- Sau thay doi gio hang -> xoa `/cart`
- Sau thay doi checkout -> xoa `/checkout`
- Dat hang xong -> clear tat ca

### Y nghia

- Cac trang chi doc du lieu co the quay lai nhanh.
- Cac trang co du lieu bien dong sau mutation thi bi invalidation thu cong.

## 30. Mau cau tra loi nhanh neu thay chi vao mot thao tac

### Mau 1: "Bam nut them gio hang"

1. Click vao button co `data-action="quick-add"` trong `frontend/main.ts`.
2. Event handler goi `quickAddToCart(bookId)`.
3. Ham nay goi `POST /api/v1/cart/items`.
4. Route backend vao `src/modules/cart/index.ts`.
5. Route goi `CartService.addItem()`.
6. Service tim/tao cart, kiem tra sach, tinh lai tong tien, ghi analytics, luu DB.
7. Response tra cart moi ve FE.
8. FE cap nhat state, badge gio hang, xoa cache `/cart`, render lai.

### Mau 2: "Submit form thanh toan"

1. FE bat `submit` cua form `checkout-payment`.
2. Goi `handleCheckoutPayment()`.
3. Goi API `/api/v1/checkout/payment-method`.
4. Backend vao route checkout module.
5. Goi `CheckoutService.savePaymentMethod()`.
6. Service update payment method cho checkout attempt va doi status.
7. JSON moi tra ve FE.
8. FE cap nhat `state.routeData.payload.checkout`, xoa cache `/checkout`, render lai.

### Mau 3: "Mo mot trang trong SPA"

1. Click link `data-link`.
2. `loadRoute(path)` chay.
3. Neu co cache thi render luon.
4. Neu khong co cache thi goi `/api/v1/app/route-data`.
5. Backend map path sang service trong `buildSpaRouteData()`.
6. Service build page model.
7. FE nhan routeData va render.

## 31. Ket luan de on truoc khi bi hoi bai

Neu can nho ngan gon, hay thuoc 5 lop sau:

1. DOM event bat o `installEventHandlers()`
2. FE action handler goi API hoac `loadRoute()`
3. Express route nhan request
4. Service chua business logic that su
5. Response cap nhat `state` va `renderApp()`

Hay uu tien nho cac cap mapping nay:

- `loadRoute()` <-> `/api/v1/app/route-data` <-> `buildSpaRouteData()`
- `quickAddToCart()` <-> `/api/v1/cart/items` <-> `CartService.addItem()`
- `handleAuthForm(login/register)` <-> `/api/v1/auth/...` <-> auth router + merge cart
- `handleCheckoutShipping/payment` <-> checkout router <-> `CheckoutService.save...`
- `placeOrder()` <-> `/api/v1/orders` <-> `CheckoutService.placeOrder()`

Neu thay hoi sau mot click "roi backend xuong DB nhu the nao", cau tra loi dung huong nhat la:

`frontend/main.ts` -> event handler -> API route -> module route -> service -> repository/prisma -> DB -> response JSON -> update state -> `renderApp()`.
