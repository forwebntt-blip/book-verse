import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import {
  cancelAdminOrder,
  approveAdminStagedBook,
  createAdminAuthor,
  createAdminBook,
  createAdminCategory,
  createAdminCollection,
  createAdminImportJob,
  createAdminPublisher,
  deleteAdminAuthor,
  deleteAdminBook,
  deleteAdminCategory,
  deleteAdminCollection,
  deleteAdminPublisher,
  flushCriticalAnalytics,
  getAnalyticsDashboard,
  getAdminOrder,
  getAdminOrders,
  getAdminAuthors,
  getAdminBooks,
  getAdminCategories,
  getAdminCollections,
  getAdminDashboard,
  getAdminImportJobs,
  getAdminPublishers,
  getAdminStagedBooks,
  markAdminOrderTransferReceived,
  normalizeAdminStagedBook,
  publishAdminStagedBook,
  rejectAdminStagedBook,
  updateAdminOrderInternalNote,
  updateAdminOrderStatus,
  updateAdminAuthor,
  updateAdminBook,
  updateAdminBookStatus,
  updateAdminCategory,
  updateAdminCollection,
  updateAdminPublisher,
} from "../lib/api";
import type {
  AdminAuthorViewModel,
  AdminBookViewModel,
  AdminCategoryViewModel,
  AdminCollectionViewModel,
  AdminDashboardPageModel,
  AdminImportJobViewModel,
  AdminOrderViewModel,
  AdminPublisherViewModel,
  AdminStagedBookViewModel,
  AnalyticsDashboardViewModel,
  AvailabilityStatus,
  OrderStatus,
  PaymentStatus,
  PublishStatus,
  StagedBookStatus,
} from "../types/api";
import { useAuth } from "./auth-context";
import { ErrorState, LoadingState, Toast } from "./components";
import { SectionHeader } from "./components-shared";

type AdminTab = "dashboard" | "catalog" | "orders" | "analytics" | "content-ops";
type AdminCatalogModal = null | "author" | "publisher" | "category" | "collection" | "book";

type AdminToast = { kind: "success" | "error"; message: string } | null;

function useAdminToast() {
  const [toast, setToast] = useState<AdminToast>(null);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return { toast, setToast };
}

function summarizeRole(role: string) {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "CONTENT_EDITOR":
      return "Content editor";
    case "OPS":
      return "Operations";
    default:
      return role;
  }
}

function formatCompactCurrency(amount: number) {
  return `${amount.toLocaleString("vi-VN")} d`;
}

function countByStatus<T extends string>(items: T[], target: T) {
  return items.filter((item) => item === target).length;
}

function AdminShell(props: {
  tab: AdminTab;
  title: string;
  lead: string;
  children: React.ReactNode;
  toast?: AdminToast;
}) {
  const { status, isAuthenticated, user } = useAuth();

  if (status === "loading") {
    return <LoadingState />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(`/admin/${props.tab === "dashboard" ? "" : props.tab}`)}`}
        replace
      />
    );
  }

  if (!user || (user.role !== "ADMIN" && user.role !== "CONTENT_EDITOR" && user.role !== "OPS")) {
    return (
      <ErrorState
        title="Admin access required"
        message="Tài khoản này không có quyền vào khu vực admin."
      />
    );
  }

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/admin"},
    { key: "catalog", label: "Catalog", href: "/admin/catalog"},
    { key: "orders", label: "Orders", href: "/admin/orders"},
  ] as const;

  return (
    <>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <Link className="admin-brand" to="/admin">
            <span className="admin-brand__badge">BV</span>
            <span>
              <strong>BookVerse Admin</strong>
              <small>Operational control room</small>
            </span>
          </Link>

          <div className="admin-sidebar__group">
            <span className="admin-sidebar__label">Workspace</span>
            <nav className="admin-sidebar__nav">
              {navItems.map((item) => (
                <Link
                  className={item.key === props.tab ? "active" : ""}
                  key={item.href}
                  to={item.href}
                >
                  <strong>{item.label}</strong>
                  <span>{item.note}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="admin-sidebar__group admin-sidebar__group--meta">
            <span className="admin-sidebar__label">Signed in</span>
            <div className="admin-identity-card">
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
              <div className="admin-identity-card__tags">
                <span>{summarizeRole(user.role)}</span>
                <span>{user.permissions.length} permissions</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <div className="admin-topbar__eyebrow">Internal console</div>
              <h1>{props.title}</h1>
              <p>{props.lead}</p>
            </div>
            <div className="admin-topbar__actions">
              <Link className="button-outline" to="/">
                Open storefront
              </Link>
              <div className="admin-topbar__pulse">
                <span />
                Admin online
              </div>
            </div>
          </header>

          <div className="admin-content">{props.children}</div>
        </main>
      </div>

      {props.toast ? <Toast kind={props.toast.kind} message={props.toast.message} /> : null}
    </>
  );
}

function AdminMetricCard(props: { label: string; value: string; note: string; tone?: "default" | "accent" }) {
  return (
    <article className={`admin-metric-card${props.tone === "accent" ? " admin-metric-card--accent" : ""}`}>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.note}</p>
    </article>
  );
}

function AdminEntityBlock(props: {
  eyebrow: string;
  title: string;
  count: number;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-panel admin-panel--entity">
      <div className="admin-entity-head">
        <div className="admin-entity-head__copy">
          <div className="admin-entity-head__title-row">
            <h2 className="admin-entity-head__title">{props.title}</h2>
            <span className="admin-counter">{props.count} items</span>
          </div>
        </div>
        <div className="admin-entity-head__meta">
          {props.action ? <div className="admin-entity-head__action">{props.action}</div> : null}
        </div>
      </div>
      {props.children}
    </section>
  );
}

function AdminModalSection(props: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="admin-modal-section">
      <div className="admin-modal-section__head">
        <strong>{props.title}</strong>
        {props.description ? <span>{props.description}</span> : null}
      </div>
      {props.children}
    </section>
  );
}

export function AdminDashboardPage() {
  const [page, setPage] = useState<AdminDashboardPageModel | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDashboardViewModel | null>(null);
  const { toast, setToast } = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      try {
        setLoading(true);
        const [dashboardData, analyticsData] = await Promise.all([
          getAdminDashboard(),
          getAnalyticsDashboard(),
        ]);
        if (!active) return;
        setPage(dashboardData);
        setAnalytics(analyticsData);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Không thể tải admin dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <LoadingState />;
  if (error || !page || !analytics) {
    return <ErrorState title="Không thể tải dashboard" message={error ?? "Dashboard không sẵn sàng."} />;
  }

  const handleFlush = async () => {
    try {
      const result = await flushCriticalAnalytics();
      setToast({
        kind: "success",
        message: `Analytics synced. Delivered ${result.delivered}, failed ${result.failed}.`,
      });
    } catch (actionError) {
      setToast({
        kind: "error",
        message: actionError instanceof Error ? actionError.message : "Không thể sync analytics.",
      });
    }
  };

  const operationsStats = page.stats.slice(0, 3);
  const liveSignals = [
    analytics.topBooks[0]
      ? {
          label: "Top book",
          value: analytics.topBooks[0].label,
          note: `${analytics.topBooks[0].value} orders`,
        }
      : null,
    analytics.topSearchTerms[0]
      ? {
          label: "Top search",
          value: analytics.topSearchTerms[0].label,
          note: `${analytics.topSearchTerms[0].value} searches`,
        }
      : null,
    analytics.categoryBreakdown[0]
      ? {
          label: "Top category",
          value: analytics.categoryBreakdown[0].label,
          note: `${analytics.categoryBreakdown[0].value} orders`,
        }
      : null,
    analytics.paymentMethodBreakdown[0]
      ? {
          label: "Leading payment",
          value: analytics.paymentMethodBreakdown[0].label,
          note: `${analytics.paymentMethodBreakdown[0].value} orders`,
        }
      : null,
  ].filter((item): item is { label: string; value: string; note: string } => Boolean(item));

  return (
    <AdminShell tab="dashboard" title="Operations overview" toast={toast}>
      <section className="admin-metrics-grid admin-metrics-grid--dashboard">
        {operationsStats.map((stat) => (
          <AdminMetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            note={stat.note}
            tone="default"
          />
        ))}
        <AdminMetricCard
          label="Sessions"
          value={String(analytics.overview.sessions)}
          tone="accent"
        />
        <AdminMetricCard
          label="Purchases"
          value={String(analytics.overview.purchases)}
          note="Completed backend purchase events"
        />
        <AdminMetricCard
          label="Revenue"
          value={formatCompactCurrency(analytics.overview.revenue)}
          note={`Conversion ${analytics.overview.conversionRate}%`}
        />
      </section>

      <section className="admin-grid admin-grid--dashboard-overview">
        <section className="admin-panel admin-panel--spotlight">
          <div className="admin-toolbar admin-toolbar--compact">
            <div>
              <div className="admin-toolbar__eyebrow">Overview</div>
              <h2>Commercial pulse</h2>
            </div>
          </div>

          <div className="admin-funnel-grid">
            <article className="admin-funnel-card">
              <span className="admin-funnel-card__label">Homepage funnel</span>
              <div className="admin-funnel-card__rows">
                {analytics.homepageFunnel.map((item) => (
                  <div className="admin-funnel-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-funnel-card">
              <span className="admin-funnel-card__label">Search funnel</span>
              <div className="admin-funnel-card__rows">
                {analytics.searchFunnel.map((item) => (
                  <div className="admin-funnel-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="admin-funnel-card">
              <span className="admin-funnel-card__label">Checkout funnel</span>
              <div className="admin-funnel-card__rows">
                {analytics.checkoutFunnel.map((item) => (
                  <div className="admin-funnel-row" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="admin-panel admin-panel--dashboard-side">
          <SectionHeader eyebrow="Signals" title="Live signals" />
          <div className="admin-signal-list admin-scroll-region">
            {liveSignals.map((item) => (
              <article className="admin-signal-card" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-grid admin-grid--dashboard-secondary">
        <section className="admin-panel admin-panel--dashboard-list">
          <SectionHeader eyebrow="Revenue" title="Recent daily revenue" />
          <div className="admin-list admin-scroll-region">
            {analytics.revenueSeries.slice(0, 6).map((item) => (
              <article className="admin-list-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.orders} orders</span>
                </div>
                <div className="admin-list-row__meta">
                  <strong>{formatCompactCurrency(item.revenue)}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="admin-panel admin-panel--dashboard-list">
          <SectionHeader eyebrow="Mix" title="Channel and audience breakdown" />
          <div className="admin-summary-grid admin-summary-grid--dashboard-boxes admin-scroll-region">
            {[...analytics.paymentMethodBreakdown, ...analytics.deviceBreakdown, ...analytics.guestVsLoggedIn].map((item) => (
              <article className="admin-summary-card" key={`${item.label}-${item.value}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
      </section>
    </AdminShell>
  );
}

