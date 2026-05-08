-- CreateEnum
CREATE TYPE "CheckoutAttemptStatus" AS ENUM ('STARTED', 'SHIPPING_INFO_CAPTURED', 'PAYMENT_METHOD_SELECTED', 'READY_TO_PLACE', 'COMPLETED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ContentImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL_SUCCESS');

-- CreateEnum
CREATE TYPE "StagedBookStatus" AS ENUM ('IMPORTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "AnalyticsDeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "authors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "biography" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publishers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publishers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "cover_image_url" TEXT,
    "author_id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "availability_status" "AvailabilityStatus" NOT NULL DEFAULT 'IN_STOCK',
    "price_amount" INTEGER NOT NULL,
    "compare_at_amount" INTEGER,
    "shipping_fee_amount" INTEGER NOT NULL DEFAULT 30000,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "page_count" INTEGER,
    "language_code" TEXT,
    "isbn" TEXT,
    "published_at" TIMESTAMP(3),
    "inventory_quantity" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_bestseller" BOOLEAN NOT NULL DEFAULT false,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "sort_weight" INTEGER NOT NULL DEFAULT 0,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_categories" (
    "book_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_categories_pkey" PRIMARY KEY ("book_id","category_id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "publish_status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "collection_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("collection_id","book_id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone_number" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "permissions" "AdminPermission"[] DEFAULT ARRAY[]::"AdminPermission"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "sid" VARCHAR(255) NOT NULL,
    "sess" JSONB NOT NULL,
    "expire" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "subtotal_amount" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_amount" INTEGER NOT NULL,
    "compare_at_amount" INTEGER,
    "shipping_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "line_subtotal_amount" INTEGER NOT NULL,
    "line_total_amount" INTEGER NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkout_attempts" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "status" "CheckoutAttemptStatus" NOT NULL DEFAULT 'STARTED',
    "shipping_full_name" TEXT,
    "shipping_phone_number" TEXT,
    "shipping_address_line1" TEXT,
    "shipping_ward" TEXT,
    "shipping_district" TEXT,
    "shipping_province" TEXT,
    "shipping_note" TEXT,
    "payment_method" "PaymentMethodCode",
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "subtotal_amount" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "last_error_code" TEXT,
    "last_error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipping_info_submitted_at" TIMESTAMP(3),
    "payment_method_selected_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "user_id" TEXT,
    "source_cart_id" TEXT,
    "checkout_attempt_id" TEXT,
    "session_id" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PLACED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethodCode" NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "subtotal_amount" INTEGER NOT NULL,
    "shipping_fee_amount" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "customer_email" TEXT,
    "customer_full_name" TEXT NOT NULL,
    "customer_phone_number" TEXT NOT NULL,
    "internal_note" TEXT,
    "cancellation_reason" TEXT,
    "placed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "packed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "address_line1" TEXT NOT NULL,
    "ward" TEXT,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "book_id" TEXT,
    "book_slug" TEXT NOT NULL,
    "book_title" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "publisher_name" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price_amount" INTEGER NOT NULL,
    "compare_at_amount" INTEGER,
    "shipping_fee_amount" INTEGER NOT NULL DEFAULT 0,
    "line_subtotal_amount" INTEGER NOT NULL,
    "line_total_amount" INTEGER NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "snapshot_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethodCode" NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "external_reference" TEXT,
    "proof_url" TEXT,
    "note" TEXT,
    "raw_payload" JSONB,
    "paid_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_import_jobs" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_reference" TEXT,
    "triggered_by_user_id" TEXT,
    "status" "ContentImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "total_records" INTEGER NOT NULL DEFAULT 0,
    "processed_records" INTEGER NOT NULL DEFAULT 0,
    "successful_records" INTEGER NOT NULL DEFAULT 0,
    "failed_records" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "metadata" JSONB,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staged_books" (
    "id" TEXT NOT NULL,
    "import_job_id" TEXT,
    "reviewer_user_id" TEXT,
    "mapped_book_id" TEXT,
    "source_record_id" TEXT,
    "source_url" TEXT,
    "status" "StagedBookStatus" NOT NULL DEFAULT 'IMPORTED',
    "title" TEXT NOT NULL,
    "author_name" TEXT,
    "publisher_name" TEXT,
    "isbn" TEXT,
    "price_amount" INTEGER,
    "compare_at_amount" INTEGER,
    "cover_image_url" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "raw_payload" JSONB,
    "normalized_payload" JSONB,
    "reject_reason" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staged_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_event_outbox" (
    "id" TEXT NOT NULL,
    "dedupe_key" TEXT,
    "event_name" "AnalyticsEventName" NOT NULL,
    "delivery_status" "AnalyticsDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "source_module" TEXT,
    "session_id" TEXT,
    "cart_id" TEXT,
    "order_id" TEXT,
    "user_id" TEXT,
    "is_critical" BOOLEAN NOT NULL DEFAULT false,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_event_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT,
    "is_logged_in" BOOLEAN NOT NULL DEFAULT false,
    "device_type" TEXT,
    "landing_path" TEXT,
    "referrer" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL,
    "page_view_count" INTEGER NOT NULL DEFAULT 0,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "cart_event_count" INTEGER NOT NULL DEFAULT 0,
    "checkout_count" INTEGER NOT NULL DEFAULT 0,
    "purchase_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fact_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_search" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "book_id" TEXT,
    "query" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "no_result" BOOLEAN NOT NULL DEFAULT false,
    "selected_rank" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_search_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_product_views" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "book_id" TEXT NOT NULL,
    "category_id" TEXT,
    "collection_id" TEXT,
    "source_context" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_cart_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "cart_id" TEXT,
    "book_id" TEXT,
    "event_name" "AnalyticsEventName" NOT NULL,
    "quantity" INTEGER,
    "subtotal_amount" INTEGER,
    "total_amount" INTEGER,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_cart_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_checkout_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "order_id" TEXT,
    "checkout_attempt_id" TEXT,
    "event_name" "AnalyticsEventName" NOT NULL,
    "payment_method" "PaymentMethodCode",
    "total_amount" INTEGER,
    "error_code" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_checkout_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_orders" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "session_id" TEXT,
    "user_id" TEXT,
    "book_id" TEXT,
    "category_id" TEXT,
    "payment_method" "PaymentMethodCode" NOT NULL,
    "order_status" "OrderStatus" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal_amount" INTEGER NOT NULL,
    "shipping_fee_amount" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "currency" "CurrencyCode" NOT NULL DEFAULT 'VND',
    "is_guest_order" BOOLEAN NOT NULL DEFAULT true,
    "ordered_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fact_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE INDEX "authors_name_idx" ON "authors"("name");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_slug_key" ON "publishers"("slug");

-- CreateIndex
CREATE INDEX "publishers_name_idx" ON "publishers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_sort_order_idx" ON "categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE INDEX "books_title_idx" ON "books"("title");

-- CreateIndex
CREATE INDEX "books_author_id_idx" ON "books"("author_id");

-- CreateIndex
CREATE INDEX "books_publisher_id_idx" ON "books"("publisher_id");

-- CreateIndex
CREATE INDEX "books_publish_status_availability_status_idx" ON "books"("publish_status", "availability_status");

-- CreateIndex
CREATE INDEX "books_price_amount_idx" ON "books"("price_amount");

-- CreateIndex
CREATE INDEX "books_created_at_idx" ON "books"("created_at");

-- CreateIndex
CREATE INDEX "books_published_at_idx" ON "books"("published_at");

-- CreateIndex
CREATE INDEX "books_is_featured_is_bestseller_is_recommended_idx" ON "books"("is_featured", "is_bestseller", "is_recommended");

-- CreateIndex
CREATE INDEX "books_sort_weight_created_at_idx" ON "books"("sort_weight", "created_at");

-- CreateIndex
CREATE INDEX "book_categories_category_id_position_idx" ON "book_categories"("category_id", "position");

-- CreateIndex
CREATE INDEX "book_categories_book_id_is_primary_idx" ON "book_categories"("book_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE INDEX "collections_publish_status_sort_order_idx" ON "collections"("publish_status", "sort_order");

-- CreateIndex
CREATE INDEX "collections_name_idx" ON "collections"("name");

-- CreateIndex
CREATE INDEX "collection_items_book_id_idx" ON "collection_items"("book_id");

-- CreateIndex
CREATE INDEX "collection_items_collection_id_position_idx" ON "collection_items"("collection_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "IDX_sessions_expire" ON "sessions"("expire");

-- CreateIndex
CREATE INDEX "carts_user_id_is_active_idx" ON "carts"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "carts_session_id_is_active_idx" ON "carts"("session_id", "is_active");

-- CreateIndex
CREATE INDEX "carts_last_activity_at_idx" ON "carts"("last_activity_at");

-- CreateIndex
CREATE INDEX "cart_items_book_id_idx" ON "cart_items"("book_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_book_id_key" ON "cart_items"("cart_id", "book_id");

-- CreateIndex
CREATE INDEX "checkout_attempts_cart_id_status_idx" ON "checkout_attempts"("cart_id", "status");

-- CreateIndex
CREATE INDEX "checkout_attempts_user_id_started_at_idx" ON "checkout_attempts"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "checkout_attempts_session_id_started_at_idx" ON "checkout_attempts"("session_id", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_attempt_id_key" ON "orders"("checkout_attempt_id");

-- CreateIndex
CREATE INDEX "orders_user_id_placed_at_idx" ON "orders"("user_id", "placed_at");

-- CreateIndex
CREATE INDEX "orders_status_placed_at_idx" ON "orders"("status", "placed_at");

-- CreateIndex
CREATE INDEX "orders_payment_status_placed_at_idx" ON "orders"("payment_status", "placed_at");

-- CreateIndex
CREATE INDEX "orders_payment_method_placed_at_idx" ON "orders"("payment_method", "placed_at");

-- CreateIndex
CREATE INDEX "orders_session_id_placed_at_idx" ON "orders"("session_id", "placed_at");

-- CreateIndex
CREATE UNIQUE INDEX "order_addresses_order_id_key" ON "order_addresses"("order_id");

-- CreateIndex
CREATE INDEX "order_addresses_province_district_idx" ON "order_addresses"("province", "district");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_book_id_idx" ON "order_items"("book_id");

-- CreateIndex
CREATE INDEX "payment_records_order_id_status_idx" ON "payment_records"("order_id", "status");

-- CreateIndex
CREATE INDEX "payment_records_method_status_idx" ON "payment_records"("method", "status");

-- CreateIndex
CREATE INDEX "payment_records_external_reference_idx" ON "payment_records"("external_reference");

-- CreateIndex
CREATE INDEX "content_import_jobs_status_created_at_idx" ON "content_import_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "content_import_jobs_triggered_by_user_id_created_at_idx" ON "content_import_jobs"("triggered_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "staged_books_status_created_at_idx" ON "staged_books"("status", "created_at");

-- CreateIndex
CREATE INDEX "staged_books_import_job_id_status_idx" ON "staged_books"("import_job_id", "status");

-- CreateIndex
CREATE INDEX "staged_books_mapped_book_id_idx" ON "staged_books"("mapped_book_id");

-- CreateIndex
CREATE INDEX "staged_books_source_record_id_idx" ON "staged_books"("source_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_event_outbox_dedupe_key_key" ON "analytics_event_outbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_delivery_status_occurred_at_idx" ON "analytics_event_outbox"("delivery_status", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_event_name_occurred_at_idx" ON "analytics_event_outbox"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_session_id_occurred_at_idx" ON "analytics_event_outbox"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_cart_id_occurred_at_idx" ON "analytics_event_outbox"("cart_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_order_id_occurred_at_idx" ON "analytics_event_outbox"("order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "analytics_event_outbox_user_id_occurred_at_idx" ON "analytics_event_outbox"("user_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "fact_sessions_session_id_key" ON "fact_sessions"("session_id");

-- CreateIndex
CREATE INDEX "fact_sessions_started_at_idx" ON "fact_sessions"("started_at");

-- CreateIndex
CREATE INDEX "fact_sessions_user_id_started_at_idx" ON "fact_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "fact_sessions_device_type_started_at_idx" ON "fact_sessions"("device_type", "started_at");

-- CreateIndex
CREATE INDEX "fact_search_normalized_query_occurred_at_idx" ON "fact_search"("normalized_query", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_search_session_id_occurred_at_idx" ON "fact_search"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_search_user_id_occurred_at_idx" ON "fact_search"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_search_no_result_occurred_at_idx" ON "fact_search"("no_result", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_product_views_book_id_occurred_at_idx" ON "fact_product_views"("book_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_product_views_session_id_occurred_at_idx" ON "fact_product_views"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_product_views_user_id_occurred_at_idx" ON "fact_product_views"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_product_views_category_id_occurred_at_idx" ON "fact_product_views"("category_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_product_views_collection_id_occurred_at_idx" ON "fact_product_views"("collection_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_cart_events_cart_id_occurred_at_idx" ON "fact_cart_events"("cart_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_cart_events_session_id_occurred_at_idx" ON "fact_cart_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_cart_events_user_id_occurred_at_idx" ON "fact_cart_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_cart_events_book_id_occurred_at_idx" ON "fact_cart_events"("book_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_cart_events_event_name_occurred_at_idx" ON "fact_cart_events"("event_name", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_checkout_events_checkout_attempt_id_occurred_at_idx" ON "fact_checkout_events"("checkout_attempt_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_checkout_events_order_id_occurred_at_idx" ON "fact_checkout_events"("order_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_checkout_events_session_id_occurred_at_idx" ON "fact_checkout_events"("session_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_checkout_events_user_id_occurred_at_idx" ON "fact_checkout_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "fact_checkout_events_event_name_occurred_at_idx" ON "fact_checkout_events"("event_name", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "fact_orders_order_item_id_key" ON "fact_orders"("order_item_id");

-- CreateIndex
CREATE INDEX "fact_orders_ordered_at_idx" ON "fact_orders"("ordered_at");

-- CreateIndex
CREATE INDEX "fact_orders_payment_method_ordered_at_idx" ON "fact_orders"("payment_method", "ordered_at");

-- CreateIndex
CREATE INDEX "fact_orders_book_id_ordered_at_idx" ON "fact_orders"("book_id", "ordered_at");

-- CreateIndex
CREATE INDEX "fact_orders_category_id_ordered_at_idx" ON "fact_orders"("category_id", "ordered_at");

-- CreateIndex
CREATE INDEX "fact_orders_user_id_ordered_at_idx" ON "fact_orders"("user_id", "ordered_at");

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_categories" ADD CONSTRAINT "book_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_attempts" ADD CONSTRAINT "checkout_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_cart_id_fkey" FOREIGN KEY ("source_cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_attempt_id_fkey" FOREIGN KEY ("checkout_attempt_id") REFERENCES "checkout_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_import_jobs" ADD CONSTRAINT "content_import_jobs_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staged_books" ADD CONSTRAINT "staged_books_import_job_id_fkey" FOREIGN KEY ("import_job_id") REFERENCES "content_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staged_books" ADD CONSTRAINT "staged_books_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staged_books" ADD CONSTRAINT "staged_books_mapped_book_id_fkey" FOREIGN KEY ("mapped_book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_event_outbox" ADD CONSTRAINT "analytics_event_outbox_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_event_outbox" ADD CONSTRAINT "analytics_event_outbox_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_event_outbox" ADD CONSTRAINT "analytics_event_outbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_sessions" ADD CONSTRAINT "fact_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_search" ADD CONSTRAINT "fact_search_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_search" ADD CONSTRAINT "fact_search_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_product_views" ADD CONSTRAINT "fact_product_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_product_views" ADD CONSTRAINT "fact_product_views_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_product_views" ADD CONSTRAINT "fact_product_views_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_product_views" ADD CONSTRAINT "fact_product_views_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_cart_events" ADD CONSTRAINT "fact_cart_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_cart_events" ADD CONSTRAINT "fact_cart_events_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_cart_events" ADD CONSTRAINT "fact_cart_events_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_checkout_events" ADD CONSTRAINT "fact_checkout_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_checkout_events" ADD CONSTRAINT "fact_checkout_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_checkout_events" ADD CONSTRAINT "fact_checkout_events_checkout_attempt_id_fkey" FOREIGN KEY ("checkout_attempt_id") REFERENCES "checkout_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_orders" ADD CONSTRAINT "fact_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_orders" ADD CONSTRAINT "fact_orders_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_orders" ADD CONSTRAINT "fact_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_orders" ADD CONSTRAINT "fact_orders_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_orders" ADD CONSTRAINT "fact_orders_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Search-oriented indexes for catalog discovery in later phases.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "books_title_trgm_idx"
  ON "books" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "authors_name_trgm_idx"
  ON "authors" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "publishers_name_trgm_idx"
  ON "publishers" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "categories_name_trgm_idx"
  ON "categories" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "collections_name_trgm_idx"
  ON "collections" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "books_keywords_gin_idx"
  ON "books" USING GIN ("keywords");
