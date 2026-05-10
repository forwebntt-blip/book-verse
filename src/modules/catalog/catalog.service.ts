import type { Prisma } from "../../generated/prisma/client.js";
import { PublishStatus } from "../../generated/prisma/enums.js";
import { ANALYTICS_EVENTS, AVAILABILITY_STATUS, type AvailabilityStatus } from "../../shared/contracts";
import { AppError } from "../../shared/errors/app-error";
import { makeMoney } from "../../shared/utils/money";
import { buildCatalogHref, getCatalogBasePath } from "./catalog.query";
import { CatalogRepository, type StorefrontBookDetailRecord, type StorefrontBookRecord } from "./catalog.repository";
import type {
  ActiveFilterViewModel,
  BreadcrumbItem,
  CatalogFiltersViewModel,
  CatalogScope,
  CatalogSectionViewModel,
  CatalogSort,
  CategorySummaryViewModel,
  CollectionSummaryViewModel,
  HomePageModel,
  ListingPageModel,
  PageAnalyticsViewModel,
  PaginationViewModel,
  ParsedCatalogQuery,
  ProductBadgeViewModel,
  ProductCardViewModel,
  ProductDetailPageModel,
  ProductMetadataItemViewModel,
} from "./catalog.types";
import { CATALOG_SORTS } from "./catalog.types";

const LISTING_PAGE_SIZE = 15;
const HOMEPAGE_SECTION_LIMIT = 4;

const SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: CATALOG_SORTS.FEATURED, label: "Nổi bật" },
  { value: CATALOG_SORTS.BESTSELLER, label: "Bán chạy" },
  { value: CATALOG_SORTS.NEWEST, label: "Mua nhiều" },
  { value: CATALOG_SORTS.PRICE_ASC, label: "Giá tăng dần" },
  { value: CATALOG_SORTS.PRICE_DESC, label: "Giá giảm dần" },
];