function useAdminCatalogData(filters: {
  q?: string;
  publishStatus?: string;
  availabilityStatus?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [authors, setAuthors] = useState<AdminAuthorViewModel[]>([]);
  const [publishers, setPublishers] = useState<AdminPublisherViewModel[]>([]);
  const [categories, setCategories] = useState<AdminCategoryViewModel[]>([]);
  const [books, setBooks] = useState<AdminBookViewModel[]>([]);
  const [collections, setCollections] = useState<AdminCollectionViewModel[]>([]);

  const refreshAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextAuthors, nextPublishers, nextCategories, nextCollections] = await Promise.all([
        getAdminAuthors(),
        getAdminPublishers(),
        getAdminCategories(),
        getAdminCollections(),
      ]);

      setAuthors(nextAuthors);
      setPublishers(nextPublishers);
      setCategories(nextCategories);
      setCollections(nextCollections);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong the tai admin catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, []);

  const refreshBooks = async () => {
    setBooksLoading(true);
    setBooksError(null);

    try {
      setBooks(await getAdminBooks(filters));
    } catch (loadError) {
      setBooksError(loadError instanceof Error ? loadError.message : "Khong the tai danh sach books.");
    } finally {
      setBooksLoading(false);
    }
  };

  useEffect(() => {
    void refreshBooks();
  }, [filters.availabilityStatus, filters.publishStatus, filters.q]);

  return {
    loading,
    error,
    booksLoading,
    booksError,
    authors,
    publishers,
    categories,
    books,
    collections,
    refreshAll,
    refreshBooks,
  };
}

