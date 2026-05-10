import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import {
  getCategories,
  getCollectionsOverview,
  getHomePage,
  getListingPage,
  getProductDetail,
  getSearchPage,
} from "../lib/api";
import { useApiResource } from "../lib/use-api-resource";
import {
  CollectionsLandingExperience,
  ErrorState,
  HomeExperience,
  ListingExperience,
  LoadingState,
  ProductDetailExperience,
  SearchExperience,
  Toast,
} from "./components";
import { AdminAnalyticsPage, AdminCatalogPage, AdminDashboardPage, AdminOrdersPage } from "./admin-pages";
import { AnalyticsConsentBanner } from "./analytics-banner";
import { AnalyticsProvider, useAnalytics } from "./analytics-context";
import { AccountOrderRedirectPage, AccountOrdersPage, AccountPage, LoginPage, RegisterPage } from "./auth-pages";
import { AuthProvider } from "./auth-context";
import { CartProvider, useCart } from "./cart-context";
import { CheckoutPage } from "./checkout-page";
import { OrderDetailPage, OrderSuccessPage } from "./order-pages";

function useToast() {
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setToast(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  return { toast, setToast };
}

function AnalyticsPageBridge() {
  const location = useLocation();
  const { consentGranted, track } = useAnalytics();

  useEffect(() => {
    if (!consentGranted) {
      return;
    }

    void track("page_view", {
      path: location.pathname,
      search: location.search,
    });
  }, [consentGranted, location.pathname, location.search, track]);

  return null;
}

function HomePage() {
  const home = useApiResource("home", getHomePage);

  if (home.loading && !home.data) {
    return <LoadingState />;
  }

  if (home.error || !home.data) {
    return <ErrorState message={home.error?.message ?? "Không thể tải trang chủ."} />;
  }

  return <HomeExperience page={home.data} />;
}

function ListingPage({ apiPath }: { apiPath: string }) {
  const listing = useApiResource(apiPath, (signal) => getListingPage(apiPath, signal));
  const { addItem, mutation } = useCart();
  const { toast, setToast } = useToast();

  if (listing.loading && !listing.data) {
    return <LoadingState />;
  }

  if (listing.error || !listing.data) {
    return <ErrorState message={listing.error?.message ?? "Không thể tải danh mục sách."} />;
  }

  return (
    <>
      <ListingExperience
        title={listing.data.pageHeading}
        lead={listing.data.pageLead}
        eyebrow={listing.data.eyebrow}
        breadcrumb={listing.data.breadcrumb}
        resultSummary={listing.data.resultSummary}
        books={listing.data.books}
        filters={listing.data.filters}
        activeFilters={listing.data.activeFilters}
        pagination={listing.data.pagination}
        emptyState={listing.data.emptyState}
        addingBookId={mutation.type === "add" ? mutation.bookId : null}
        onAddToCart={async (bookId) => {
          try {
            const nextCart = await addItem(bookId, 1);
            setToast({
              kind: "success",
              message: `Đã thêm sách vào giỏ hàng, giỏ hiện có ${nextCart.itemCount} sản phẩm.`,
            });
          } catch (error) {
            setToast({
              kind: "error",
              message: error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.",
            });
          }
        }}
      />
      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}

function DynamicListingRoute() {
  const location = useLocation();
  const apiPath = `${location.pathname}${location.search}`;
  return <ListingPage apiPath={apiPath} />;
}

function SearchPage() {
  const location = useLocation();
  const search = useApiResource(`${location.pathname}${location.search}`, (signal) =>
    getSearchPage(location.search, signal),
  );
  const { addItem, mutation } = useCart();
  const { toast, setToast } = useToast();

  if (search.loading && !search.data) {
    return <LoadingState />;
  }

  if (search.error || !search.data) {
    return <ErrorState message={search.error?.message ?? "Không thể tải kết quả tìm kiếm"} />;
  }

  return (
    <>
      <SearchExperience
        page={search.data}
        addingBookId={mutation.type === "add" ? mutation.bookId : null}
        onAddToCart={async (bookId) => {
          try {
            const nextCart = await addItem(bookId, 1);
            setToast({
              kind: "success",
              message: `Đã thêm sách vào giỏ hàng, giỏ hiện có ${nextCart.itemCount} sản phẩm.`,
            });
          } catch (error) {
            setToast({
              kind: "error",
              message: error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.",
            });
          }
        }}
      />
      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}

function CollectionsOverviewPage() {
  const [searchParams] = useSearchParams();
  const collections = useApiResource("collections-overview", getCollectionsOverview);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = 6;
  const totalItems = collections.data?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedCollections = useMemo(
    () => collections.data?.slice((safePage - 1) * pageSize, safePage * pageSize) ?? [],
    [collections.data, safePage],
  );

  if (collections.loading && !collections.data) {
    return <LoadingState />;
  }

  if (collections.error || !collections.data) {
    return <ErrorState message={collections.error?.message ?? "Không thể tải danh sách bộ sưu tập."} />;
  }

  return (
    <CollectionsLandingExperience
      collections={paginatedCollections}
      page={safePage}
      totalPages={totalPages}
    />
  );
}

function ProductPage() {
  const location = useLocation();
  const { addItem, mutation } = useCart();
  const { toast, setToast } = useToast();
  const detail = useApiResource(`${location.pathname}${location.search}`, (signal) =>
    getProductDetail(`${location.pathname}${location.search}`, signal),
  );

  const handleAddToCart = async (bookId: string, quantity: number) => {
    try {
      const nextCart = await addItem(bookId, quantity);
      setToast({
        kind: "success",
        message: `Đã thêm vào giỏ hàng, giỏ hiện có ${nextCart.itemCount} sản phẩm.`,
      });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.",
      });
    }
  };

  if (detail.loading && !detail.data) {
    return <LoadingState />;
  }

  if (detail.error || !detail.data) {
    return <ErrorState message={detail.error?.message ?? "Không thể tải chi tiết sản phẩm."} />;
  }

  return (
    <>
      <ProductDetailExperience
        page={detail.data}
        onAddToCart={handleAddToCart}
        addingToCart={mutation.type === "add" && mutation.bookId === detail.data.book.id}
      />
      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}
    </>
  );
}

function StorefrontRoutes() {
  useApiResource("categories", getCategories);

  return (
    <>
      <AnalyticsPageBridge />
      <AnalyticsConsentBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/books" element={<DynamicListingRoute />} />
        <Route path="/collections" element={<CollectionsOverviewPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/orders" element={<AccountOrdersPage />} />
        <Route path="/account/orders/:orderNumber" element={<AccountOrderRedirectPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/catalog" element={<AdminCatalogPage />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders/:orderNumber/success" element={<OrderSuccessPage />} />
        <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
        <Route path="/categories/:slug" element={<DynamicListingRoute />} />
        <Route path="/collections/:slug" element={<DynamicListingRoute />} />
        <Route path="/books/:slug" element={<ProductPage />} />
        <Route
          path="*"
          element={
            <ErrorState
              title="Không tìm thấy trang"
            />
          }
        />
      </Routes>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <AnalyticsProvider>
            <StorefrontRoutes />
          </AnalyticsProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
