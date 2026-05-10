import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getSearchSuggestions } from "../lib/api";
import type {
  ActiveFilterViewModel,
  BreadcrumbItem,
  CatalogFiltersViewModel,
  CollectionSummaryViewModel,
  HomePageModel,
  PaginationViewModel,
  ProductCardViewModel,
  ProductDetailPageModel,
  SearchPageModel,
  SearchSuggestionsResponse,
} from "../types/api";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";
import { authorShowcase, blogCards, lifestyleGallery, promoCards, publisherMarks, services, vendorMarks } from "./fixtures";
import { buildSectionId, joinBookCollections } from "../lib/format";
import {
  BreadcrumbHero,
  ProductCard,
  SectionHeader,
  StorefrontChipRow,
  StorefrontEmptyState,
  StorefrontPageSection,
  StorefrontIntro,
  StorefrontProductGrid,
  readCartCount,
} from "./components-shared";

const categoryTones = ["#1e8a7b", "#fe7a4a", "#4da8ff", "#f4a415", "#ff5a4a", "#7a66ff"];

function starRow() {
  return "*****";
}

function pickBooks(pool: ProductCardViewModel[], count: number) {
  if (pool.length === 0) {
    return [];
  }

  const books = [...pool];
  while (books.length < count) {
    books.push(pool[books.length % pool.length]!);
  }

  return books.slice(0, count);
}

function uniqueBooks(pool: ProductCardViewModel[]) {
  const seen = new Set<string>();
  return pool.filter((book) => {
    if (seen.has(book.id)) {
      return false;
    }
    seen.add(book.id);
    return true;
  });
}

const FILTER_VISIBLE_LIMIT = 8;
type FilterGroupKey = "category" | "author" | "publisher" | "availability";