export function AdminCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, setToast } = useAdminToast();
  const [activeCatalogModal, setActiveCatalogModal] = useState<AdminCatalogModal>(null);
  const filters = {
    q: searchParams.get("q") ?? "",
    publishStatus: searchParams.get("publishStatus") ?? "",
    availabilityStatus: searchParams.get("availabilityStatus") ?? "",
  };
  const {
    loading,
    error,
    booksLoading,
    booksError,
    authors,
    publishers,
    categories,
    books,
    collections,
    refreshAll,
    refreshBooks,
  } = useAdminCatalogData(filters);
  const [authorForm, setAuthorForm] = useState({ id: "", slug: "", name: "", biography: "" });
  const [publisherForm, setPublisherForm] = useState({ id: "", slug: "", name: "", description: "" });
  const [categoryForm, setCategoryForm] = useState({
    id: "",
    slug: "",
    name: "",
    description: "",
    isFeatured: false,
    sortOrder: 0,
  });
  const [collectionForm, setCollectionForm] = useState({
    id: "",
    slug: "",
    name: "",
    description: "",
    coverImageUrl: "",
    publishStatus: "DRAFT",
    isFeatured: false,
    sortOrder: 0,
    bookIds: "",
  });
  const [bookForm, setBookForm] = useState<Record<string, unknown>>({
    id: "",
    slug: "",
    title: "",
    subtitle: "",
    shortDescription: "",
    description: "",
    coverImageUrl: "",
    authorId: "",
    publisherId: "",
    publishStatus: "DRAFT",
    availabilityStatus: "IN_STOCK",
    priceAmount: 0,
    compareAtAmount: "",
    shippingFeeAmount: 30000,
    pageCount: "",
    languageCode: "",
    isbn: "",
    inventoryQuantity: 0,
    sortWeight: 0,
    isFeatured: false,
    isBestseller: false,
    isRecommended: false,
    keywords: "",
    categoryIds: "",
    primaryCategoryId: "",
    metadata: "",
  });

  const emptyAuthorForm = { id: "", slug: "", name: "", biography: "" };
  const emptyPublisherForm = { id: "", slug: "", name: "", description: "" };
  const emptyCategoryForm = {
    id: "",
    slug: "",
    name: "",
    description: "",
    isFeatured: false,
    sortOrder: 0,
  };
  const emptyCollectionForm = {
    id: "",
    slug: "",
    name: "",
    description: "",
    coverImageUrl: "",
    publishStatus: "DRAFT",
    isFeatured: false,
    sortOrder: 0,
    bookIds: "",
  };
  const emptyBookForm: Record<string, unknown> = {
    id: "",
    slug: "",
    title: "",
    subtitle: "",
    shortDescription: "",
    description: "",
    coverImageUrl: "",
    authorId: "",
    publisherId: "",
    publishStatus: "DRAFT",
    availabilityStatus: "IN_STOCK",
    priceAmount: 0,
    compareAtAmount: "",
    shippingFeeAmount: 30000,
    pageCount: "",
    languageCode: "",
    isbn: "",
    inventoryQuantity: 0,
    sortWeight: 0,
    isFeatured: false,
    isBestseller: false,
    isRecommended: false,
    keywords: "",
    categoryIds: "",
    primaryCategoryId: "",
    metadata: "",
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="Khong the tai catalog admin" message={error} />;

  const publishOptions: PublishStatus[] = ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"];
  const availabilityOptions: AvailabilityStatus[] = ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"];

  const handleAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      await Promise.all([refreshAll(), refreshBooks()]);
      setToast({ kind: "success", message: successMessage });
    } catch (actionError) {
      setToast({
        kind: "error",
        message: actionError instanceof Error ? actionError.message : "Khong the thuc hien thao tac admin.",
      });
    }
  };

  const openCreateModal = (modal: Exclude<AdminCatalogModal, null>) => {
    if (modal === "author") setAuthorForm(emptyAuthorForm);
    if (modal === "publisher") setPublisherForm(emptyPublisherForm);
    if (modal === "category") setCategoryForm(emptyCategoryForm);
    if (modal === "collection") setCollectionForm(emptyCollectionForm);
    if (modal === "book") setBookForm(emptyBookForm);
    setActiveCatalogModal(modal);
  };

  const closeCatalogModal = () => {
    setActiveCatalogModal(null);
  };

  const catalogStats = [
    {
      label: "Books matching filters",
      value: String(books.length),
      note: filters.q ? `Current search: ${filters.q}` : "Showing full current catalog slice",
    },
    {
      label: "Published books",
      value: String(countByStatus(books.map((book) => book.publishStatus), "PUBLISHED")),
      note: "Live items visible to storefront",
    },
    {
      label: "Low or out of stock",
      value: String(
        books.filter((book) => book.availabilityStatus === "LOW_STOCK" || book.availabilityStatus === "OUT_OF_STOCK")
          .length,
      ),
      note: "Items needing stock attention",
    },
    {
      label: "Metadata entities",
      value: String(authors.length + publishers.length + categories.length + collections.length),
      note: "Authors, publishers, categories and collections",
    },
  ];

  return (
    <AdminShell
      tab="catalog"
      title="Catalog control"
      toast={toast}
    >
      <section className="admin-metrics-grid">
        {catalogStats.map((stat, index) => (
          <AdminMetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            note={stat.note}
            tone={index === 0 ? "accent" : "default"}
          />
        ))}
      </section>

      <section className="admin-grid admin-grid--entity-workspace">
        <AdminEntityBlock
          eyebrow="Authors"
          title="Authors"
          count={authors.length}
          action={
            <button className="button-primary admin-create-button" type="button" onClick={() => openCreateModal("author")}>
              Create author
            </button>
          }
        >
          <div className="admin-list admin-scroll-region admin-scroll-region--catalog-entity">
            {authors.map((author) => (
              <article className="admin-list-row" key={author.id}>
                <div>
                  <strong>{author.name}</strong>
                  <span>{author.slug}</span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => {
                      setAuthorForm({
                        id: author.id,
                        slug: author.slug,
                        name: author.name,
                        biography: author.biography ?? "",
                      });
                      setActiveCatalogModal("author");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => void handleAction(() => deleteAdminAuthor(author.id), "Author deleted.")}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </AdminEntityBlock>

        <AdminEntityBlock
          eyebrow="Publishers"
          title="Publishers"
          count={publishers.length}
          action={
            <button className="button-primary admin-create-button" type="button" onClick={() => openCreateModal("publisher")}>
              Create publisher
            </button>
          }
        >
          <div className="admin-list admin-scroll-region admin-scroll-region--catalog-entity">
            {publishers.map((publisher) => (
              <article className="admin-list-row" key={publisher.id}>
                <div>
                  <strong>{publisher.name}</strong>
                  <span>{publisher.slug}</span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => {
                      setPublisherForm({
                        id: publisher.id,
                        slug: publisher.slug,
                        name: publisher.name,
                        description: publisher.description ?? "",
                      });
                      setActiveCatalogModal("publisher");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => void handleAction(() => deleteAdminPublisher(publisher.id), "Publisher deleted.")}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </AdminEntityBlock>
      </section>

      <section className="admin-grid admin-grid--entity-workspace">
        <AdminEntityBlock
          eyebrow="Categories"
          title="Categories"
          count={categories.length}
          action={
            <button className="button-primary admin-create-button" type="button" onClick={() => openCreateModal("category")}>
              Create category
            </button>
          }
        >
          <div className="admin-list admin-scroll-region admin-scroll-region--catalog-entity">
            {categories.map((category) => (
              <article className="admin-list-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <span>{category.slug}</span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => {
                      setCategoryForm({
                        id: category.id,
                        slug: category.slug,
                        name: category.name,
                        description: category.description ?? "",
                        isFeatured: category.isFeatured,
                        sortOrder: category.sortOrder,
                      });
                      setActiveCatalogModal("category");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => void handleAction(() => deleteAdminCategory(category.id), "Category deleted.")}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </AdminEntityBlock>

        <AdminEntityBlock
          eyebrow="Collections"
          title="Collections"
          count={collections.length}
          action={
            <button className="button-primary admin-create-button" type="button" onClick={() => openCreateModal("collection")}>
              Create collection
            </button>
          }
        >
          <div className="admin-list admin-scroll-region admin-scroll-region--catalog-entity">
            {collections.map((collection) => (
              <article className="admin-list-row" key={collection.id}>
                <div>
                  <strong>{collection.name}</strong>
                  <span>
                    {collection.publishStatus} · {collection.itemCount} books
                  </span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => {
                      setCollectionForm({
                        id: collection.id,
                        slug: collection.slug,
                        name: collection.name,
                        description: collection.description ?? "",
                        coverImageUrl: collection.coverImageUrl ?? "",
                        publishStatus: collection.publishStatus,
                        isFeatured: collection.isFeatured,
                        sortOrder: 0,
                        bookIds: collection.bookIds.join(", "),
                      });
                      setActiveCatalogModal("collection");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() =>
                      void handleAction(() => deleteAdminCollection(collection.id), "Collection deleted.")
                    }
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        </AdminEntityBlock>
      </section>

      <section className="admin-panel admin-panel--books">
        <div className="admin-books-head">
          <div className="admin-books-head__copy">
            <div className="admin-books-head__title-row">
              <h2 className="admin-books-head__title">Books</h2>
              <span className="admin-counter">{books.length} results</span>
              <span className="admin-counter">{books.filter((book) => book.publishStatus === "PUBLISHED").length} live</span>
            </div>
            <div className="admin-filter-row admin-filter-row--books">
              <input
                value={filters.q}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value.trim()) next.set("q", event.target.value);
                  else next.delete("q");
                  setSearchParams(next);
                }}
                placeholder="Search title, slug, isbn..."
              />
              <select
                value={filters.publishStatus}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set("publishStatus", event.target.value);
                  else next.delete("publishStatus");
                  setSearchParams(next);
                }}
              >
                <option value="">All publish statuses</option>
                {publishOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={filters.availabilityStatus}
                onChange={(event) => {
                  const next = new URLSearchParams(searchParams);
                  if (event.target.value) next.set("availabilityStatus", event.target.value);
                  else next.delete("availabilityStatus");
                  setSearchParams(next);
                }}
              >
                <option value="">All availability</option>
                {availabilityOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-books-head__status admin-books-head__status--actions">
            <button className="button-primary admin-create-button" type="button" onClick={() => openCreateModal("book")}>
              Create book
            </button>
          </div>
        </div>

        <div className="admin-book-list admin-scroll-region admin-scroll-region--catalog-books">
          {booksLoading ? (
            <div className="admin-books-loading-state">
              <strong>Loading books...</strong>
              <span>Updating the current filtered list.</span>
            </div>
          ) : booksError ? (
            <div className="admin-books-loading-state admin-books-loading-state--error">
              <strong>Khong the tai books</strong>
              <span>{booksError}</span>
            </div>
          ) : (
            books.map((book) => (
              <article className="admin-book-row" key={book.id}>
                <div className="admin-book-row__main">
                  <div className="admin-book-row__title">
                    <strong>{book.title}</strong>
                    <span>{book.slug}</span>
                  </div>
                  <div className="admin-book-row__meta">
                    <span>{book.authorName}</span>
                    <span>{book.publisherName}</span>
                    <span>{book.inventoryQuantity} in stock</span>
                  </div>
                </div>
                <div className="admin-book-row__status">
                  <span className={`admin-status-chip admin-status-chip--${book.publishStatus.toLowerCase()}`}>
                    {book.publishStatus}
                  </span>
                  <span
                    className={`admin-status-chip admin-status-chip--availability-${book.availabilityStatus.toLowerCase()}`}
                  >
                    {book.availabilityStatus}
                  </span>
                  <strong>{formatCompactCurrency(book.priceAmount)}</strong>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => {
                      setBookForm((current) => ({
                        ...current,
                        id: book.id,
                        title: book.title,
                        slug: book.slug,
                        publishStatus: book.publishStatus,
                        availabilityStatus: book.availabilityStatus,
                        priceAmount: book.priceAmount,
                        inventoryQuantity: book.inventoryQuantity,
                      }));
                      setActiveCatalogModal("book");
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        () =>
                          updateAdminBookStatus(book.id, {
                            publishStatus: book.publishStatus === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
                          }),
                        "Book status updated.",
                      )
                    }
                  >
                    Toggle publish
                  </button>
                  <button
                    className="button-outline"
                    type="button"
                    onClick={() => void handleAction(() => deleteAdminBook(book.id), "Book deleted.")}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {activeCatalogModal ? (
        <div className="admin-modal-backdrop" onClick={closeCatalogModal}>
          <section
            className={`admin-modal admin-modal--${activeCatalogModal}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-modal__header">
              <div>
                <div className="admin-toolbar__eyebrow">Catalog editor</div>
                <h2>
                  {activeCatalogModal === "author"
                    ? authorForm.id
                      ? "Edit author"
                      : "Create author"
                    : activeCatalogModal === "publisher"
                      ? publisherForm.id
                        ? "Edit publisher"
                        : "Create publisher"
                      : activeCatalogModal === "category"
                        ? categoryForm.id
                          ? "Edit category"
                          : "Create category"
                        : activeCatalogModal === "collection"
                          ? collectionForm.id
                            ? "Edit collection"
                            : "Create collection"
                          : String(bookForm.id || "")
                            ? "Edit book"
                            : "Create book"}
                </h2>
              </div>
              <button className="button-outline" type="button" onClick={closeCatalogModal}>
                Close
              </button>
            </div>

            {activeCatalogModal === "author" ? (
              <div className="admin-modal-form">
                <AdminModalSection
                  title="Author details"
                  description="Keep author identity and profile copy tidy."
                >
                  <div className="admin-form-grid">
                    <input
                      value={authorForm.name}
                      onChange={(event) => setAuthorForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Author name"
                    />
                    <input
                      value={authorForm.slug}
                      onChange={(event) => setAuthorForm((current) => ({ ...current, slug: event.target.value }))}
                      placeholder="Slug (optional)"
                    />
                    <textarea
                      value={authorForm.biography}
                      onChange={(event) => setAuthorForm((current) => ({ ...current, biography: event.target.value }))}
                      placeholder="Biography"
                    />
                  </div>
                </AdminModalSection>
                <div className="admin-form-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        async () => {
                          await (authorForm.id
                            ? updateAdminAuthor(authorForm.id, authorForm)
                            : createAdminAuthor(authorForm));
                          closeCatalogModal();
                          setAuthorForm(emptyAuthorForm);
                        },
                        authorForm.id ? "Author updated." : "Author created.",
                      )
                    }
                  >
                    {authorForm.id ? "Save author" : "Create author"}
                  </button>
                  <button className="button-outline" type="button" onClick={closeCatalogModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {activeCatalogModal === "publisher" ? (
              <div className="admin-modal-form">
                <AdminModalSection
                  title="Publisher details"
                  description="Use concise naming and a clean public description."
                >
                  <div className="admin-form-grid">
                    <input
                      value={publisherForm.name}
                      onChange={(event) => setPublisherForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Publisher name"
                    />
                    <input
                      value={publisherForm.slug}
                      onChange={(event) => setPublisherForm((current) => ({ ...current, slug: event.target.value }))}
                      placeholder="Slug (optional)"
                    />
                    <textarea
                      value={publisherForm.description}
                      onChange={(event) =>
                        setPublisherForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Description"
                    />
                  </div>
                </AdminModalSection>
                <div className="admin-form-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        async () => {
                          await (publisherForm.id
                            ? updateAdminPublisher(publisherForm.id, publisherForm)
                            : createAdminPublisher(publisherForm));
                          closeCatalogModal();
                          setPublisherForm(emptyPublisherForm);
                        },
                        publisherForm.id ? "Publisher updated." : "Publisher created.",
                      )
                    }
                  >
                    {publisherForm.id ? "Save publisher" : "Create publisher"}
                  </button>
                  <button className="button-outline" type="button" onClick={closeCatalogModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {activeCatalogModal === "category" ? (
              <div className="admin-modal-form">
                <AdminModalSection
                  title="Category details"
                  description="Group products under a clean, memorable label."
                >
                  <div className="admin-form-grid">
                    <input
                      value={categoryForm.name}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Category name"
                    />
                    <input
                      value={categoryForm.slug}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))}
                      placeholder="Slug (optional)"
                    />
                    <input
                      value={categoryForm.sortOrder}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                      }
                      placeholder="Sort order"
                    />
                    <textarea
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Description"
                    />
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={categoryForm.isFeatured}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, isFeatured: event.target.checked }))
                        }
                      />
                      Featured
                    </label>
                  </div>
                </AdminModalSection>
                <div className="admin-form-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        async () => {
                          await (categoryForm.id
                            ? updateAdminCategory(categoryForm.id, categoryForm)
                            : createAdminCategory(categoryForm));
                          closeCatalogModal();
                          setCategoryForm(emptyCategoryForm);
                        },
                        categoryForm.id ? "Category updated." : "Category created.",
                      )
                    }
                  >
                    {categoryForm.id ? "Save category" : "Create category"}
                  </button>
                  <button className="button-outline" type="button" onClick={closeCatalogModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {activeCatalogModal === "collection" ? (
              <div className="admin-modal-form">
                <AdminModalSection
                  title="Collection identity"
                  description="Curate a collection with a clear name, slug and cover."
                >
                  <div className="admin-form-grid">
                    <input
                      value={collectionForm.name}
                      onChange={(event) => setCollectionForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Collection name"
                    />
                    <input
                      value={collectionForm.slug}
                      onChange={(event) => setCollectionForm((current) => ({ ...current, slug: event.target.value }))}
                      placeholder="Slug (optional)"
                    />
                    <input
                      value={collectionForm.coverImageUrl}
                      onChange={(event) =>
                        setCollectionForm((current) => ({ ...current, coverImageUrl: event.target.value }))
                      }
                      placeholder="Cover image URL"
                    />
                    <textarea
                      value={collectionForm.description}
                      onChange={(event) =>
                        setCollectionForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Description"
                    />
                  </div>
                </AdminModalSection>

                <AdminModalSection
                  title="Visibility and composition"
                  description="Control publish state and which books belong in the set."
                >
                  <div className="admin-form-grid">
                    <select
                      value={collectionForm.publishStatus}
                      onChange={(event) =>
                        setCollectionForm((current) => ({ ...current, publishStatus: event.target.value }))
                      }
                    >
                      {publishOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      value={collectionForm.sortOrder}
                      onChange={(event) =>
                        setCollectionForm((current) => ({ ...current, sortOrder: Number(event.target.value) || 0 }))
                      }
                      placeholder="Sort order"
                    />
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={collectionForm.isFeatured}
                        onChange={(event) =>
                          setCollectionForm((current) => ({ ...current, isFeatured: event.target.checked }))
                        }
                      />
                      Featured
                    </label>
                    <textarea
                      value={collectionForm.bookIds}
                      onChange={(event) => setCollectionForm((current) => ({ ...current, bookIds: event.target.value }))}
                      placeholder="Book IDs, separated by commas"
                    />
                  </div>
                </AdminModalSection>
                <div className="admin-form-actions">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        async () => {
                          await (collectionForm.id
                            ? updateAdminCollection(collectionForm.id, {
                                ...collectionForm,
                                bookIds: collectionForm.bookIds,
                              })
                            : createAdminCollection({
                                ...collectionForm,
                                bookIds: collectionForm.bookIds,
                              }));
                          closeCatalogModal();
                          setCollectionForm(emptyCollectionForm);
                        },
                        collectionForm.id ? "Collection updated." : "Collection created.",
                      )
                    }
                  >
                    {collectionForm.id ? "Save collection" : "Create collection"}
                  </button>
                  <button className="button-outline" type="button" onClick={closeCatalogModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {activeCatalogModal === "book" ? (
              <div className="admin-modal-book-layout">
                <section className="admin-modal-book-section">
                  <div className="admin-modal-book-section__head">
                    <span>Basics</span>
                  </div>
                  <div className="admin-form-grid admin-form-grid--modal-book">
                    <input
                      value={String(bookForm.title ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Title"
                    />
                    <input
                      value={String(bookForm.slug ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, slug: event.target.value }))}
                      placeholder="Slug (optional)"
                    />
                    <select
                      value={String(bookForm.authorId ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, authorId: event.target.value }))}
                    >
                      <option value="">Select author</option>
                      {authors.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={String(bookForm.publisherId ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, publisherId: event.target.value }))}
                    >
                      <option value="">Select publisher</option>
                      {publishers.map((publisher) => (
                        <option key={publisher.id} value={publisher.id}>
                          {publisher.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={String(bookForm.isbn ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, isbn: event.target.value }))}
                      placeholder="ISBN"
                    />
                    <input
                      value={String(bookForm.languageCode ?? "")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, languageCode: event.target.value }))
                      }
                      placeholder="Language code"
                    />
                    <input
                      value={String(bookForm.pageCount ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, pageCount: event.target.value }))}
                      placeholder="Page count"
                    />
                    <input
                      value={String(bookForm.coverImageUrl ?? "")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, coverImageUrl: event.target.value }))
                      }
                      placeholder="Cover image URL"
                    />
                  </div>
                </section>

                <section className="admin-modal-book-section">
                  <div className="admin-modal-book-section__head">
                    <span>Commerce</span>
                  </div>
                  <div className="admin-form-grid admin-form-grid--modal-book">
                    <select
                      value={String(bookForm.publishStatus ?? "DRAFT")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, publishStatus: event.target.value }))
                      }
                    >
                      {publishOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      value={String(bookForm.availabilityStatus ?? "IN_STOCK")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, availabilityStatus: event.target.value }))
                      }
                    >
                      {availabilityOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input
                      value={String(bookForm.priceAmount ?? 0)}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, priceAmount: Number(event.target.value) || 0 }))
                      }
                      placeholder="Price amount"
                    />
                    <input
                      value={String(bookForm.compareAtAmount ?? "")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, compareAtAmount: event.target.value }))
                      }
                      placeholder="Compare at amount"
                    />
                    <input
                      value={String(bookForm.shippingFeeAmount ?? 30000)}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, shippingFeeAmount: Number(event.target.value) || 0 }))
                      }
                      placeholder="Shipping fee"
                    />
                    <input
                      value={String(bookForm.inventoryQuantity ?? 0)}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, inventoryQuantity: Number(event.target.value) || 0 }))
                      }
                      placeholder="Inventory quantity"
                    />
                    <input
                      value={String(bookForm.sortWeight ?? 0)}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, sortWeight: Number(event.target.value) || 0 }))
                      }
                      placeholder="Sort weight"
                    />
                  </div>
                </section>

                <section className="admin-modal-book-section">
                  <div className="admin-modal-book-section__head">
                    <span>Content</span>
                  </div>
                  <div className="admin-form-grid admin-form-grid--modal-book">
                    <textarea
                      value={String(bookForm.shortDescription ?? "")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, shortDescription: event.target.value }))
                      }
                      placeholder="Short description"
                    />
                    <textarea
                      value={String(bookForm.description ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Description"
                    />
                    <textarea
                      value={String(bookForm.keywords ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, keywords: event.target.value }))}
                      placeholder="Keywords, separated by commas"
                    />
                    <textarea
                      value={String(bookForm.metadata ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, metadata: event.target.value }))}
                      placeholder="Metadata JSON"
                    />
                  </div>
                </section>

                <section className="admin-modal-book-section">
                  <div className="admin-modal-book-section__head">
                    <span>Taxonomy</span>
                  </div>
                  <div className="admin-form-grid admin-form-grid--modal-book">
                    <textarea
                      value={String(bookForm.categoryIds ?? "")}
                      onChange={(event) => setBookForm((current) => ({ ...current, categoryIds: event.target.value }))}
                      placeholder="Category IDs, separated by commas"
                    />
                    <input
                      value={String(bookForm.primaryCategoryId ?? "")}
                      onChange={(event) =>
                        setBookForm((current) => ({ ...current, primaryCategoryId: event.target.value }))
                      }
                      placeholder="Primary category ID"
                    />
                  </div>
                </section>

                <section className="admin-modal-book-section">
                  <div className="admin-modal-book-section__head">
                    <span>Flags</span>
                  </div>
                  <div className="admin-form-grid admin-form-grid--modal-book-flags">
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(bookForm.isFeatured)}
                        onChange={(event) =>
                          setBookForm((current) => ({ ...current, isFeatured: event.target.checked }))
                        }
                      />
                      Featured
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(bookForm.isBestseller)}
                        onChange={(event) =>
                          setBookForm((current) => ({ ...current, isBestseller: event.target.checked }))
                        }
                      />
                      Bestseller
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={Boolean(bookForm.isRecommended)}
                        onChange={(event) =>
                          setBookForm((current) => ({ ...current, isRecommended: event.target.checked }))
                        }
                      />
                      Recommended
                    </label>
                  </div>
                </section>

                <div className="admin-form-actions admin-form-actions--book">
                  <button
                    className="button-primary"
                    type="button"
                    onClick={() =>
                      void handleAction(
                        async () => {
                          await (String(bookForm.id || "")
                            ? updateAdminBook(String(bookForm.id), bookForm)
                            : createAdminBook(bookForm));
                          closeCatalogModal();
                          setBookForm(emptyBookForm);
                        },
                        String(bookForm.id || "") ? "Book updated." : "Book created.",
                      )
                    }
                  >
                    {String(bookForm.id || "") ? "Save book" : "Create book"}
                  </button>
                  <button className="button-outline" type="button" onClick={closeCatalogModal}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

export function AdminAnalyticsPage() {
  return <Navigate to="/admin" replace />;
}

export function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast, setToast } = useAdminToast();
  const [orders, setOrders] = useState<AdminOrderViewModel[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<OrderStatus>("PLACED");
  const [cancelReason, setCancelReason] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const filters = {
    q: searchParams.get("q") ?? "",
    orderStatus: searchParams.get("orderStatus") ?? "",
    paymentStatus: searchParams.get("paymentStatus") ?? "",
    orderNumber: searchParams.get("orderNumber") ?? "",
  };

  const orderStatusOptions: OrderStatus[] = [
    "PLACED",
    "AWAITING_TRANSFER",
    "CONFIRMED",
    "PACKED",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  const paymentStatusOptions: PaymentStatus[] = [
    "PENDING",
    "AWAITING_VERIFICATION",
    "PAID",
    "FAILED",
  ];

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextOrders = await getAdminOrders({
        q: filters.q,
        orderStatus: filters.orderStatus,
        paymentStatus: filters.paymentStatus,
      });
      setOrders(nextOrders);

      const selectedOrderNumber = filters.orderNumber || nextOrders[0]?.orderNumber;
      if (!selectedOrderNumber) {
        setSelectedOrder(null);
        return;
      }

      const detail = await getAdminOrder(selectedOrderNumber);
      setSelectedOrder(detail);
      setStatusDraft(detail.status);
      setCancelReason(detail.cancellationReason ?? "");
      setInternalNote(detail.internalNote ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong the tai admin orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [filters.q, filters.orderStatus, filters.paymentStatus, filters.orderNumber]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="Khong the tai order ops" message={error} />;

  const handleAction = async (action: () => Promise<AdminOrderViewModel>, successMessage: string) => {
    try {
      const updated = await action();
      setSelectedOrder(updated);
      await refresh();
      setToast({ kind: "success", message: successMessage });
    } catch (actionError) {
      setToast({
        kind: "error",
        message: actionError instanceof Error ? actionError.message : "Khong the thuc hien thao tac order ops.",
      });
    }
  };

  return (
    <AdminShell
      tab="orders"
      title="Order operations"
      toast={toast}
    >
      <section className="admin-metrics-grid">
        <AdminMetricCard
          label="Orders in view"
          value={String(orders.length)}
          tone="accent"
        />
        <AdminMetricCard
          label="Awaiting transfer"
          value={String(orders.filter((order) => order.status === "AWAITING_TRANSFER").length)}
          note="Bank transfer orders waiting for verification"
        />
        <AdminMetricCard
          label="Packed or shipped"
          value={String(
            orders.filter((order) => order.status === "PACKED" || order.status === "SHIPPED").length,
          )}
          note="Active fulfillment workload"
        />
        <AdminMetricCard
          label="Cancelled"
          value={String(orders.filter((order) => order.status === "CANCELLED").length)}
          note="Orders closed by ops or customer cancellation"
        />
      </section>

      <section className="admin-panel admin-panel--toolbar">
        <div className="admin-toolbar">
          <div>
            <div className="admin-toolbar__eyebrow">Order search</div>
            <h2>Fulfillment queue</h2>
          </div>

          <div className="admin-filter-row admin-filter-row--toolbar">
            <input
              value={filters.q}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value.trim()) next.set("q", event.target.value);
                else next.delete("q");
                setSearchParams(next);
              }}
              placeholder="Search order number, customer, phone..."
            />
            <select
              value={filters.orderStatus}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) next.set("orderStatus", event.target.value);
                else next.delete("orderStatus");
                setSearchParams(next);
              }}
            >
              <option value="">All order statuses</option>
              {orderStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={filters.paymentStatus}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) next.set("paymentStatus", event.target.value);
                else next.delete("paymentStatus");
                setSearchParams(next);
              }}
            >
              <option value="">All payment statuses</option>
              {paymentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="admin-orders-layout">
        <section className="admin-panel">
          <SectionHeader eyebrow="Orders" title="Order list" />
          <div className="admin-order-list">
            {orders.map((order) => (
              <button
                className={`admin-order-card${selectedOrder?.orderNumber === order.orderNumber ? " active" : ""}`}
                key={order.orderNumber}
                type="button"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("orderNumber", order.orderNumber);
                  setSearchParams(next);
                }}
              >
                <div className="admin-order-card__head">
                  <strong>{order.orderNumber}</strong>
                  <span>{new Date(order.placedAt).toLocaleString("vi-VN")}</span>
                </div>
                <div className="admin-order-card__meta">
                  <span>{order.customerFullName}</span>
                  <span>{order.customerPhoneNumber}</span>
                  <span>{order.itemCount} items</span>
                </div>
                <div className="admin-order-card__status">
                  <span className={`admin-status-chip admin-status-chip--${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                  <span className={`admin-status-chip admin-status-chip--payment-${order.paymentStatus.toLowerCase()}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <div className="admin-order-card__price">
                  <strong>{formatCompactCurrency(order.totalAmount)}</strong>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <SectionHeader
            eyebrow="Detail"
            title={selectedOrder ? `Order ${selectedOrder.orderNumber}` : "Order detail"}
          />
          {selectedOrder ? (
            <div className="admin-order-detail">
              <div className="admin-order-detail__summary">
                <article className="admin-summary-card">
                  <span>Customer</span>
                  <strong>{selectedOrder.customerFullName}</strong>
                  <p>{selectedOrder.customerPhoneNumber}</p>
                </article>
                <article className="admin-summary-card">
                  <span>Payment</span>
                  <strong>{selectedOrder.paymentMethod}</strong>
                  <p>{selectedOrder.paymentStatus}</p>
                </article>
                <article className="admin-summary-card">
                  <span>Total</span>
                  <strong>{formatCompactCurrency(selectedOrder.totalAmount)}</strong>
                  <p>{selectedOrder.itemCount} items</p>
                </article>
              </div>

              <div className="admin-order-kv">
                <div><span>Status</span><strong>{selectedOrder.status}</strong></div>
                <div><span>Email</span><strong>{selectedOrder.customerEmail ?? "Guest order"}</strong></div>
                <div><span>Placed at</span><strong>{new Date(selectedOrder.placedAt).toLocaleString("vi-VN")}</strong></div>
                <div>
                  <span>Address</span>
                  <strong>
                    {selectedOrder.address
                      ? `${selectedOrder.address.addressLine1}, ${selectedOrder.address.district}, ${selectedOrder.address.province}`
                      : "No address"}
                  </strong>
                </div>
              </div>

              <div className="admin-grid admin-grid--order-actions">
                <section className="admin-order-action-card">
                  <h3>Update status</h3>
                  <div className="admin-form-grid">
                    <select value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as OrderStatus)}>
                      {orderStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-actions">
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() =>
                        void handleAction(
                          () => updateAdminOrderStatus(selectedOrder.orderNumber, { status: statusDraft }),
                          "Order status updated.",
                        )
                      }
                    >
                      Save status
                    </button>
                  </div>
                </section>

                <section className="admin-order-action-card">
                  <h3>Internal note</h3>
                  <div className="admin-form-grid">
                    <textarea
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      placeholder="Ops notes visible only to admin..."
                    />
                  </div>
                  <div className="admin-form-actions">
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() =>
                        void handleAction(
                          () =>
                            updateAdminOrderInternalNote(selectedOrder.orderNumber, {
                              internalNote,
                            }),
                          "Internal note updated.",
                        )
                      }
                    >
                      Save note
                    </button>
                  </div>
                </section>
              </div>

              <div className="admin-grid admin-grid--order-actions">
                <section className="admin-order-action-card">
                  <h3>Bank transfer verification</h3>
                  <p>
                    Use this when you have confirmed the bank transfer and want to mark the order as paid.
                  </p>
                  <div className="admin-form-actions">
                    <button
                      className="button-primary"
                      type="button"
                      onClick={() =>
                        void handleAction(
                          () => markAdminOrderTransferReceived(selectedOrder.orderNumber, {}),
                          "Transfer marked as received.",
                        )
                      }
                    >
                      Confirm transfer
                    </button>
                  </div>
                </section>

                <section className="admin-order-action-card">
                  <h3>Cancel order</h3>
                  <div className="admin-form-grid">
                    <textarea
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Cancellation reason"
                    />
                  </div>
                  <div className="admin-form-actions">
                    <button
                      className="button-outline"
                      type="button"
                      onClick={() =>
                        void handleAction(
                          () => cancelAdminOrder(selectedOrder.orderNumber, { reason: cancelReason }),
                          "Order cancelled.",
                        )
                      }
                    >
                      Cancel order
                    </button>
                  </div>
                </section>
              </div>

              <section className="admin-order-section">
                <h3>Items</h3>
                <div className="admin-list">
                  {selectedOrder.items.map((item) => (
                    <article className="admin-list-row" key={item.id}>
                      <div>
                        <strong>{item.bookTitle}</strong>
                        <span>{item.authorName} · {item.publisherName}</span>
                      </div>
                      <div className="admin-list-row__meta">
                        <span>{item.quantity} x {formatCompactCurrency(item.unitPriceAmount)}</span>
                        <strong>{formatCompactCurrency(item.lineSubtotalAmount)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="admin-order-section">
                <h3>Payment records</h3>
                <div className="admin-list">
                  {selectedOrder.payments.map((payment) => (
                    <article className="admin-list-row" key={payment.id}>
                      <div>
                        <strong>{payment.method}</strong>
                        <span>
                          Attempt {payment.attemptNumber}
                          {payment.externalReference ? ` · ${payment.externalReference}` : ""}
                        </span>
                      </div>
                      <div className="admin-list-row__meta">
                        <span className={`admin-status-chip admin-status-chip--payment-${payment.status.toLowerCase()}`}>
                          {payment.status}
                        </span>
                        <strong>{formatCompactCurrency(payment.amount)}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="admin-empty-state">
              <strong>Chua co don hang nao trong bo loc hien tai.</strong>
              <span>Thu nhoi rong bo loc hoac tim theo ma don khac.</span>
            </div>
          )}
        </section>
      </section>
    </AdminShell>
  );
}

export function AdminContentOpsPage() {
  const { toast, setToast } = useAdminToast();
  const [jobs, setJobs] = useState<AdminImportJobViewModel[]>([]);
  const [stagedBooks, setStagedBooks] = useState<AdminStagedBookViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [importForm, setImportForm] = useState({
    source: "manual-admin",
    sourceReference: "",
    records:
      '[\n  {\n    "title": "Sample staged book",\n    "authorName": "Unknown",\n    "publisherName": "Unknown Publisher",\n    "priceAmount": 120000,\n    "keywords": ["sample"]\n  }\n]',
  });

  const filters = {
    q: searchParams.get("q") ?? "",
    stagedStatus: searchParams.get("stagedStatus") ?? "",
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextJobs, nextStagedBooks] = await Promise.all([
        getAdminImportJobs(),
        getAdminStagedBooks(filters),
      ]);
      setJobs(nextJobs);
      setStagedBooks(nextStagedBooks);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Khong the tai content ops.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [filters.q, filters.stagedStatus]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState title="Khong the tai content ops" message={error} />;

  const handleAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      await refresh();
      setToast({ kind: "success", message: successMessage });
    } catch (actionError) {
      setToast({
        kind: "error",
        message:
          actionError instanceof Error ? actionError.message : "Khong the thuc hien thao tac content ops.",
      });
    }
  };

  const stageCounts = useMemo(
    () =>
      ({
        IMPORTED: countByStatus(stagedBooks.map((book) => book.status), "IMPORTED"),
        IN_REVIEW: countByStatus(stagedBooks.map((book) => book.status), "IN_REVIEW"),
        APPROVED: countByStatus(stagedBooks.map((book) => book.status), "APPROVED"),
        REJECTED: countByStatus(stagedBooks.map((book) => book.status), "REJECTED"),
        PUBLISHED: countByStatus(stagedBooks.map((book) => book.status), "PUBLISHED"),
      }) satisfies Record<StagedBookStatus, number>,
    [stagedBooks],
  );

  return (
    <AdminShell
      tab="content-ops"
      title="Content operations"
      lead="Nhap, review, approve, reject va publish staged book records trong mot workflow ro hon."
      toast={toast}
    >
      <section className="admin-metrics-grid">
        <AdminMetricCard
          label="Import jobs"
          value={String(jobs.length)}
          note="Recent jobs fetched from admin API"
          tone="accent"
        />
        <AdminMetricCard
          label="In review"
          value={String(stageCounts.IN_REVIEW)}
          note="Records actively waiting for editorial review"
        />
        <AdminMetricCard
          label="Approved"
          value={String(stageCounts.APPROVED)}
          note="Ready to publish or map into catalog"
        />
        <AdminMetricCard
          label="Rejected"
          value={String(stageCounts.REJECTED)}
          note="Items needing fix or import cleanup"
        />
      </section>

      <section className="admin-grid admin-grid--content-ops">
        <section className="admin-panel">
          <SectionHeader eyebrow="Import" title="Create staged import job" />
          <div className="admin-form-grid">
            <input
              value={importForm.source}
              onChange={(event) => setImportForm((current) => ({ ...current, source: event.target.value }))}
              placeholder="Source"
            />
            <input
              value={importForm.sourceReference}
              onChange={(event) =>
                setImportForm((current) => ({ ...current, sourceReference: event.target.value }))
              }
              placeholder="Source reference"
            />
            <textarea
              value={importForm.records}
              onChange={(event) => setImportForm((current) => ({ ...current, records: event.target.value }))}
              placeholder="Records JSON array"
            />
            <div className="admin-form-actions">
              <button
                className="button-primary"
                type="button"
                onClick={() =>
                  void handleAction(
                    () =>
                      createAdminImportJob({
                        source: importForm.source,
                        sourceReference: importForm.sourceReference,
                        records: importForm.records,
                      }),
                    "Import job created.",
                  )
                }
              >
                Create import job
              </button>
            </div>
          </div>
        </section>

        <section className="admin-panel">
          <SectionHeader eyebrow="Jobs" title="Import jobs" />
          <div className="admin-list">
            {jobs.map((job) => (
              <article className="admin-list-row" key={job.id}>
                <div>
                  <strong>{job.source}</strong>
                  <span>{job.status}</span>
                </div>
                <div className="admin-list-row__meta">
                  <span>{job.totalRecords} total</span>
                  <span>{job.failedRecords} failed</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div>
            <div className="admin-toolbar__eyebrow">Review queue</div>
            <h2>Staged books</h2>
            <p>Filter incoming records, then normalize, approve, reject or publish from the same queue.</p>
          </div>

          <div className="admin-filter-row admin-filter-row--toolbar">
            <input
              value={filters.q}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value.trim()) next.set("q", event.target.value);
                else next.delete("q");
                setSearchParams(next);
              }}
              placeholder="Search staged title..."
            />
            <select
              value={filters.stagedStatus}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams);
                if (event.target.value) next.set("stagedStatus", event.target.value);
                else next.delete("stagedStatus");
                setSearchParams(next);
              }}
            >
              <option value="">All staged statuses</option>
              {["IMPORTED", "IN_REVIEW", "APPROVED", "REJECTED", "PUBLISHED"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-staged-list">
          {stagedBooks.map((book) => (
            <article className="admin-staged-row" key={book.id}>
              <div className="admin-staged-row__main">
                <strong>{book.title}</strong>
                <div className="admin-staged-row__meta">
                  <span>{book.authorName ?? "Unknown author"}</span>
                  <span>{book.publisherName ?? "Unknown publisher"}</span>
                  <span>{book.normalizedSlug ?? "Not normalized yet"}</span>
                </div>
              </div>
              <div className="admin-staged-row__status">
                <span className={`admin-status-chip admin-status-chip--${book.status.toLowerCase()}`}>
                  {book.status}
                </span>
                {book.rejectReason ? <span>{book.rejectReason}</span> : null}
              </div>
              <div className="admin-inline-actions">
                <button
                  className="button-outline"
                  type="button"
                  onClick={() => void handleAction(() => normalizeAdminStagedBook(book.id), "Staged book normalized.")}
                >
                  Normalize
                </button>
                <button
                  className="button-outline"
                  type="button"
                  onClick={() => void handleAction(() => approveAdminStagedBook(book.id), "Staged book approved.")}
                >
                  Approve
                </button>
                <button
                  className="button-outline"
                  type="button"
                  onClick={() =>
                    void handleAction(
                      () => rejectAdminStagedBook(book.id, "Rejected from admin FE"),
                      "Staged book rejected.",
                    )
                  }
                >
                  Reject
                </button>
                <button
                  className="button-outline"
                  type="button"
                  onClick={() => void handleAction(() => publishAdminStagedBook(book.id), "Staged book published.")}
                >
                  Publish
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