const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  [AVAILABILITY_STATUS.IN_STOCK]: "Còn hàng",
  [AVAILABILITY_STATUS.LOW_STOCK]: "Sắp hết hàng",
  [AVAILABILITY_STATUS.OUT_OF_STOCK]: "Tạm hết hàng",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function buildBaseScopeWhere(scope: CatalogScope): Prisma.BookWhereInput {
  const conditions: Prisma.BookWhereInput[] = [
    {
      publishStatus: PublishStatus.PUBLISHED,
    },
  ];

  if (scope.type === "category" && scope.slug) {
    conditions.push({
      bookCategories: {
        some: {
          category: {
            slug: scope.slug,
          },
        },
      },
    });
  }

  if (scope.type === "collection" && scope.slug) {
    conditions.push({
      collectionItems: {
        some: {
          collection: {
            slug: scope.slug,
            publishStatus: PublishStatus.PUBLISHED,
          },
        },
      },
    });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

function buildFilteredWhere(scope: CatalogScope, query: ParsedCatalogQuery): Prisma.BookWhereInput {
  const conditions: Prisma.BookWhereInput[] = [buildBaseScopeWhere(scope)];

  if (scope.type !== "category" && query.categorySlug) {
    conditions.push({
      bookCategories: {
        some: {
          category: {
            slug: query.categorySlug,
          },
        },
      },
    });
  }

  if (query.authorSlug) {
    conditions.push({
      author: {
        is: {
          slug: query.authorSlug,
        },
      },
    });
  }

  if (query.publisherSlug) {
    conditions.push({
      publisher: {
        is: {
          slug: query.publisherSlug,
        },
      },
    });
  }

  if (query.availability) {
    conditions.push({
      availabilityStatus: query.availability,
    });
  }

  if (typeof query.priceMin === "number" || typeof query.priceMax === "number") {
    conditions.push({
      priceAmount: {
        ...(typeof query.priceMin === "number" ? { gte: query.priceMin } : {}),
        ...(typeof query.priceMax === "number" ? { lte: query.priceMax } : {}),
      },
    });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

function buildSortOrder(sort: CatalogSort): Prisma.BookOrderByWithRelationInput[] {
  switch (sort) {
    case CATALOG_SORTS.BESTSELLER:
      return [
        { isBestseller: "desc" },
        { sortWeight: "desc" },
        { isFeatured: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ];
    case CATALOG_SORTS.NEWEST:
      return [{ publishedAt: "desc" }, { createdAt: "desc" }, { sortWeight: "desc" }];
    case CATALOG_SORTS.PRICE_ASC:
      return [{ priceAmount: "asc" }, { sortWeight: "desc" }, { createdAt: "desc" }];
    case CATALOG_SORTS.PRICE_DESC:
      return [{ priceAmount: "desc" }, { sortWeight: "desc" }, { createdAt: "desc" }];
    case CATALOG_SORTS.FEATURED:
    default:
      return [
        { isFeatured: "desc" },
        { isRecommended: "desc" },
        { sortWeight: "desc" },
        { isBestseller: "desc" },
        { publishedAt: "desc" },
        { createdAt: "desc" },
      ];
  }
}

function getPrimaryCategory(book: StorefrontBookRecord | StorefrontBookDetailRecord) {
  const primary = book.bookCategories.find((item) => item.isPrimary) ?? book.bookCategories[0];

  if (!primary) {
    return undefined;
  }

  return {
    slug: primary.category.slug,
    name: primary.category.name,
  };
}

function buildBadges(book: StorefrontBookRecord | StorefrontBookDetailRecord): ProductBadgeViewModel[] {
  const badges: ProductBadgeViewModel[] = [];

  if (book.isFeatured) {
    badges.push({ label: "Nổi bật", tone: "featured" });
  }

  if (book.isBestseller) {
    badges.push({ label: "Bán chạy", tone: "bestseller" });
  }

  if (book.isRecommended) {
    badges.push({ label: "Gợi ý", tone: "recommended" });
  }

  if (book.availabilityStatus === AVAILABILITY_STATUS.LOW_STOCK) {
    badges.push({ label: "Sắp hết", tone: "availability" });
  }

  if (book.availabilityStatus === AVAILABILITY_STATUS.OUT_OF_STOCK) {
    badges.push({ label: "Hết hàng", tone: "availability" });
  }

  return badges;
}

function mapProductCard(book: StorefrontBookRecord | StorefrontBookDetailRecord, sourceContext: string): ProductCardViewModel {
  const primaryCategory = getPrimaryCategory(book);

  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    authorName: book.author.name,
    authorSlug: book.author.slug,
    publisherName: book.publisher.name,
    publisherSlug: book.publisher.slug,
    shortDescription: book.shortDescription,
    coverImageUrl: book.coverImageUrl,
    primaryCategory,
    categories: book.bookCategories.map((item) => ({
      slug: item.category.slug,
      name: item.category.name,
    })),
    price: makeMoney(book.priceAmount, book.currency),
    compareAt:
      typeof book.compareAtAmount === "number" && book.compareAtAmount > book.priceAmount
        ? makeMoney(book.compareAtAmount, book.currency)
        : null,
    shippingFee: makeMoney(book.shippingFeeAmount, book.currency),
    availabilityStatus: book.availabilityStatus,
    availabilityLabel: AVAILABILITY_LABELS[book.availabilityStatus],
    badges: buildBadges(book),
    detailHref: `/books/${book.slug}`,
    analyticsPayload: {
      bookId: book.id,
      bookSlug: book.slug,
      title: book.title,
      sourceContext,
      primaryCategorySlug: primaryCategory?.slug,
    },
  };
}

function buildPagination(
  basePath: string,
  query: ParsedCatalogQuery,
  totalItems: number,
  totalPages: number,
  currentPage: number,
): PaginationViewModel | undefined {
  if (totalItems <= LISTING_PAGE_SIZE) {
    return undefined;
  }

  const items = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;

    return {
      label: String(page),
      href: buildCatalogHref(basePath, query, { page }),
      active: page === currentPage,
      disabled: false,
    };
  });

  return {
    page: currentPage,
    totalPages,
    pageSize: LISTING_PAGE_SIZE,
    totalItems,
    from: totalItems === 0 ? 0 : (currentPage - 1) * LISTING_PAGE_SIZE + 1,
    to: Math.min(currentPage * LISTING_PAGE_SIZE, totalItems),
    prevHref:
      currentPage > 1 ? buildCatalogHref(basePath, query, { page: currentPage - 1 }) : undefined,
    nextHref:
      currentPage < totalPages
        ? buildCatalogHref(basePath, query, { page: currentPage + 1 })
        : undefined,
    items,
  };
}

function buildBreadcrumb(scope: CatalogScope, scopedLabel?: string): BreadcrumbItem[] {
  const baseBreadcrumb: BreadcrumbItem[] = [{ label: "Trang chủ", href: "/" }];

  if (scope.type === "category" && scopedLabel) {
    return [
      ...baseBreadcrumb,
      { label: "Danh mục", href: "/#categories" },
      { label: scopedLabel, active: true },
    ];
  }

  if (scope.type === "collection" && scopedLabel) {
    return [
      ...baseBreadcrumb,
      { label: "Bộ sưu tập", href: "/#collections" },
      { label: scopedLabel, active: true },
    ];
  }

  return [...baseBreadcrumb, { label: "Danh mục sách", active: true }];
}

function buildPriceLabel(priceMin?: number, priceMax?: number): string | null {
  if (typeof priceMin === "number" && typeof priceMax === "number") {
    return `Giá: ${makeMoney(priceMin).formatted} - ${makeMoney(priceMax).formatted}`;
  }

  if (typeof priceMin === "number") {
    return `Giá từ ${makeMoney(priceMin).formatted}`;
  }

  if (typeof priceMax === "number") {
    return `Giá đến ${makeMoney(priceMax).formatted}`;
  }

  return null;
}

function getSortLabel(sort: CatalogSort): string {
  return SORT_OPTIONS.find((item) => item.value === sort)?.label ?? SORT_OPTIONS[0].label;
}

function buildAnalytics(events: PageAnalyticsViewModel["events"], context: Record<string, unknown>): PageAnalyticsViewModel {
  return { events, context };
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository) {}

  async getHomePageData(): Promise<HomePageModel> {
    const [featuredBooksRaw, bestsellerBooksRaw, categories, collections, totalBooks] =
      await Promise.all([
        this.repository.findBooks({
          where: buildBaseScopeWhere({ type: "all" }),
          orderBy: buildSortOrder(CATALOG_SORTS.FEATURED),
          take: HOMEPAGE_SECTION_LIMIT,
        }),
        this.repository.findBooks({
          where: buildBaseScopeWhere({ type: "all" }),
          orderBy: buildSortOrder(CATALOG_SORTS.BESTSELLER),
          take: HOMEPAGE_SECTION_LIMIT,
        }),
        this.repository.findCategories(3),
        this.repository.findCollections(),
        this.repository.countBooks(buildBaseScopeWhere({ type: "all" })),
      ]);

    const featuredBooks = featuredBooksRaw.map((book) => mapProductCard(book, "homepage_featured"));
    const bestsellerBooks = bestsellerBooksRaw.map((book) =>
      mapProductCard(book, "homepage_bestseller"),
    );

    const categorySections = (
      await Promise.all(
        categories.map(async (category) => {
          const [count, books] = await Promise.all([
            this.repository.countBooks({
              publishStatus: PublishStatus.PUBLISHED,
              bookCategories: {
                some: {
                  categoryId: category.id,
                },
              },
            }),
            this.repository.findBooks({
              where: {
                publishStatus: PublishStatus.PUBLISHED,
                bookCategories: {
                  some: {
                    categoryId: category.id,
                  },
                },
              },
              orderBy: buildSortOrder(CATALOG_SORTS.FEATURED),
              take: 3,
            }),
          ]);

          if (count === 0) {
            return null;
          }

          return {
            slug: category.slug,
            name: category.name,
            description: category.description,
            href: `/categories/${category.slug}`,
            count,
            books: books.map((book) => mapProductCard(book, `homepage_category:${category.slug}`)),
          } satisfies CatalogSectionViewModel;
        }),
      )
    ).filter((section): section is CatalogSectionViewModel => Boolean(section));

    const collectionSections = (
      await Promise.all(
        collections
          .filter(
            (collection) =>
              collection.publishStatus === PublishStatus.PUBLISHED && collection.isFeatured,
          )
          .map(async (collection) => {
            const [count, books] = await Promise.all([
              this.repository.countBooks({
                publishStatus: PublishStatus.PUBLISHED,
                collectionItems: {
                  some: {
                    collectionId: collection.id,
                  },
                },
              }),
              this.repository.findBooks({
                where: {
                  publishStatus: PublishStatus.PUBLISHED,
                  collectionItems: {
                    some: {
                      collectionId: collection.id,
                    },
                  },
                },
                orderBy: [{ sortWeight: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
                take: 3,
              }),
            ]);

            if (count === 0) {
              return null;
            }

            return {
              slug: collection.slug,
              name: collection.name,
              description: collection.description,
              href: `/collections/${collection.slug}`,
              count,
              books: books.map((book) =>
                mapProductCard(book, `homepage_collection:${collection.slug}`),
              ),
            } satisfies CatalogSectionViewModel;
          }),
      )
    ).filter((section): section is CatalogSectionViewModel => Boolean(section));

    const spotlightBook = featuredBooks[0] ?? bestsellerBooks[0];

    return {
      title: "Hiệu sách trức tuyến đã sẵn sàng",
      description:
        "Khám phá trang chủ sách, sách nổi bật, sách bán chạy, danh mục và bộ sưu tập trong Bookverse.",
      banner: {
        title: "Khám phá danh mục sách được sắp xếp rõ ràng ngay từ trang đầu",
        lead:
          "Các thông tin quan trọng như giá bán, phí giao hàng, tình trạng còn hàng và các đường dẫn đến danh mục, bộ sưu tập hoặc trang chi tiết sản phẩm đều được hiển thị dễ thấy và dễ hiểu ngay từ đầu.",
        primaryCta: {
          label: "Xem toàn bộ danh mục",
          href: "/books",
        },
        secondaryCta: {
          label: "Đi đến bộ sưu tập",
          href: "/#collections",
        },
      },
      spotlightBook,
      stats: [
        { label: "Tựa sách hiển thị", value: String(totalBooks) },
        { label: "Danh mục có dữ liệu", value: String(categorySections.length) },
        { label: "Bộ sưu tập sẵn sàng", value: String(collectionSections.length) },
      ],
      featuredBooks,
      bestsellerBooks,
      categorySections,
      collectionSections,
      analytics: buildAnalytics(
        [
          {
            eventName: ANALYTICS_EVENTS.VIEW_HOMEPAGE,
            payload: {
              featuredCount: featuredBooks.length,
              bestsellerCount: bestsellerBooks.length,
            },
          },
        ],
        {
          pageType: "homepage",
          sectionCount: categorySections.length + collectionSections.length,
        },
      ),
    };
  }

  async getCategoriesSummary(): Promise<CategorySummaryViewModel[]> {
    const categories = await this.repository.findCategories();

    const summaries = await Promise.all(
      categories.map(async (category) => {
        const bookCount = await this.repository.countBooks({
          publishStatus: PublishStatus.PUBLISHED,
          bookCategories: {
            some: {
              categoryId: category.id,
            },
          },
        });

        if (bookCount === 0) {
          return null;
        }

        return {
          slug: category.slug,
          name: category.name,
          description: category.description,
          bookCount,
          href: `/categories/${category.slug}`,
        } satisfies CategorySummaryViewModel;
      }),
    );

    return summaries.filter((item): item is CategorySummaryViewModel => Boolean(item));
  }

  async getCollectionsSummary(): Promise<CollectionSummaryViewModel[]> {
    const collections = await this.repository.findCollections();

    const summaries = await Promise.all(
      collections
        .filter((collection) => collection.publishStatus === PublishStatus.PUBLISHED)
        .map(async (collection) => {
          const [count, books] = await Promise.all([
            this.repository.countBooks({
              publishStatus: PublishStatus.PUBLISHED,
              collectionItems: {
                some: {
                  collectionId: collection.id,
                },
              },
            }),
            this.repository.findBooks({
              where: {
                publishStatus: PublishStatus.PUBLISHED,
                collectionItems: {
                  some: {
                    collectionId: collection.id,
                  },
                },
              },
              orderBy: [{ sortWeight: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
              take: 4,
            }),
          ]);

          if (count === 0) {
            return null;
          }

          return {
            slug: collection.slug,
            name: collection.name,
            description: collection.description,
            href: `/collections/${collection.slug}`,
            count,
            coverImageUrl: collection.coverImageUrl,
            isFeatured: collection.isFeatured,
            books: books.map((book) => mapProductCard(book, `collections_overview:${collection.slug}`)),
          } satisfies CollectionSummaryViewModel;
        }),
    );

    return summaries.filter((item): item is CollectionSummaryViewModel => Boolean(item));
  }

  async getListingPageData(scope: CatalogScope, query: ParsedCatalogQuery): Promise<ListingPageModel> {
    let scopedLabel: string | undefined;
    let scopedDescription: string | null | undefined;

    if (scope.type === "category") {
      const category = await this.repository.findCategoryBySlug(scope.slug ?? "");

      if (!category) {
        throw new AppError({
          statusCode: 404,
          code: "CATEGORY_NOT_FOUND",
          message: "Không tìm thấy danh mục yêu cầu.",
        });
      }

      scopedLabel = category.name;
      scopedDescription = category.description;
    }

    if (scope.type === "collection") {
      const collection = await this.repository.findCollectionBySlug(scope.slug ?? "");

      if (!collection || collection.publishStatus !== PublishStatus.PUBLISHED) {
        throw new AppError({
          statusCode: 404,
          code: "COLLECTION_NOT_FOUND",
          message: "Không tìm thấy bộ sưu tập yêu cầu.",
        });
      }

      scopedLabel = collection.name;
      scopedDescription = collection.description;
    }

    const basePath = getCatalogBasePath(scope);
    const baseScopeWhere = buildBaseScopeWhere(scope);
    const filteredWhere = buildFilteredWhere(scope, query);

    const [facetBooks, totalItems] = await Promise.all([
      this.repository.findFacetBooks(baseScopeWhere),
      this.repository.countBooks(filteredWhere),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / LISTING_PAGE_SIZE));
    const currentPage = totalItems === 0 ? 1 : Math.min(query.page, totalPages);
    const normalizedQuery: ParsedCatalogQuery = {
      ...query,
      page: currentPage,
    };

    const booksRaw = await this.repository.findBooks({
      where: filteredWhere,
      orderBy: buildSortOrder(query.sort),
      skip: (currentPage - 1) * LISTING_PAGE_SIZE,
      take: LISTING_PAGE_SIZE,
    });

    const books = booksRaw.map((book) =>
      mapProductCard(
        book,
        scope.type === "all" ? "listing" : `${scope.type}:${scope.slug ?? "unknown"}`,
      ),
    );

    const categoryCounts = new Map<string, { label: string; count: number }>();
    const authorCounts = new Map<string, { label: string; count: number }>();
    const publisherCounts = new Map<string, { label: string; count: number }>();
    const availabilityCounts = new Map<AvailabilityStatus, number>();
    const prices = facetBooks.map((book) => book.priceAmount);

    for (const book of facetBooks) {
      const uniqueCategories = new Set<string>();

      for (const category of book.bookCategories) {
        if (uniqueCategories.has(category.category.slug)) {
          continue;
        }

        uniqueCategories.add(category.category.slug);

        const existing = categoryCounts.get(category.category.slug);
        categoryCounts.set(category.category.slug, {
          label: category.category.name,
          count: (existing?.count ?? 0) + 1,
        });
      }

      const existingAuthor = authorCounts.get(book.author.slug);
      authorCounts.set(book.author.slug, {
        label: book.author.name,
        count: (existingAuthor?.count ?? 0) + 1,
      });

      const existingPublisher = publisherCounts.get(book.publisher.slug);
      publisherCounts.set(book.publisher.slug, {
        label: book.publisher.name,
        count: (existingPublisher?.count ?? 0) + 1,
      });

      availabilityCounts.set(
        book.availabilityStatus,
        (availabilityCounts.get(book.availabilityStatus) ?? 0) + 1,
      );
    }

    const filters: CatalogFiltersViewModel = {
      action: basePath,
      sortOptions: SORT_OPTIONS,
      selectedSort: query.sort,
      categoryOptions:
        scope.type === "category"
          ? []
          : Array.from(categoryCounts.entries())
              .sort((left, right) => left[1].label.localeCompare(right[1].label, "vi"))
              .map(([value, meta]) => ({
                value,
                label: meta.label,
                count: meta.count,
                selected: query.categorySlug === value,
              })),
      authorOptions: Array.from(authorCounts.entries())
        .sort((left, right) => left[1].label.localeCompare(right[1].label, "vi"))
        .map(([value, meta]) => ({
          value,
          label: meta.label,
          count: meta.count,
          selected: query.authorSlug === value,
        })),
      publisherOptions: Array.from(publisherCounts.entries())
        .sort((left, right) => left[1].label.localeCompare(right[1].label, "vi"))
        .map(([value, meta]) => ({
          value,
          label: meta.label,
          count: meta.count,
          selected: query.publisherSlug === value,
        })),
      availabilityOptions: [
        AVAILABILITY_STATUS.IN_STOCK,
        AVAILABILITY_STATUS.LOW_STOCK,
        AVAILABILITY_STATUS.OUT_OF_STOCK,
      ]
        .filter((status) => availabilityCounts.has(status))
        .map((status) => ({
          value: status,
          label: AVAILABILITY_LABELS[status],
          count: availabilityCounts.get(status) ?? 0,
          selected: query.availability === status,
        })),
      priceMin: query.priceMin,
      priceMax: query.priceMax,
      minAvailablePrice: prices.length > 0 ? Math.min(...prices) : undefined,
      maxAvailablePrice: prices.length > 0 ? Math.max(...prices) : undefined,
      hasActiveFilters:
        Boolean(query.categorySlug && scope.type !== "category") ||
        Boolean(query.authorSlug) ||
        Boolean(query.publisherSlug) ||
        Boolean(query.availability) ||
        typeof query.priceMin === "number" ||
        typeof query.priceMax === "number",
      resetHref: basePath,
    };

    const activeFilters: ActiveFilterViewModel[] = [];

    if (query.categorySlug && scope.type !== "category") {
      const categoryLabel =
        filters.categoryOptions.find((item) => item.value === query.categorySlug)?.label ??
        query.categorySlug;
      activeFilters.push({
        label: `Danh mục: ${categoryLabel}`,
        clearHref: buildCatalogHref(basePath, normalizedQuery, {
          categorySlug: undefined,
          page: 1,
        }),
      });
    }

    if (query.authorSlug) {
      const authorLabel =
        filters.authorOptions.find((item) => item.value === query.authorSlug)?.label ??
        query.authorSlug;
      activeFilters.push({
        label: `Tác giả: ${authorLabel}`,
        clearHref: buildCatalogHref(basePath, normalizedQuery, {
          authorSlug: undefined,
          page: 1,
        }),
      });
    }

    if (query.publisherSlug) {
      const publisherLabel =
        filters.publisherOptions.find((item) => item.value === query.publisherSlug)?.label ??
        query.publisherSlug;
      activeFilters.push({
        label: `NXB: ${publisherLabel}`,
        clearHref: buildCatalogHref(basePath, normalizedQuery, {
          publisherSlug: undefined,
          page: 1,
        }),
      });
    }

    if (query.availability) {
      activeFilters.push({
        label: `Tình trạng: ${AVAILABILITY_LABELS[query.availability]}`,
        clearHref: buildCatalogHref(basePath, normalizedQuery, {
          availability: undefined,
          page: 1,
        }),
      });
    }

    const priceLabel = buildPriceLabel(query.priceMin, query.priceMax);

    if (priceLabel) {
      activeFilters.push({
        label: priceLabel,
        clearHref: buildCatalogHref(basePath, normalizedQuery, {
          priceMin: undefined,
          priceMax: undefined,
          page: 1,
        }),
      });
    }

    const eyebrow =
      scope.type === "category"
        ? "Danh mục"
        : scope.type === "collection"
          ? "Bộ sưu tập"
          : "Danh mục sách";

    const pageHeading =
      scope.type === "category" || scope.type === "collection"
        ? (scopedLabel ?? "Danh sách sách")
        : "Duyệt toàn bộ danh mục sách";

    const pageLead =
      scopedDescription ??
      (scope.type === "collection"
        ? "Lọc sách theo tác giả, nhà xuất bản, khoảng giá và tình trạng tồn kho ngay trên bộ sưu tập."
        : scope.type === "category"
          ? "Duyệt sách trong danh mục và tiếp tục lọc theo tác giả, nhà xuất bản, giá và tình trạng còn hàng."
          : "Danh mục sách có bộ lọc theo danh mục, tác giả, nhà xuất bản, khoảng giá và tình trạng còn hàng.");

    const pagination = buildPagination(basePath, normalizedQuery, totalItems, totalPages, currentPage);

    const resultSummary =
      totalItems === 0
        ? "Chưa có sách phù hợp với bộ lọc hiện tại."
        : `Đang hiển thị ${pagination?.from ?? 1}-${pagination?.to ?? books.length} trong ${totalItems} tựa sách.`;

    return {
      title:
        scope.type === "all"
          ? "Danh mục sách"
          : scopedLabel
            ? `${scopedLabel} | Danh mục sách`
            : "Danh mục sách",
      description: pageLead,
      eyebrow,
      pageHeading,
      pageLead,
      breadcrumb: buildBreadcrumb(scope, scopedLabel),
      resultSummary,
      currentSortLabel: getSortLabel(query.sort),
      books,
      filters,
      activeFilters,
      pagination,
      emptyState:
        totalItems === 0
          ? {
              title: "Không tìm thấy sách phù hợp",
              message:
                "Thử xóa bớt bộ lọc hoặc quay lại danh sách gốc để tiếp tục khám phá danh mục sách.",
              resetHref: basePath,
            }
          : null,
      analytics: buildAnalytics(
        [
          {
            eventName:
              scope.type === "category"
                ? ANALYTICS_EVENTS.VIEW_CATEGORY
                : scope.type === "collection"
                  ? ANALYTICS_EVENTS.VIEW_COLLECTION
                  : ANALYTICS_EVENTS.VIEW_LANDING_PAGE,
            payload: {
              scope: scope.type,
              scopeSlug: scope.slug,
              totalItems,
              sort: query.sort,
            },
          },
        ],
        {
          pageType: scope.type === "all" ? "listing" : scope.type,
          scopeSlug: scope.slug,
          activeFilterCount: activeFilters.length,
        },
      ),
    };
  }

  async getBookDetailPageData(slug: string): Promise<ProductDetailPageModel> {
    const book = await this.repository.findBookDetailBySlug(slug);

    if (!book) {
      throw new AppError({
        statusCode: 404,
        code: "BOOK_NOT_FOUND",
        message: "Không tìm thấy sách yêu cầu.",
      });
    }

    const primaryCategory = getPrimaryCategory(book);
    const relatedWhereConditions: Prisma.BookWhereInput[] = [
      {
        publishStatus: PublishStatus.PUBLISHED,
      },
      {
        id: {
          not: book.id,
        },
      },
    ];

    const similarConditions: Prisma.BookWhereInput[] = [];

    if (book.authorId) {
      similarConditions.push({
        authorId: book.authorId,
      });
    }

    const categoryIds = book.bookCategories.map((item) => item.category.id);

    if (categoryIds.length > 0) {
      similarConditions.push({
        bookCategories: {
          some: {
            categoryId: {
              in: categoryIds,
            },
          },
        },
      });
    }

    if (similarConditions.length > 0) {
      relatedWhereConditions.push({
        OR: similarConditions,
      });
    }

    const relatedBooksRaw = await this.repository.findBooks({
      where:
        similarConditions.length > 0
          ? { AND: relatedWhereConditions }
          : {
              publishStatus: PublishStatus.PUBLISHED,
              id: {
                not: book.id,
              },
              isRecommended: true,
            },
      orderBy: buildSortOrder(CATALOG_SORTS.FEATURED),
      take: 4,
    });

    const relatedBooks = relatedBooksRaw.map((item) => mapProductCard(item, "related_books"));
    const card = mapProductCard(book, "product_detail");
    const metadataItems: ProductMetadataItemViewModel[] = [
      {
        label: "Tác giả",
        value: book.author.name,
        href: `/books?author=${book.author.slug}`,
      },
      {
        label: "Nhà xuất bản",
        value: book.publisher.name,
        href: `/books?publisher=${book.publisher.slug}`,
      },
      {
        label: "Danh mục",
        value:
          book.bookCategories.length > 0
            ? book.bookCategories.map((item) => item.category.name).join(", ")
            : "Đang cập nhật",
      },
      {
        label: "Ngôn ngữ",
        value: book.languageCode ? book.languageCode.toUpperCase() : "Đang cập nhật",
      },
      {
        label: "Số trang",
        value: typeof book.pageCount === "number" ? `${book.pageCount} trang` : "Đang cập nhật",
      },
      {
        label: "ISBN",
        value: book.isbn ?? "Đang cập nhật",
      },
      {
        label: "Phát hành",
        value: book.publishedAt ? formatDate(book.publishedAt) : "Đang cập nhật",
      },
    ];

    return {
      title: book.title,
      description:
        book.shortDescription ??
        book.description ??
        `Chi tiết sách ${book.title} với giá, phí giao hàng và thông tin sách`,
      breadcrumb: [
        { label: "Trang chủ", href: "/" },
        primaryCategory
          ? {
              label: primaryCategory.name,
              href: `/categories/${primaryCategory.slug}`,
            }
          : {
              label: "Danh mục sách",
              href: "/books",
            },
        { label: book.title, active: true },
      ],
      book: {
        ...card,
        subtitle: book.subtitle,
        longDescription:
          book.description ??
          book.shortDescription ??
          "Nội dung mô tả chi tiết cho tựa sách này đang được cập nhật thêm từ dữ liệu danh mục.",
        pageCount: book.pageCount,
        languageCode: book.languageCode,
        isbn: book.isbn,
        publishedAtLabel: book.publishedAt ? formatDate(book.publishedAt) : null,
        inventoryQuantity: book.inventoryQuantity,
        collections: book.collectionItems.map((item) => ({
          slug: item.collection.slug,
          name: item.collection.name,
          href: `/collections/${item.collection.slug}`,
        })),
        metadataItems,
        purchaseNote:
          book.availabilityStatus === AVAILABILITY_STATUS.OUT_OF_STOCK
            ? "Cuốn sách hiện đang hết hàng tạm thời. Nút “Mua” vẫn xuất hiện trên giao diện, nhưng người dùng chưa thể thực hiện quy trình mua hàng."
            : "Nút “Mua” đã hoạt động đầy đủ trên giao diện và được liên kết với các bước mua hàng như giỏ hàng và trang thanh toán.",
        isPurchasable: book.availabilityStatus !== AVAILABILITY_STATUS.OUT_OF_STOCK,
      },
      relatedBooks,
      analytics: buildAnalytics(
        [
          {
            eventName: ANALYTICS_EVENTS.VIEW_ITEM,
            payload: {
              bookSlug: book.slug,
              primaryCategorySlug: primaryCategory?.slug,
            },
          },
        ],
        {
          pageType: "product_detail",
          bookSlug: book.slug,
        },
      ),
    };
  }
}