export function AnnouncementBar() {
  return (
    <div className="announcement-bar">
      <div className="container announcement-bar__inner">
        <div className="announcement-bar__group">
          <span>+84 1800 1515</span>
          <span>nguyentatthang@bookverse.com</span>
        </div>
        <div className="announcement-bar__group">
          <div className="social-dots" aria-hidden="true">
            <span>f</span>
            <span>ig</span>
            <span>in</span>
            <span>x</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logoutUser, user } = useAuth();
  const { cart, errorMessage, mutation, removeItem, updateQuantity } = useCart();
  const [query, setQuery] = useState("");
  const [compactHeader, setCompactHeader] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResponse | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmingRemoveItemId, setConfirmingRemoveItemId] = useState<string | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;

      setCompactHeader((current) => {
        if (current) {
          return scrollY > 56;
        }

        return scrollY > 120;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setSuggestions(null);
      setSuggestionsOpen(false);
      setLoadingSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoadingSuggestions(true);
      getSearchSuggestions(normalizedQuery, controller.signal)
        .then((data) => {
          setSuggestions(data);
          setSuggestionsOpen(true);
        })
        .catch(() => {
          setSuggestions(null);
          setSuggestionsOpen(false);
        })
        .finally(() => {
          setLoadingSuggestions(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    setSuggestionsOpen(false);
    setCartOpen(false);
    setConfirmingRemoveItemId(null);
    setAccountMenuOpen(false);
  }, [location.pathname, location.search]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();

    const params = new URLSearchParams();
    if (normalizedQuery) {
      params.set("q", normalizedQuery);
    }
    setSuggestionsOpen(false);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const searchIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 15.2l4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );

  const heartIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s-6.5-4.2-8.4-8c-1.4-2.8.1-6 3.4-6 2 0 3.2 1 4 2.2.8-1.2 2-2.2 4-2.2 3.3 0 4.8 3.2 3.4 6C18.5 15.8 12 20 12 20z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );

  const userIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5.5 18c1.7-2.8 4.2-4.2 6.5-4.2s4.8 1.4 6.5 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );

  const cartIcon = (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h2l1.3 7.2h9.7l2-5.2H8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="18" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17" cy="18" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );

  const itemCount = readCartCount(cart);

  return (
    <>
      <header className={`site-header${compactHeader ? " site-header--compact" : ""}`}>
        <AnnouncementBar />
        <div className="container site-header__main">
          <Link to="/" className="brand-mark" aria-label="BookStore home">
            <span className="brand-mark__cube" aria-hidden="true" />
            <span className="brand-mark__wordmark">BookVerse</span>
          </Link>

          <form className="search-panel" onSubmit={handleSearchSubmit}>
            <span className="search-panel__label">Search</span>
            <div className="search-panel__field">
              <input
                name="q"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search products..."
                aria-label="Search books"
                autoComplete="off"
              />

              {suggestionsOpen && suggestions ? (
                <div className="search-suggestions">
                  {loadingSuggestions ? <div className="search-suggestions__status">Searching...</div> : null}

                  {suggestions.queries.length > 0 ? (
                    <div className="search-suggestions__group">
                      <div className="search-suggestions__title">Suggested queries</div>
                      {suggestions.queries.map((item) => (
                        <Link className="search-suggestions__item" key={item.href} to={item.href}>
                          <strong>{item.label}</strong>
                          {item.note ? <span>{item.note}</span> : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {suggestions.books.length > 0 ? (
                    <div className="search-suggestions__group">
                      <div className="search-suggestions__title">Books</div>
                      {suggestions.books.map((item) => (
                        <Link className="search-suggestions__item" key={item.href} to={item.href}>
                          <strong>{item.label}</strong>
                          {item.note ? <span>{item.note}</span> : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  {suggestions.topics.length > 0 ? (
                    <div className="search-suggestions__group">
                      <div className="search-suggestions__title">Topics</div>
                      {suggestions.topics.map((item) => (
                        <Link className="search-suggestions__item" key={item.href} to={item.href}>
                          <strong>{item.label}</strong>
                          {item.note ? <span>{item.note}</span> : null}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <Link className="search-suggestions__all" to={suggestions.viewAllHref}>
                    View all results
                  </Link>
                </div>
              ) : null}
            </div>
            <button className="search-panel__submit" type="submit">
              {searchIcon}
            </button>
          </form>

          <div className="header-actions">
            <div className="header-actions__cluster" aria-label="Quick actions">
              <span className="icon-button">{heartIcon}</span>
              <div className="header-account">
                <button
                  className={`icon-button${isAuthenticated ? " icon-button--account-active" : ""}`}
                  type="button"
                  aria-label={isAuthenticated ? "Open account menu" : "Go to login"}
                  onClick={() => {
                    if (!isAuthenticated) {
                      navigate(`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`);
                      return;
                    }

                    setAccountMenuOpen((current) => !current);
                  }}
                >
                  {userIcon}
                </button>

                {accountMenuOpen && isAuthenticated ? (
                  <div className="header-account__menu">
                    <div className="header-account__summary">
                      <strong>{user?.fullName}</strong>
                      <span>{user?.email}</span>
                    </div>
                    {user?.role === "ADMIN" ? (
                      <Link className="header-account__item" to="/admin">
                        Admin dashboard
                      </Link>
                    ) : null}
                    <Link className="header-account__item" to="/account">
                      Account
                    </Link>
                    <Link className="header-account__item" to="/account/orders">
                      Orders
                    </Link>
                    <button
                      className="header-account__item header-account__item--button"
                      type="button"
                      onClick={() => {
                        void logoutUser()
                          .then(() => {
                            navigate("/");
                          })
                          .catch(() => undefined);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                className={`icon-button icon-button--cart${itemCount > 0 ? " icon-button--cart-active" : ""}`}
                type="button"
                aria-label={`Open cart. Current item count: ${itemCount}`}
                onClick={() => setCartOpen(true)}
              >
                {cartIcon}
                {itemCount > 0 ? <span className="icon-button__badge">{itemCount}</span> : null}
              </button>
            </div>
          </div>
        </div>

        <div className="site-header__subnav">
          <div className="container site-header__subnav-inner">
            <nav className="main-links" aria-label="Primary">
              <Link className={location.pathname === "/" ? "active" : ""} to="/">
                Home
              </Link>
              <Link
                className={
                  location.pathname.startsWith("/books") || location.pathname.startsWith("/categories")
                    ? "active"
                    : ""
                }
                to="/books"
              >
                Products
              </Link>
              <Link className={location.pathname.startsWith("/collections") ? "active" : ""} to="/collections">
                Collection
              </Link>
              <a href="#about">About Us</a>
            </nav>

            <div className="support-blurb">
              <strong>+1800 1515</strong>
              <span>24/7 Support Center</span>
            </div>
          </div>
        </div>
      </header>

      {cartOpen ? (
        <>
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
          />
          <aside className="cart-drawer" aria-label="Shopping cart">
            <div className="cart-drawer__header">
              <div>
                <span className="cart-drawer__eyebrow">Shopping cart</span>
                <h2>Your cart</h2>
                <p className="cart-drawer__subcopy">
                  {itemCount === 0 ? "Ready for your next pick." : `${itemCount} item${itemCount > 1 ? "s" : ""} ready for checkout.`}
                </p>
              </div>
              <button className="pill-button" type="button" onClick={() => setCartOpen(false)}>
                Close
              </button>
            </div>

            {errorMessage ? <div className="cart-drawer__notice cart-drawer__notice--error">{errorMessage}</div> : null}

            {cart?.warnings.length ? (
              <div className="cart-drawer__warning-list">
                {cart.warnings.map((warning) => (
                  <div
                    className={`cart-drawer__notice cart-drawer__notice--${warning.tone}`}
                    key={`${warning.code}-${warning.message}`}
                  >
                    {warning.message}
                  </div>
                ))}
              </div>
            ) : null}

            {cart && !cart.isEmpty ? (
              <>
                <div className="cart-drawer__body">
                  <div className="cart-drawer__items">
                    {cart.items.map((item) => (
                      <article className="cart-drawer__item" key={item.id}>
                        <Link className="cart-drawer__image" to={item.detailHref} onClick={() => setCartOpen(false)}>
                          <img src={item.coverImageUrl ?? "/images/books/1.jpg"} alt={item.title} loading="lazy" />
                        </Link>
                        <div className="cart-drawer__content">
                          <div className="cart-drawer__content-top">
                            <div>
                              <Link className="cart-drawer__title" to={item.detailHref} onClick={() => setCartOpen(false)}>
                                {item.title}
                              </Link>
                              <p className="cart-drawer__meta">{item.authorName}</p>
                            </div>
                            <button
                              className="cart-drawer__remove"
                              type="button"
                              disabled={mutation.type === "remove" && mutation.itemId === item.id}
                              onClick={() => {
                                setConfirmingRemoveItemId((current) => (current === item.id ? null : item.id));
                              }}
                            >
                              Remove
                            </button>
                          </div>

                          <div className="cart-drawer__content-bottom">
                            <div className="cart-drawer__stepper">
                              <button
                                type="button"
                                disabled={item.quantity <= 1 || (mutation.type === "quantity" && mutation.itemId === item.id)}
                                onClick={() => {
                                  void updateQuantity(item.id, Math.max(1, item.quantity - 1)).catch(() => undefined);
                                }}
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                type="button"
                                disabled={
                                  item.quantity >= item.maxQuantity ||
                                  (mutation.type === "quantity" && mutation.itemId === item.id)
                                }
                                onClick={() => {
                                  void updateQuantity(item.id, Math.min(item.maxQuantity, item.quantity + 1)).catch(
                                    () => undefined,
                                  );
                                }}
                              >
                                +
                              </button>
                            </div>
                            <div className="cart-drawer__price">
                              <strong>{item.lineTotal.formatted}</strong>
                              <span>{item.unitPrice.formatted} each</span>
                            </div>
                          </div>

                          {confirmingRemoveItemId === item.id ? (
                            <div className="cart-drawer__confirm">
                              <p>Remove this book from your cart?</p>
                              <div className="cart-drawer__confirm-actions">
                                <button
                                  className="cart-drawer__confirm-btn cart-drawer__confirm-btn--ghost"
                                  type="button"
                                  onClick={() => setConfirmingRemoveItemId(null)}
                                >
                                  Keep
                                </button>
                                <button
                                  className="cart-drawer__confirm-btn cart-drawer__confirm-btn--danger"
                                  type="button"
                                  disabled={mutation.type === "remove" && mutation.itemId === item.id}
                                  onClick={() => {
                                    void removeItem(item.id)
                                      .then(() => {
                                        setConfirmingRemoveItemId(null);
                                      })
                                      .catch(() => undefined);
                                  }}
                                >
                                  Confirm remove
                                </button>
                              </div>
                            </div>
                          ) : null}

                          {item.warning ? <div className="cart-drawer__item-note">{item.warning}</div> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="cart-drawer__bottom">
                  <div className="cart-drawer__summary-shell">
                    <div className="cart-drawer__summary">
                      <div className="cart-drawer__summary-row">
                        <span>Items</span>
                        <strong>{cart.summary.itemCount}</strong>
                      </div>
                      <div className="cart-drawer__summary-row">
                        <span>Subtotal</span>
                        <strong>{cart.summary.subtotal.formatted}</strong>
                      </div>
                      <div className="cart-drawer__summary-row">
                        <span>Shipping</span>
                        <strong>{cart.summary.shippingFee.formatted}</strong>
                      </div>
                      <div className="cart-drawer__summary-row cart-drawer__summary-row--total">
                        <span>Total</span>
                        <strong>{cart.summary.total.formatted}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="cart-drawer__footer">
                    <Link className="button-primary cart-drawer__checkout" to="/checkout" onClick={() => setCartOpen(false)}>
                      Checkout now
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="cart-drawer__empty">
                <h3>Cart is ready for your next pick</h3>
                <p>Add from product detail, listing or search and your header cart state will update here instantly.</p>
                <button className="button-primary" type="button" onClick={() => setCartOpen(false)}>
                  Keep browsing
                </button>
              </div>
            )}
          </aside>
        </>
      ) : null}
    </>
  );
}

export function HeroSection({ page }: { page: HomePageModel }) {
  const spotlight = page.spotlightBook ?? page.featuredBooks[0] ?? page.bestsellerBooks[0];
  const stackBooks = pickBooks([...page.featuredBooks, ...page.bestsellerBooks], 6);
  const visualHighlights = [
    page.featuredBooks[0],
    page.bestsellerBooks[0],
    page.featuredBooks[1],
    page.bestsellerBooks[1],
  ].filter(Boolean);

  return (
    <section className="page-section">
      <div className="hero-shell">
        <div className="container hero-shell__inner">
          <div className="hero-card">
            <div className="hero-card__grid">
              <div className="hero-copy">
                <span className="hero-copy__eyebrow">Special Offer</span>
                <div className="hero-copy__kicker">Bookstore storefront</div>
                <h1>There is nothing better than to read</h1>
                <p>
                  Khám phá tuyển chọn sách được sắp xếp gọn gàng, dễ duyệt, có điểm nhấn thị giác rõ ràng và dẫn
                  lối nhanh tới những tựa đáng đọc nhất.
                </p>
                <div className="hero-actions">
                  <Link className="button-primary" to={page.banner.primaryCta.href}>
                    Shop now
                  </Link>
                  <Link className="button-secondary" to={page.banner.secondaryCta.href}>
                    Explore shelves
                  </Link>
                </div>
                <div className="hero-stats">
                  {page.stats.map((item) => (
                    <div className="hero-stat" key={item.label}>
                      <strong>{item.value}</strong>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="hero-visual" aria-hidden="true">
                <div className="hero-visual__panel">
                  <div className="hero-visual__cluster">
                    {visualHighlights.map((book, index) => (
                      <img
                        key={`${book?.id ?? "hero"}-${index}`}
                        className={`hero-visual__cover hero-visual__cover--${index + 1}`}
                        src={book?.coverImageUrl ?? "/images/books/1.jpg"}
                        alt={book?.title ?? ""}
                        loading="lazy"
                      />
                    ))}
                  </div>

                  <div className="book-stack">
                    {stackBooks.map((book, index) => (
                      <div
                        key={`${book.id}-${index}`}
                        className="book-stack__slab"
                        style={
                          {
                            "--offset": index,
                            "--size": (index % 3) + 1,
                            "--tilt": `${[-7, -2, 4, 7, -5, 3][index] ?? 0}deg`,
                            "--spine": ["#ffd67b", "#ff9b6f", "#7be0ff", "#7bdca8", "#f4a8ff", "#f7f3ae"][
                              index
                            ],
                          } as CSSProperties
                        }
                      >
                        <span>{book.title.split(" ").slice(0, 2).join(" ")}</span>
                        <span>{book.authorName}</span>
                      </div>
                    ))}
                    {spotlight ? (
                      <div
                        className="book-stack__slab"
                        style={
                          {
                            "--offset": 6.4,
                            "--size": 5,
                            "--tilt": "-12deg",
                            "--spine": "#fff4d7",
                          } as CSSProperties
                        }
                      >
                        <span>{spotlight.title}</span>
                        <span>Featured</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="author-rail">
          {authorShowcase.map((author, index) => (
            <article
              key={author.name}
              className={`author-rail__card${index === 1 || index === 4 ? " author-rail__card--offset" : ""}`}
            >
              <div className="author-rail__portrait-wrap">
                <img className="author-rail__portrait" src={author.image} alt={author.name} loading="lazy" />
              </div>
              <strong>{author.name}</strong>
              <span>{author.note}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PromoGrid() {
  return (
    <section className="page-section">
      <div className="container promo-grid">
        {promoCards.map((card) => (
          <article key={card.title} className={`promo-card promo-card--${card.tone}`}>
            <span className="promo-card__eyebrow">{card.eyebrow}</span>
            <h3>{card.title}</h3>
            <p>{card.copy}</p>
            <button className="button-primary" type="button">
              {card.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function CollectionShowcase({ page }: { page: HomePageModel }) {
  const collectionCards = page.collectionSections;
  const [currentIndex, setCurrentIndex] = useState(0);
  const maxIndex = Math.max(0, collectionCards.length - 4);

  useEffect(() => {
    setCurrentIndex(0);
  }, [collectionCards.length]);

  const prevSlide = () => {
    setCurrentIndex((value) => Math.max(0, value - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((value) => Math.min(maxIndex, value + 1));
  };

  return (
    <section className="page-section">
      <div className="container">
        <SectionHeader title="Featured Collections" linkLabel="View all collections" linkHref="/collections" />
        <div className="collection-showcase">
          {collectionCards.length > 4 ? (
            <button
              className="collection-showcase__nav collection-showcase__nav--prev"
              type="button"
              onClick={prevSlide}
              disabled={currentIndex === 0}
              aria-label="Previous collections"
            >
              ‹
            </button>
          ) : null}

          <div className="collection-showcase__viewport">
            <div
              className="vendor-grid vendor-grid--carousel"
              style={{ transform: `translateX(calc(-${currentIndex} * (25% + 4.5px)))` }}
            >
              {collectionCards.map((collection) => (
                <Link className="vendor-card vendor-card--link" key={collection.slug} to={collection.href}>
                  <div className="vendor-card__books">
                    {collection.books.slice(0, 4).map((book) => (
                      <img
                        key={`${collection.slug}-${book.id}`}
                        className="vendor-card__mini"
                        src={book.coverImageUrl ?? "/images/books/2.jpg"}
                        alt={book.title}
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <h4>{collection.name}</h4>
                  <p>
                    {collection.description ??
                      `Khám phá ${collection.count} tựa sách được tuyển chọn trong bộ sưu tập này.`}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {collectionCards.length > 4 ? (
            <button
              className="collection-showcase__nav collection-showcase__nav--next"
              type="button"
              onClick={nextSlide}
              disabled={currentIndex >= maxIndex}
              aria-label="Next collections"
            >
              ›
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function CollectionsLandingExperience(props: {
  collections: CollectionSummaryViewModel[];
  page: number;
  totalPages: number;
}) {
  const paginationItems = Array.from({ length: props.totalPages }, (_, index) => index + 1);

  return (
    <StorefrontPageShell
      eyebrow="Collections"
      title="Curated Collections"
      lead="Khám phá các bộ sưu tập nổi bật và chuyên đề đọc sách được tuyển chọn sẵn, mỗi bộ đều có câu chuyện và nhịp lựa chọn riêng."
      breadcrumb={[
        { label: "Trang chủ", href: "/" },
        { label: "Bộ sưu tập", active: true },
      ]}
    >
      <StorefrontPageSection>
        <StorefrontIntro>
          <p>
            Từ các lựa chọn dành cho tuổi thơ đến những bộ sách về tư duy, chữa lành và sống tối ưu, bạn có thể đi
            thẳng vào collection phù hợp rồi tiếp tục duyệt chi tiết từng tựa sách bên trong.
          </p>
        </StorefrontIntro>

          <div className="vendor-grid collections-page__grid">
            {props.collections.map((collection) => (
              <Link className="vendor-card vendor-card--link collections-page__card" key={collection.slug} to={collection.href}>
                <div className="vendor-card__books">
                  {collection.books.slice(0, 4).map((book) => (
                    <img
                      key={`${collection.slug}-${book.id}`}
                      className="vendor-card__mini"
                      src={book.coverImageUrl ?? "/images/books/2.jpg"}
                      alt={book.title}
                      loading="lazy"
                    />
                  ))}
                </div>
                <div className="collections-page__meta">
                  <span className="collections-page__count">{collection.count} books</span>
                  {collection.isFeatured ? <span className="collections-page__badge">Featured</span> : null}
                </div>
                <h4>{collection.name}</h4>
                <p>
                  {collection.description ??
                    `Khám phá ${collection.count} tựa sách được tuyển chọn trong bộ sưu tập này.`}
                </p>
              </Link>
            ))}
          </div>

          <div className="collections-page__pagination">
            <Link
              className={`collections-page__page-btn${props.page === 1 ? " disabled" : ""}`}
              to={props.page > 1 ? `/collections?page=${props.page - 1}` : "/collections?page=1"}
            >
              ‹
            </Link>
            {paginationItems.map((item) => (
              <Link
                className={`collections-page__page-btn${item === props.page ? " active" : ""}`}
                key={item}
                to={`/collections?page=${item}`}
              >
                {item}
              </Link>
            ))}
            <Link
              className={`collections-page__page-btn${props.page >= props.totalPages ? " disabled" : ""}`}
              to={props.page < props.totalPages ? `/collections?page=${props.page + 1}` : `/collections?page=${props.totalPages}`}
            >
              ›
            </Link>
          </div>
      </StorefrontPageSection>
    </StorefrontPageShell>
  );
}

export function SearchExperience(props: {
  page: SearchPageModel;
  onAddToCart?: (bookId: string) => void;
  addingBookId?: string | null;
}) {
  return (
    <StorefrontPageShell
      eyebrow="Search"
      title={props.page.hasQuery ? props.page.pageHeading : "Search results"}
      lead={props.page.pageLead}
      breadcrumb={props.page.breadcrumb}
    >
      <StorefrontPageSection>
        <StorefrontIntro>
          <p>{props.page.resultSummary}</p>
          {props.page.fallbackNotice ? <p>{props.page.fallbackNotice}</p> : null}
        </StorefrontIntro>

        <StorefrontChipRow items={props.page.matchedBy} />

        {props.page.emptyState ? (
          <StorefrontEmptyState
            title={props.page.emptyState.title}
            message={props.page.emptyState.message}
            actionLabel="Reset search"
            actionHref={props.page.emptyState.resetHref}
            extra={
              <div className="collections-page__tips">
                {props.page.emptyState.tips.map((tip) => (
                  <span className="collections-page__tip" key={tip}>
                    {tip}
                  </span>
                ))}
              </div>
            }
          />
        ) : (
          <StorefrontProductGrid
            books={props.page.books}
            pagination={props.page.pagination}
            onAddToCart={props.onAddToCart}
            addingBookId={props.addingBookId}
          />
        )}
      </StorefrontPageSection>

      {props.page.suggestionSection.books.length > 0 ? (
        <StorefrontPageSection className="page-section--search-suggestions">
          <div className="search-suggestion-panel">
            <SectionHeader
              eyebrow={props.page.suggestionSection.eyebrow}
              title={props.page.suggestionSection.title}
            />
            <p className="search-suggestion-panel__lead">{props.page.suggestionSection.description}</p>
            <div className="product-grid">
              {props.page.suggestionSection.books.map((book) => (
                <ProductCard
                  key={book.id}
                  book={book}
                  onAddToCart={props.onAddToCart}
                  adding={props.addingBookId === book.id}
                />
              ))}
            </div>
          </div>
        </StorefrontPageSection>
      ) : null}

      {props.page.exploreLinks.length > 0 ? (
        <StorefrontPageSection className="page-section--search-links">
          <SectionHeader eyebrow="Explore" title="Keep browsing" />
          <div className="collections-page__links">
            {props.page.exploreLinks.map((item) => (
              <Link className="collections-page__link-card" key={item.href} to={item.href}>
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </Link>
            ))}
          </div>
        </StorefrontPageSection>
      ) : null}
    </StorefrontPageShell>
  );
}

export function MembershipBanner() {
  return (
    <section className="page-section">
      <div className="container">
        <article className="membership-card">
          <span className="membership-card__eyebrow">Membership</span>
          <h3>Only $5.99 a month</h3>
          <p>
            The visual block stays faithful to the reference storefront while remaining a frontend-only section for
            now.
          </p>
          <button className="button-primary" type="button">
            Shop now
          </button>
        </article>
      </div>
    </section>
  );
}

export function MixedShelfSection(props: {
  title: string;
  linkHref: string;
  books: ProductCardViewModel[];
  spotlight: ProductCardViewModel;
}) {
  const orderedBooks = uniqueBooks(props.books);
  const stackBooks = orderedBooks.slice(0, 3);
  const preferredHero =
    [props.spotlight, ...orderedBooks].find((book) => book && !stackBooks.some((stackBook) => stackBook.id === book.id)) ??
    orderedBooks[0];
  const heroBook = preferredHero;
  const usedIds = new Set<string>([...stackBooks.map((book) => book.id), heroBook?.id].filter(Boolean) as string[]);
  const remainingBooks = orderedBooks.filter((book) => !usedIds.has(book.id));
  const sideListBooks = remainingBooks.slice(0, 3);

  return (
    <section className="page-section">
      <div className="container">
        <SectionHeader title={props.title} linkLabel="View all products" linkHref={props.linkHref} />
        <div className="shelf-grid">
          <div className="featured-panel">
            <div className="featured-panel__stack">
              {stackBooks.map((book) => (
                <Link to={book.detailHref} className="featured-panel__mini" key={`stack-${book.id}`}>
                  <img src={book.coverImageUrl ?? "/images/books/3.jpg"} alt={book.title} loading="lazy" />
                  <div className="featured-panel__mini-copy">
                    <strong className="featured-panel__mini-title">{book.title}</strong>
                    <div className="featured-panel__mini-rating">{starRow()}</div>
                    <span className="featured-panel__mini-price">{book.price.formatted}</span>
                  </div>
                </Link>
              ))}
            </div>

            {heroBook ? (
              <Link to={heroBook.detailHref} className="featured-panel__hero">
                <div className="featured-panel__hero-copy">
                  <div className="featured-panel__eyebrow">{heroBook.publisherName}</div>
                  <h3 className="featured-panel__hero-title">{heroBook.title}</h3>
                  <p className="featured-panel__hero-author">{heroBook.authorName}</p>
                  <div className="featured-panel__mini-rating">{starRow()}</div>
                  <div className="featured-panel__hero-price">
                    <strong>{heroBook.price.formatted}</strong>
                  </div>
                </div>
                <img src={heroBook.coverImageUrl ?? "/images/books/1.jpg"} alt={heroBook.title} />
              </Link>
            ) : null}
          </div>

          <div className="mini-card-list">
            {sideListBooks.map((book) => (
              <Link to={book.detailHref} className="mini-card" key={book.id}>
                <img src={book.coverImageUrl ?? "/images/books/2.jpg"} alt={book.title} loading="lazy" />
                <div>
                  <div className="product-card__meta">{book.primaryCategory?.name ?? book.publisherName}</div>
                  <h3 className="product-card__title">{book.title}</h3>
                  <p className="product-card__author">{book.authorName}</p>
                  <div className="product-card__price">
                    <strong>{book.price.formatted}</strong>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductShelf(props: {
  id?: string;
  title: string;
  books: ProductCardViewModel[];
  linkHref: string;
}) {
  return (
    <section className="page-section" id={props.id}>
      <div className="container">
        <SectionHeader title={props.title} linkLabel="View all products" linkHref={props.linkHref} />
        <div className="product-grid">
          {props.books.map((book) => (
            <ProductCard key={book.id} book={book} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BlogSection() {
  return (
    <section className="page-section" id="blog">
      <div className="container">
        <SectionHeader title="Latest Blog Post" linkLabel="View all" linkHref="#footer" />
        <div className="blog-grid">
          {blogCards.map((card) => (
            <article className="blog-card" key={card.title}>
              <img src={card.image} alt={card.title} loading="lazy" />
              <div className="blog-card__content">
                <div className="blog-card__label">{card.label}</div>
                <h4>{card.title}</h4>
                <button className="button-outline" type="button">
                  {card.cta}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PartnerStrip() {
  return (
    <section className="page-section">
      <div className="container brand-strip">
        {publisherMarks.map((item) => (
          <div className="brand-strip__item" key={item.name}>
            <img className="brand-strip__logo" src={item.image} alt={item.name} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function LifestyleGallery() {
  return (
    <section className="page-section">
      <div className="container gallery-grid">
        {lifestyleGallery.map((item) => (
          <img key={item.title} src={item.image} alt={item.title} loading="lazy" />
        ))}
      </div>
    </section>
  );
}

export function ServiceStrip() {
  const icons = [
    (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M4 7h11v7H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M15 10h2.5l2 2V14h-4.5z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <circle cx="8" cy="16.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="17.5" cy="16.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M9.2 12.2l1.8 1.8 3.8-4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M6.5 12V9.5a5.5 5.5 0 0 1 11 0V12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <rect x="4.5" y="11" width="4" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <rect x="15.5" y="11" width="4" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <rect x="4.5" y="6.5" width="15" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M4.5 10h15" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M8 14.5h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  ];

  return (
    <section className="page-section page-section--service-strip">
      <div className="service-strip-band">
        <div className="container service-strip">
          {services.map((item, index) => (
            <div className="service-strip__item" key={item.title}>
              <span className="service-strip__icon" aria-hidden="true">
                {icons[index]}
              </span>
              <div>
                <h5>{item.title}</h5>
                <p>{item.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  const socialIcons = (
    <>
      <span>f</span>
      <span>ig</span>
      <span>in</span>
      <span>x</span>
    </>
  );

  return (
    <footer className="site-footer" id="footer">
      <div className="container site-footer__top">
        <div>
          <div className="brand-mark">
            <span className="brand-mark__cube" aria-hidden="true" />
            <span>BookVerse</span>
          </div>
          <p>Find a location nearest you. See our stores.</p>
          <p>+84 1800 1515</p>
          <p>nguyentatthang@bookverse.com</p>
          <div className="site-footer__social" aria-label="Social links">
            {socialIcons}
          </div>
        </div>

        <div>
          <h4>Contact Info</h4>
          <p>Km 10, Nguyen Trai, Ha Dong, Ha Noi</p>
          <p>Monday - Friday: 9:00 - 20:00</p>
          <p>Saturday: 11:00 - 15:00</p>
        </div>

        <div id="about">
          <h4>Explore</h4>
          <ul>
            <li>
              <Link to="/">About Us</Link>
            </li>
            <li>
              <Link to="/books">Category</Link>
            </li>
            <li>
              <Link to="/books">Products</Link>
            </li>
            <li>
              <a href="#blog">Blog</a>
            </li>
            <li>
              <a href="#footer">Contact</a>
            </li>
          </ul>
        </div>

        <div>
          <h4>Subscribe</h4>
          <p>Enter your email below to be the first to know about new collections and product launches.</p>
          <div className="site-footer__newsletter">
            <input placeholder="Email address" aria-label="Email address" />
            <button className="button-primary" type="button">
              Subscribe
            </button>
          </div>
        </div>
      </div>

      <div className="container site-footer__bottom">
        <span>Copyright © 2026 BookStore. All rights reserved.</span>
        <div className="social-dots" aria-hidden="true">
          {socialIcons}
        </div>
      </div>
    </footer>
  );
}

export function FooteredLayout({ children }: { children: ReactNode }) {
  return (
    <div className="storefront-shell">
      <SiteHeader />
      {children}
      <ServiceStrip />
      <SiteFooter />
    </div>
  );
}

export function StorefrontPageShell(props: {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumb: BreadcrumbItem[];
  children: ReactNode;
}) {
  return (
    <FooteredLayout>
      <BreadcrumbHero
        eyebrow={props.eyebrow}
        title={props.title}
        lead={props.lead}
        breadcrumb={props.breadcrumb}
      />
      {props.children}
    </FooteredLayout>
  );
}

export function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-card">
        <div className="loading-card__pulse" />
        <h2>Loading !!!</h2>
        <p>Xin vui lòng chờ!</p>
      </div>
    </div>
  );
}

export function ErrorState(props: { title?: string; message: string }) {
  return (
    <div className="error-state">
      <div className="error-card">
        <h2>{props.title ?? "Có lỗi khi tải giao diện"}</h2>
        <p>{props.message}</p>
        <Link className="button-primary" to="/">
          Quay về trang chủ
        </Link>
      </div>
    </div>
  );
}

export function Toast(props: { kind: "success" | "error"; message: string }) {
  return <div className={`toast toast--${props.kind}`}>{props.message}</div>;
}

export function FiltersDrawer(props: {
  open: boolean;
  filters: CatalogFiltersViewModel;
  activeFilters: ActiveFilterViewModel[];
  onClose: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const [priceMin, setPriceMin] = useState(props.filters.priceMin?.toString() ?? "");
  const [priceMax, setPriceMax] = useState(props.filters.priceMax?.toString() ?? "");
  const [draftSort, setDraftSort] = useState(props.filters.selectedSort);
  const [draftSelections, setDraftSelections] = useState<Record<string, Set<string>>>({
    category: new Set(props.filters.categoryOptions.filter((item) => item.selected).map((item) => item.value)),
    author: new Set(props.filters.authorOptions.filter((item) => item.selected).map((item) => item.value)),
    publisher: new Set(props.filters.publisherOptions.filter((item) => item.selected).map((item) => item.value)),
    availability: new Set(
      props.filters.availabilityOptions.filter((item) => item.selected).map((item) => item.value),
    ),
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPriceMin(props.filters.priceMin?.toString() ?? "");
    setPriceMax(props.filters.priceMax?.toString() ?? "");
    setDraftSort(props.filters.selectedSort);
    setDraftSelections({
      category: new Set(props.filters.categoryOptions.filter((item) => item.selected).map((item) => item.value)),
      author: new Set(props.filters.authorOptions.filter((item) => item.selected).map((item) => item.value)),
      publisher: new Set(props.filters.publisherOptions.filter((item) => item.selected).map((item) => item.value)),
      availability: new Set(
        props.filters.availabilityOptions.filter((item) => item.selected).map((item) => item.value),
      ),
    });
    setExpandedGroups({});
  }, [
    props.filters.priceMin,
    props.filters.priceMax,
    props.filters.selectedSort,
    props.filters.categoryOptions,
    props.filters.authorOptions,
    props.filters.publisherOptions,
    props.filters.availabilityOptions,
  ]);

  if (!props.open) {
    return null;
  }

  const toggleSelection = (key: string, value: string) => {
    setDraftSelections((current) => {
      const next = {
        ...current,
        [key]: new Set(current[key] ?? []),
      };

      if (next[key].has(value)) {
        next[key].delete(value);
      } else {
        next[key].clear();
        next[key].add(value);
      }

      return next;
    });
  };

  const applyFilters = () => {
    const next = new URLSearchParams(location.search);
    next.set("sort", draftSort);
    next.delete("page");

    const mapping: Array<{ key: string; query: string }> = [
      { key: "category", query: "category" },
      { key: "author", query: "author" },
      { key: "publisher", query: "publisher" },
      { key: "availability", query: "availability" },
    ];

    for (const item of mapping) {
      next.delete(item.query);
      const selected = Array.from(draftSelections[item.key] ?? []);
      if (selected[0]) {
        next.set(item.query, selected[0]);
      }
    }

    if (priceMin.trim()) {
      next.set("priceMin", priceMin.trim());
    } else {
      next.delete("priceMin");
    }
    if (priceMax.trim()) {
      next.set("priceMax", priceMax.trim());
    } else {
      next.delete("priceMax");
    }

    navigate(`${location.pathname}${next.toString() ? `?${next.toString()}` : ""}`);
    props.onClose();
  };

  const resetFilters = () => {
    setDraftSort(props.filters.sortOptions[0]?.value ?? props.filters.selectedSort);
    setDraftSelections({
      category: new Set(),
      author: new Set(),
      publisher: new Set(),
      availability: new Set(),
    });
    setPriceMin("");
    setPriceMax("");
    setExpandedGroups({});
    navigate(props.filters.resetHref);
    props.onClose();
  };

  const renderOptionGroup = (group: {
    label: string;
    key: FilterGroupKey;
    options: Array<{ value: string; label: string; count: number }>;
  }) => {
    if (group.options.length === 0) {
      return null;
    }

    const expanded = expandedGroups[group.key] ?? false;
    const visibleOptions = expanded ? group.options : group.options.slice(0, FILTER_VISIBLE_LIMIT);
    const hasOverflow = group.options.length > FILTER_VISIBLE_LIMIT;

    return (
      <div className="filters-drawer__section" key={group.key}>
        <h3>{group.label}</h3>
        <div className="filter-options">
          {visibleOptions.map((option) => {
            const checked = draftSelections[group.key]?.has(option.value) ?? false;
            return (
              <label className="filter-option" key={option.value}>
                <input
                  type="radio"
                  name={`filter-${group.key}`}
                  checked={checked}
                  onChange={() => toggleSelection(group.key, option.value)}
                />
                <span>{option.label}</span>
                <span>{option.count}</span>
              </label>
            );
          })}
        </div>
        {hasOverflow ? (
          <button
            className="filters-drawer__toggle"
            type="button"
            onClick={() =>
              setExpandedGroups((current) => ({
                ...current,
                [group.key]: !expanded,
              }))
            }
          >
            {expanded ? "Thu gọn" : `Xem thêm (${group.options.length - FILTER_VISIBLE_LIMIT})`}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <button className="drawer-backdrop" type="button" aria-label="Close filters" onClick={props.onClose} />
      <aside className="filters-drawer" aria-label="Catalog filters">
        <div className="filters-drawer__header">
          <h2>Filters</h2>
          <button className="pill-button" type="button" onClick={props.onClose}>
            Close
          </button>
        </div>

        {props.activeFilters.length > 0 ? (
          <div className="filter-chips">
            {props.activeFilters.map((filter) => (
              <Link className="filter-chip" key={filter.label} to={filter.clearHref}>
                {filter.label} ×
              </Link>
            ))}
          </div>
        ) : null}

        {(
          [
            { label: "Category", key: "category", options: props.filters.categoryOptions },
            { label: "Author", key: "author", options: props.filters.authorOptions },
            { label: "Publisher", key: "publisher", options: props.filters.publisherOptions },
            { label: "Availability", key: "availability", options: props.filters.availabilityOptions },
          ] satisfies Array<{
            label: string;
            key: FilterGroupKey;
            options: Array<{ value: string; label: string; count: number }>;
          }>
        ).map((group) => renderOptionGroup(group))}

        <div className="filters-drawer__section">
          <h3>Price</h3>
          <div className="price-range">
            <input
              inputMode="numeric"
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
              placeholder={props.filters.minAvailablePrice?.toString() ?? "Min"}
            />
            <input
              inputMode="numeric"
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
              placeholder={props.filters.maxAvailablePrice?.toString() ?? "Max"}
            />
          </div>
          <div className="toolbar-actions">
            <button className="button-outline" type="button" onClick={applyFilters}>
              Apply
            </button>
            <button className="button-primary" type="button" onClick={resetFilters}>
              Reset
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function HomeExperience({ page }: { page: HomePageModel }) {
  const popularSections = [...page.categorySections, ...page.collectionSections];
  const categoryBooks = popularSections[0]?.books ?? page.featuredBooks;
  const collectionBooks = popularSections[1]?.books ?? page.bestsellerBooks;
  const favouriteReadsBooks = uniqueBooks([...page.featuredBooks, ...page.bestsellerBooks]);

  return (
    <FooteredLayout>
      <HeroSection page={page} />
      <PromoGrid />
      <CollectionShowcase page={page} />
      <MembershipBanner />
      <MixedShelfSection
        title="Our Favourite Reads"
        books={favouriteReadsBooks}
        spotlight={page.spotlightBook ?? page.featuredBooks[0]!}
        linkHref="/books?sort=featured"
      />
      <ProductShelf title="Trending Now" books={page.bestsellerBooks} linkHref="/books?sort=bestseller" />
      <ProductShelf
        title={popularSections[0]?.name ?? "Bestselling Books"}
        books={categoryBooks}
        linkHref={popularSections[0]?.href ?? "/books"}
        id={popularSections[0] ? buildSectionId(popularSections[0].name) : undefined}
      />
      <ProductShelf
        title={popularSections[1]?.name ?? "Popular Books"}
        books={collectionBooks}
        linkHref={popularSections[1]?.href ?? "/books"}
        id={popularSections[1] ? buildSectionId(popularSections[1].name) : undefined}
      />
      <PartnerStrip />
    </FooteredLayout>
  );
}

export function ProductDetailTabs({ page }: { page: ProductDetailPageModel }) {
  const [tab, setTab] = useState<"description" | "additional" | "reviews" | "vendor">("description");

  const tabCopy = {
    description: page.book.longDescription ?? page.description,
    additional: page.book.metadataItems
      .map((item) => `${item.label}: ${item.value}`)
      .concat(page.book.collections.length > 0 ? [`Collections: ${page.book.collections.map((item) => item.name).join(", ")}`] : [])
      .join("\n"),
    reviews:
      "Reviews will arrive in a later backend phase. For now this tab keeps the same visual slot as the reference without faking review data.",
    vendor:
      "Vendor info is intentionally read-only in this phase. The presentation remains in place so the PDP keeps the same composition as the sample.",
  } as const;

  return (
    <section className="pdp-tabs">
      <div className="tab-strip" role="tablist" aria-label="Product detail tabs">
        {[
          ["description", "Description"],
          ["additional", "Additional information"],
          ["reviews", "Reviews (5)"],
          ["vendor", "Vendor Info"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value as typeof tab)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tab-panel" style={{ whiteSpace: "pre-line" }}>
        {tabCopy[tab]}
      </div>
    </section>
  );
}

export function ProductDetailExperience(props: {
  page: ProductDetailPageModel;
  onAddToCart: (bookId: string, quantity: number) => Promise<void>;
  addingToCart: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const book = props.page.book;

  return (
    <FooteredLayout>
      <BreadcrumbHero eyebrow="Products" title="Products Details" lead={props.page.description} breadcrumb={props.page.breadcrumb} />
      <section className="page-section">
        <div className="container">
          <div className="pdp-grid">
            <div className="pdp-media">
              <img src={book.coverImageUrl ?? "/images/books/1.jpg"} alt={book.title} />
            </div>

            <div className="pdp-summary">
              <span className="status-tag">{book.availabilityLabel}</span>
              <h1>{book.title}</h1>
              <div className="pdp-summary__subline">
                <span>Author: {book.authorName}</span>
                <span>{starRow()}</span>
                <span>SKU: {book.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <div className="pdp-price">
                <strong>{book.price.formatted}</strong>
                {book.compareAt ? <span>{book.compareAt.formatted}</span> : null}
              </div>
              <p className="pdp-note">{book.purchaseNote}</p>

              <div className="selection-chips">
                {book.categories.slice(0, 4).map((item) => (
                  <span className="selection-chip" key={item.slug}>
                    {item.name}
                  </span>
                ))}
                {book.collections.slice(0, 2).map((item) => (
                  <span className="selection-chip selection-chip--muted" key={item.slug}>
                    {item.name}
                  </span>
                ))}
              </div>

              <div className="add-to-cart-row">
                <div className="quantity-stepper">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <input value={quantity} readOnly aria-label="Quantity" />
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((value) => Math.min(Math.max(1, book.inventoryQuantity || 12), value + 1))
                    }
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <div className="pdp-actions">
                  <button
                    className="button-primary"
                    type="button"
                    disabled={!book.isPurchasable || props.addingToCart}
                    onClick={() => props.onAddToCart(book.id, quantity)}
                  >
                    {props.addingToCart ? "Adding..." : "Add to cart"}
                  </button>
                  <button className="button-outline" type="button">
                    Add to wishlist
                  </button>
                </div>
              </div>

              <div className="wishlist-row">
                <span>Shipping: {book.shippingFee.formatted}</span>
                <span>Language: {book.languageCode?.toUpperCase() ?? "N/A"}</span>
                <span>Inventory: {book.inventoryQuantity}</span>
              </div>

              <div className="metadata-grid">
                {book.metadataItems.map((item) => (
                  <div className="metadata-item" key={item.label}>
                    <strong>{item.label}</strong>
                    {item.href ? <Link to={item.href}>{item.value}</Link> : <span>{item.value}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ProductDetailTabs page={props.page} />
        </div>
      </section>
      <ProductShelf title="Related products" books={props.page.relatedBooks} linkHref="/books" />
    </FooteredLayout>
  );
}

export function ListingExperience(props: {
  title: string;
  lead: string;
  eyebrow: string;
  breadcrumb: BreadcrumbItem[];
  resultSummary: string;
  books: ProductCardViewModel[];
  filters: CatalogFiltersViewModel;
  activeFilters: ActiveFilterViewModel[];
  pagination?: PaginationViewModel | null;
  emptyState: { title: string; message: string; resetHref: string } | null;
  onAddToCart?: (bookId: string) => void;
  addingBookId?: string | null;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const selectedSortLabel =
    props.filters.sortOptions.find((option) => option.value === props.filters.selectedSort)?.label ?? "Sắp xếp";

  useEffect(() => {
    setDrawerOpen(false);
    setSortMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <FooteredLayout>
      <BreadcrumbHero eyebrow={props.eyebrow} title={props.title} lead={props.lead} breadcrumb={props.breadcrumb} />
      <section className="page-section">
        <div className="container">
          <div className="listing-toolbar">
            <div className="listing-toolbar__left">
              <button className="pill-button pill-button--filter" type="button" onClick={() => setDrawerOpen(true)}>
                ☷ Filter
              </button>
            </div>

            <div className="listing-toolbar__right">
              <span className="header-actions__link">{props.resultSummary}</span>
              <div className="toolbar-menu">
                <button
                  className="toolbar-select toolbar-select--sort toolbar-select--button"
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={sortMenuOpen}
                  onClick={() => setSortMenuOpen((current) => !current)}
                >
                  <span>{selectedSortLabel}</span>
                  <span className="search-panel__chevron">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M7 10l5 5 5-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                {sortMenuOpen ? (
                  <div className="toolbar-menu__panel" role="listbox" aria-label="Sort books">
                    {props.filters.sortOptions.map((option) => (
                      <button
                        className={`toolbar-menu__item${option.value === props.filters.selectedSort ? " active" : ""}`}
                        key={option.value}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(params);
                          next.set("sort", option.value);
                          next.delete("page");
                          setSortMenuOpen(false);
                          navigate(`${location.pathname}?${next.toString()}`);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {props.activeFilters.length > 0 ? (
            <div className="filter-chips">
              {props.activeFilters.map((filter) => (
                <Link key={filter.label} className="filter-chip" to={filter.clearHref}>
                  {filter.label} ×
                </Link>
              ))}
            </div>
          ) : null}

          {props.emptyState ? (
            <div className="listing-empty">
              <h2>{props.emptyState.title}</h2>
              <p>{props.emptyState.message}</p>
              <Link className="button-primary" to={props.emptyState.resetHref}>
                Reset filters
              </Link>
            </div>
          ) : (
            <>
              <StorefrontProductGrid
                books={props.books}
                pagination={props.pagination}
                onAddToCart={props.onAddToCart}
                addingBookId={props.addingBookId}
              />
            </>
          )}
        </div>
      </section>

      <FiltersDrawer
        open={drawerOpen}
        filters={props.filters}
        activeFilters={props.activeFilters}
        onClose={() => setDrawerOpen(false)}
      />
    </FooteredLayout>
  );
}

export function buildDynamicHomeSections(page: HomePageModel) {
  return [...page.categorySections, ...page.collectionSections].slice(0, 2).map((section) => ({
    id: buildSectionId(section.name),
    title: section.name,
    books: section.books,
    href: section.href,
  }));
}

export function getProductDisplayNote(book: ProductCardViewModel) {
  return joinBookCollections(book);
}
