import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import type {
  BreadcrumbItem,
  CartViewModel,
  PaginationViewModel,
  ProductCardViewModel,
} from "../types/api";

export function starRow() {
  return "*****";
}

export function pickBooks(pool: ProductCardViewModel[], count: number) {
  if (pool.length === 0) {
    return [];
  }

  const books = [...pool];
  while (books.length < count) {
    books.push(pool[books.length % pool.length]!);
  }

  return books.slice(0, count);
}

export function uniqueBooks(pool: ProductCardViewModel[]) {
  const seen = new Set<string>();
  return pool.filter((book) => {
    if (seen.has(book.id)) {
      return false;
    }
    seen.add(book.id);
    return true;
  });
}

export const FILTER_VISIBLE_LIMIT = 8;

export function SectionHeader(props: {
  eyebrow?: string;
  title: string;
  linkLabel?: string;
  linkHref?: string;
}) {
  return (
    <div className="section-header">
      <div>
        {props.eyebrow ? <span className="section-header__eyebrow">{props.eyebrow}</span> : null}
        <h2 className="section-header__title">{props.title}</h2>
      </div>
      {props.linkLabel && props.linkHref ? (
        <Link className="section-header__link" to={props.linkHref}>
          {props.linkLabel} {"->"}
        </Link>
      ) : null}
    </div>
  );
}

export function ProductCard(props: {
  book: ProductCardViewModel;
  onAddToCart?: (bookId: string) => void;
  adding?: boolean;
}) {
  const { book } = props;

  return (
    <article className="product-card">
      <Link to={book.detailHref} className="product-card__image-wrap">
        {book.badges.length > 0 ? (
          <div className="product-card__badges">
            {book.badges.slice(0, 2).map((badge) => (
              <span key={`${book.id}-${badge.label}`} className={`product-badge product-badge--${badge.tone}`}>
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}
        <img src={book.coverImageUrl ?? "/images/books/1.jpg"} alt={book.title} loading="lazy" />
      </Link>
      <div className="product-card__content">
        <div className="product-card__meta">{book.publisherName}</div>
        <h3 className="product-card__title">
          <Link to={book.detailHref}>{book.title}</Link>
        </h3>
        <p className="product-card__author">{book.authorName}</p>
        <div className="product-card__rating">{starRow()}</div>
        <div className="product-card__price">
          <strong>{book.price.formatted}</strong>
          {book.compareAt ? <span>{book.compareAt.formatted}</span> : null}
        </div>
        <div className="product-card__actions">
          <Link className="product-card__cta product-card__cta--ghost" to={book.detailHref}>
            View details
          </Link>
          {props.onAddToCart ? (
            <button
              className="product-card__cta product-card__cta--primary"
              type="button"
              disabled={props.adding}
              onClick={() => props.onAddToCart?.(book.id)}
            >
              {props.adding ? "Adding..." : "Add to cart"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function BreadcrumbHero(props: {
  eyebrow: string;
  title: string;
  lead: string;
  breadcrumb: BreadcrumbItem[];
}) {
  return (
    <section className="page-section">
      <div className="container">
        <div className="breadcrumb-hero">
          <div>
            <div className="breadcrumb-hero__eyebrow">{props.eyebrow}</div>
            <h1>{props.title}</h1>
            <p>{props.lead}</p>
          </div>
          <div className="breadcrumb-list" aria-label="Breadcrumb">
            {props.breadcrumb.map((item, index) =>
              item.href && !item.active ? (
                <Link key={`${item.label}-${index}`} to={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span key={`${item.label}-${index}`}>{item.label}</span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StorefrontPageSection(props: { children: ReactNode; className?: string }) {
  return (
    <section className={`page-section${props.className ? ` ${props.className}` : ""}`}>
      <div className="container">{props.children}</div>
    </section>
  );
}

export function StorefrontIntro(props: { children: ReactNode }) {
  return <div className="collections-page__intro">{props.children}</div>;
}

export function StorefrontChipRow(props: { items: string[] }) {
  if (props.items.length === 0) {
    return null;
  }

  return (
    <div className="filter-chips">
      {props.items.map((item) => (
        <span className="filter-chip" key={item}>
          {item}
        </span>
      ))}
    </div>
  );
}

export function ListingPagination(props: { pagination?: PaginationViewModel | null }) {
  if (!props.pagination || props.pagination.items.length <= 1) {
    return null;
  }

  return (
    <div className="pagination">
      {props.pagination.prevHref ? <Link to={props.pagination.prevHref}>{"<"}</Link> : <span>{"<"}</span>}
      {props.pagination.items.map((item) =>
        item.href ? (
          <Link key={`${item.label}-${item.href}`} className={item.active ? "active" : ""} to={item.href}>
            {item.label}
          </Link>
        ) : (
          <span key={item.label} className={item.active ? "active" : ""}>
            {item.label}
          </span>
        ),
      )}
      {props.pagination.nextHref ? <Link to={props.pagination.nextHref}>{">"}</Link> : <span>{">"}</span>}
    </div>
  );
}

export function StorefrontProductGrid(props: {
  books: ProductCardViewModel[];
  pagination?: PaginationViewModel | null;
  onAddToCart?: (bookId: string) => void;
  addingBookId?: string | null;
}) {
  return (
    <>
      <div className="product-grid">
        {props.books.map((book) => (
          <ProductCard
            key={book.id}
            book={book}
            onAddToCart={props.onAddToCart}
            adding={props.addingBookId === book.id}
          />
        ))}
      </div>
      <ListingPagination pagination={props.pagination} />
    </>
  );
}

export function readCartCount(cart: CartViewModel | null) {
  return cart?.itemCount ?? 0;
}

export function StorefrontEmptyState(props: {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  extra?: ReactNode;
}) {
  return (
    <div className="listing-empty">
      <h2>{props.title}</h2>
      <p>{props.message}</p>
      {props.extra}
      <Link className="button-primary" to={props.actionHref}>
        {props.actionLabel}
      </Link>
    </div>
  );
}

export type SharedVisualProps = {
  categoryTones: string[];
};

export type SharedCssProps = CSSProperties;
