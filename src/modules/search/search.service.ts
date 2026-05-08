import type { Prisma } from "../../generated/prisma/client.js";
import { PublishStatus } from "../../generated/prisma/enums.js";
import { ANALYTICS_EVENTS, AVAILABILITY_STATUS } from "../../shared/contracts";
import { makeMoney } from "../../shared/utils/money";
import {
  CatalogRepository,
  type StorefrontBookRecord,
} from "../catalog/catalog.repository";
import type {
  BreadcrumbItem,
  PageAnalyticsViewModel,
  PaginationViewModel,
  ProductBadgeViewModel,
  ProductCardViewModel,
} from "../catalog/catalog.types";
import {
  buildParsedSearchQuery,
  buildBookDetailHref,
  buildSearchHref,
  normalizeSearchText,
} from "./search.query";
import { SearchRepository } from "./search.repository";
import type {
  ParsedSearchQuery,
  SearchPageModel,
  SearchRequestContext,
  SearchSectionViewModel,
  SearchSelectionCaptureInput,
  SearchSuggestionsResponse,
} from "./search.types";

const SEARCH_PAGE_SIZE = 6;
const SEARCH_CANDIDATE_LIMIT = 80;
const DISCOVERY_LIMIT = 4;

const AVAILABILITY_LABELS = {
  [AVAILABILITY_STATUS.IN_STOCK]: "C?n h?ng",
  [AVAILABILITY_STATUS.LOW_STOCK]: "S?p h?t h?ng",
  [AVAILABILITY_STATUS.OUT_OF_STOCK]: "T?m h?t h?ng",
} as const;

const SEARCH_BASE_ORDER: Prisma.BookOrderByWithRelationInput[] = [
  { isFeatured: "desc" },
  { isBestseller: "desc" },
  { isRecommended: "desc" },
  { sortWeight: "desc" },
  { publishedAt: "desc" },
  { createdAt: "desc" },
];

interface RankedSearchBook {
  book: StorefrontBookRecord;
  score: number;
  matchedBy: string[];
}

function buildAnalytics(
  events: PageAnalyticsViewModel["events"],
  context: Record<string, unknown>,
): PageAnalyticsViewModel {
  return {
    events,
    context,
  };
}

function buildBreadcrumb(): BreadcrumbItem[] {
  return [
    { label: "Trang ch?", href: "/" },
    { label: "T?m ki?m", active: true },
  ];
}

function getPrimaryCategory(book: StorefrontBookRecord) {
  const primary = book.bookCategories.find((item) => item.isPrimary) ?? book.bookCategories[0];

  if (!primary) {
    return undefined;
  }

  return {
    id: primary.category.id,
    slug: primary.category.slug,
    name: primary.category.name,
  };
}

function buildBadges(book: StorefrontBookRecord): ProductBadgeViewModel[] {
  const badges: ProductBadgeViewModel[] = [];

  if (book.isFeatured) {
    badges.push({ label: "N?i b?t", tone: "featured" });
  }

  if (book.isBestseller) {
    badges.push({ label: "B?n ch?y", tone: "bestseller" });
  }

  if (book.isRecommended) {
    badges.push({ label: "G?i ?", tone: "recommended" });
  }

  if (book.availabilityStatus === AVAILABILITY_STATUS.LOW_STOCK) {
    badges.push({ label: "S?p h?t", tone: "availability" });
  }

  if (book.availabilityStatus === AVAILABILITY_STATUS.OUT_OF_STOCK) {
    badges.push({ label: "H?t h?ng", tone: "availability" });
  }

  return badges;
}

function toProductCard(
  book: StorefrontBookRecord,
  params: {
    sourceContext: string;
    interactionEventName?: string;
    searchLogId?: string;
    searchRank?: number;
    searchSource?: string;
    searchQuery?: string;
  },
): ProductCardViewModel {
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
    primaryCategory:
      primaryCategory &&
      ({
        slug: primaryCategory.slug,
        name: primaryCategory.name,
      }),
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
    detailHref: buildBookDetailHref(book.slug, {
      searchLogId: params.searchLogId,
      searchRank: params.searchRank,
      searchSource: params.searchSource,
    }),
    interactionEventName: params.interactionEventName,
    analyticsPayload: {
      bookId: book.id,
      bookSlug: book.slug,
      title: book.title,
      sourceContext: params.sourceContext,
      primaryCategorySlug: primaryCategory?.slug,
      searchLogId: params.searchLogId,
      searchRank: params.searchRank,
      searchSource: params.searchSource,
      searchQuery: params.searchQuery,
    },
  };
}

function normalizeField(value?: string | null): string {
  return value ? normalizeSearchText(value) : "";
}

function buildPrimarySearchWhere(query: ParsedSearchQuery): Prisma.BookWhereInput {
  return {
    AND: [
      {
        publishStatus: PublishStatus.PUBLISHED,
      },
      {
        OR: [
          {
            title: {
              contains: query.normalizedQuery,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: query.slugQuery,
              mode: "insensitive",
            },
          },
          {
            author: {
              is: {
                name: {
                  contains: query.normalizedQuery,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            author: {
              is: {
                slug: {
                  contains: query.slugQuery,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            publisher: {
              is: {
                name: {
                  contains: query.normalizedQuery,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            publisher: {
              is: {
                slug: {
                  contains: query.slugQuery,
                  mode: "insensitive",
                },
              },
            },
          },
          {
            keywords: {
              has: query.normalizedQuery,
            },
          },
          {
            shortDescription: {
              contains: query.normalizedQuery,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query.normalizedQuery,
              mode: "insensitive",
            },
          },
        ],
      },
    ],
  };
}

function buildFallbackSearchWhere(query: ParsedSearchQuery): Prisma.BookWhereInput {
  return {
    AND: [
      {
        publishStatus: PublishStatus.PUBLISHED,
      },
      {
        OR: [
          ...query.terms.map<Prisma.BookWhereInput>((term) => ({
            title: {
              contains: term,
              mode: "insensitive",
            },
          })),
          ...query.terms.map<Prisma.BookWhereInput>((term) => ({
            slug: {
              contains: term,
              mode: "insensitive",
            },
          })),
          ...query.terms.map<Prisma.BookWhereInput>((term) => ({
            author: {
              is: {
                name: {
                  contains: term,
                  mode: "insensitive",
                },
              },
            },
          })),
          ...query.terms.map<Prisma.BookWhereInput>((term) => ({
            publisher: {
              is: {
                name: {
                  contains: term,
                  mode: "insensitive",
                },
              },
            },
          })),
          {
            keywords: {
              hasSome: query.terms,
            },
          },
          ...query.terms.map<Prisma.BookWhereInput>((term) => ({
            description: {
              contains: term,
              mode: "insensitive",
            },
          })),
        ],
      },
    ],
  };
}

function buildBroadPublishedWhere(): Prisma.BookWhereInput {
  return {
    publishStatus: PublishStatus.PUBLISHED,
  };
}

function scoreField(
  field: string,
  query: ParsedSearchQuery,
  weights: {
    exact: number;
    startsWith: number;
    contains: number;
    perTerm: number;
  },
): number {
  if (!field) {
    return 0;
  }

  if (field === query.normalizedQuery) {
    return weights.exact;
  }

  if (field.startsWith(query.normalizedQuery)) {
    return weights.startsWith;
  }

  if (field.includes(query.normalizedQuery)) {
    return weights.contains;
  }

  const matchedTerms = query.terms.filter((term) => field.includes(term)).length;
  return matchedTerms > 0 ? matchedTerms * weights.perTerm : 0;
}

function scoreBook(book: StorefrontBookRecord, query: ParsedSearchQuery): RankedSearchBook | null {
  const matchedBy = new Set<string>();
  const title = normalizeField(book.title);
  const author = normalizeField(book.author.name);
  const publisher = normalizeField(book.publisher.name);
  const slug = normalizeField(book.slug);
  const descriptions = [normalizeField(book.shortDescription), normalizeField(book.description)]
    .filter(Boolean)
    .join(" ");
  const keywords = book.keywords.map((item) => normalizeField(item)).filter(Boolean);
  let score = 0;

  const titleScore = Math.max(
    scoreField(title, query, {
      exact: 240,
      startsWith: 200,
      contains: 170,
      perTerm: 28,
    }),
    scoreField(slug, query, {
      exact: 235,
      startsWith: 180,
      contains: 150,
      perTerm: 26,
    }),
  );

  if (titleScore > 0) {
    matchedBy.add("T?n s?ch");
    score += titleScore;
  }

  const authorScore = scoreField(author, query, {
    exact: 210,
    startsWith: 170,
    contains: 145,
    perTerm: 24,
  });

  if (authorScore > 0) {
    matchedBy.add("T?c gi?");
    score += authorScore;
  }

  const publisherScore = scoreField(publisher, query, {
    exact: 170,
    startsWith: 145,
    contains: 120,
    perTerm: 18,
  });

  if (publisherScore > 0) {
    matchedBy.add("Nh? xu?t b?n");
    score += publisherScore;
  }

  const exactKeywordMatch = keywords.some((keyword) => keyword === query.normalizedQuery);
  const containsKeywordMatch = keywords.some((keyword) => keyword.includes(query.normalizedQuery));
  const termKeywordMatches = query.terms.filter((term) =>
    keywords.some((keyword) => keyword.includes(term)),
  ).length;

  if (exactKeywordMatch) {
    matchedBy.add("T? kh?a");
    score += 160;
  } else if (containsKeywordMatch) {
    matchedBy.add("T? kh?a");
    score += 130;
  } else if (termKeywordMatches > 0) {
    matchedBy.add("T? kh?a");
    score += termKeywordMatches * 24;
  }

  const descriptionScore = scoreField(descriptions, query, {
    exact: 40,
    startsWith: 28,
    contains: 22,
    perTerm: 8,
  });
  score += descriptionScore;

  if (matchedBy.size === 0 && descriptionScore === 0) {
    return null;
  }

  if (book.isFeatured) {
    score += 12;
  }

  if (book.isBestseller) {
    score += 10;
  }

  if (book.isRecommended) {
    score += 8;
  }

  if (book.availabilityStatus === AVAILABILITY_STATUS.IN_STOCK) {
    score += 4;
  }

  score += Math.min(book.sortWeight / 4, 30);

  return {
    book,
    score,
    matchedBy: Array.from(matchedBy),
  };
}

function sortRankedBooks(left: RankedSearchBook, right: RankedSearchBook): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (right.matchedBy.length !== left.matchedBy.length) {
    return right.matchedBy.length - left.matchedBy.length;
  }

  if (right.book.sortWeight !== left.book.sortWeight) {
    return right.book.sortWeight - left.book.sortWeight;
  }

  const leftPublishedAt = left.book.publishedAt?.getTime() ?? left.book.createdAt.getTime();
  const rightPublishedAt = right.book.publishedAt?.getTime() ?? right.book.createdAt.getTime();
  return rightPublishedAt - leftPublishedAt;
}

function buildPagination(
  query: ParsedSearchQuery,
  totalItems: number,
  totalPages: number,
  currentPage: number,
): PaginationViewModel | undefined {
  if (totalItems <= SEARCH_PAGE_SIZE) {
    return undefined;
  }

  const items = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;

    return {
      label: String(page),
      href: buildSearchHref(query, { page }),
      active: page === currentPage,
      disabled: false,
    };
  });

  return {
    page: currentPage,
    totalPages,
    pageSize: SEARCH_PAGE_SIZE,
    totalItems,
    from: totalItems === 0 ? 0 : (currentPage - 1) * SEARCH_PAGE_SIZE + 1,
    to: Math.min(currentPage * SEARCH_PAGE_SIZE, totalItems),
    prevHref:
      currentPage > 1 ? buildSearchHref(query, { page: currentPage - 1 }) : undefined,
    nextHref:
      currentPage < totalPages ? buildSearchHref(query, { page: currentPage + 1 }) : undefined,
    items,
  };
}

export class SearchService {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly searchRepository: SearchRepository,
  ) {}

  private async loadEntrySuggestionSection(): Promise<SearchSectionViewModel> {
    const books = await this.catalogRepository.findBooks({
      where: {
        publishStatus: PublishStatus.PUBLISHED,
      },
      orderBy: SEARCH_BASE_ORDER,
      take: DISCOVERY_LIMIT,
    });

    return {
      eyebrow: "Kh?m ph? nhanh",
      title: "B?t ??u t? nh?ng t?a s?ch ?ang ???c ?u ti?n",
      description:
        "Khi ch?a c? t? kh?a c? th?, ng??i d?ng v?n c? m?t ?i?m b?t ??u r? r?ng t? s?ch n?i b?t, b?n ch?y v? ?ang c? s?n.",
      books: books.map((book, index) =>
        toProductCard(book, {
          sourceContext: "search_entry",
          interactionEventName: ANALYTICS_EVENTS.CLICK_PRODUCT_CARD,
          searchRank: index + 1,
          searchSource: "entry_suggestions",
        }),
      ),
    };
  }

  private async buildExploreLinks() {
    const [categories, collections] = await Promise.all([
      this.catalogRepository.findCategories(3),
      this.catalogRepository.findCollections(2),
    ]);

    return [
      {
        label: "Duy?t to?n b? danh m?c",
        href: "/books",
        note: "M? danh s?ch s?ch ??y ?? v? ti?p t?c l?c theo nhu c?u.",
      },
      ...categories.map((category) => ({
        label: `Danh m?c ${category.name}`,
        href: `/categories/${category.slug}`,
        note: category.description ?? "?i th?ng v?o m?t danh m?c ?? c? d? li?u.",
      })),
      ...collections
        .filter((collection) => collection.publishStatus === PublishStatus.PUBLISHED)
        .map((collection) => ({
          label: `B? s?u t?p ${collection.name}`,
          href: `/collections/${collection.slug}`,
          note: collection.description ?? "Kh?m ph? m?t b? s?u t?p ?ang ???c xu?t b?n.",
        })),
    ];
  }

  private async buildSuggestionSection(
    rankedBooks: RankedSearchBook[],
    query: ParsedSearchQuery,
    searchLogId?: string,
  ): Promise<SearchSectionViewModel> {
    const resultBookIds = new Set(rankedBooks.map((item) => item.book.id));
    const authorIds = Array.from(new Set(rankedBooks.slice(0, 3).map((item) => item.book.authorId)));
    const publisherIds = Array.from(
      new Set(rankedBooks.slice(0, 3).map((item) => item.book.publisherId)),
    );
    const categoryIds = Array.from(
      new Set(
        rankedBooks
          .slice(0, 3)
          .flatMap((item) => item.book.bookCategories.map((category) => category.category.id)),
      ),
    );

    const metadataMatches: Prisma.BookWhereInput[] = [];

    if (authorIds.length > 0) {
      metadataMatches.push({
        authorId: {
          in: authorIds,
        },
      });
    }

    if (publisherIds.length > 0) {
      metadataMatches.push({
        publisherId: {
          in: publisherIds,
        },
      });
    }

    if (categoryIds.length > 0) {
      metadataMatches.push({
        bookCategories: {
          some: {
            categoryId: {
              in: categoryIds,
            },
          },
        },
      });
    }

    let relatedBooks = await this.catalogRepository.findBooks({
      where:
        metadataMatches.length > 0
          ? {
              AND: [
                {
                  publishStatus: PublishStatus.PUBLISHED,
                },
                {
                  id: {
                    notIn: Array.from(resultBookIds),
                  },
                },
                {
                  OR: metadataMatches,
                },
              ],
            }
          : {
              publishStatus: PublishStatus.PUBLISHED,
              id: {
                notIn: Array.from(resultBookIds),
              },
              isRecommended: true,
            },
      orderBy: SEARCH_BASE_ORDER,
      take: DISCOVERY_LIMIT,
    });

    if (relatedBooks.length < DISCOVERY_LIMIT) {
      const extraBooks = await this.catalogRepository.findBooks({
        where: {
          publishStatus: PublishStatus.PUBLISHED,
          id: {
            notIn: [...Array.from(resultBookIds), ...relatedBooks.map((book) => book.id)],
          },
        },
        orderBy: SEARCH_BASE_ORDER,
        take: DISCOVERY_LIMIT - relatedBooks.length,
      });

      relatedBooks = [...relatedBooks, ...extraBooks];
    }

    return {
      eyebrow: "Gợi ý liên quan",
      title: `Tiếp tục khám phá từ kết quả "${query.rawQuery}"`,
      description:
        "Khối này được tạo theo luật từ tác giả, nhà xuất bản, danh mục và độ ưu tiên trên storefront để mở rộng hành trình tìm sách.",
      books: relatedBooks.map((book, index) =>
        toProductCard(book, {
          sourceContext: "search_related_suggestions",
          interactionEventName: ANALYTICS_EVENTS.SELECT_SEARCH_RESULT,
          searchLogId,
          searchRank: index + 1,
          searchSource: "suggestions",
          searchQuery: query.rawQuery,
        }),
      ),
    };
  }

  private async buildNoResultSuggestionSection(
    query: ParsedSearchQuery,
    searchLogId?: string,
  ): Promise<SearchSectionViewModel> {
    const books = await this.catalogRepository.findBooks({
      where: {
        publishStatus: PublishStatus.PUBLISHED,
      },
      orderBy: SEARCH_BASE_ORDER,
      take: DISCOVERY_LIMIT,
    });

    return {
      eyebrow: "Kh?ng ?? trang tr?ng",
      title: "Th? b?t ??u t? nh?ng t?a s?ch c? kh? n?ng ph? h?p",
      description:
        "Khi kh?ng c? k?t qu? tr?ng kh?p, storefront v?n ??a ra m?t nh?m s?ch theo lu?t ?? ng??i d?ng kh?ng b? ng?t qu?ng h?nh tr?nh kh?m ph?.",
      books: books.map((book, index) =>
        toProductCard(book, {
          sourceContext: "search_no_result_suggestions",
          interactionEventName: ANALYTICS_EVENTS.SELECT_SEARCH_RESULT,
          searchLogId,
          searchRank: index + 1,
          searchSource: "suggestions",
          searchQuery: query.rawQuery,
        }),
      ),
    };
  }

  async getSearchPageData(
    query: ParsedSearchQuery,
    requestContext: SearchRequestContext,
  ): Promise<SearchPageModel> {
    const exploreLinksPromise = this.buildExploreLinks();

    if (!query.hasQuery) {
      const [exploreLinks, suggestionSection] = await Promise.all([
        exploreLinksPromise,
        this.loadEntrySuggestionSection(),
      ]);

      return {
        title: "T?m ki?m s?ch",
        description:
          "T?m s?ch theo t?n s?ch, t?c gi?, t? kh?a v? nh? xu?t b?n, ??ng th?i gi? l?i l?i kh?m ph? khi ch?a c? t? kh?a c? th?.",
        breadcrumb: buildBreadcrumb(),
        pageHeading: "T?m ki?m s?ch trong storefront",
        pageLead:
          "T?m theo t?n s?ch, t?c gi?, t? kh?a ho?c nh? xu?t b?n. N?u ch?a c? t? kh?a, b?n v?n c? th? b?t ??u t? c?c g?i ? b?n d??i.",
        searchQuery: "",
        hasQuery: false,
        resultSummary:
          "Nh?p t? kh?a ?? nh?n k?t qu? t?m ki?m v? c?c g?i ? m? r?ng ph? h?p v?i danh m?c hi?n t?i.",
        fallbackNotice: null,
        matchedBy: [],
        books: [],
        pagination: undefined,
        emptyState: null,
        suggestionSection,
        exploreLinks,
        analytics: buildAnalytics([], {
          pageType: "search_entry",
          searchQuery: "",
        }),
      };
    }

    const primaryCandidates = await this.catalogRepository.findBooks({
      where: buildPrimarySearchWhere(query),
      orderBy: SEARCH_BASE_ORDER,
      take: SEARCH_CANDIDATE_LIMIT,
    });

    let fallbackMode: "none" | "term_expansion" | "normalized_rescore" = "none";
    let candidates = primaryCandidates;

    if (candidates.length === 0 && query.terms.length > 1) {
      fallbackMode = "term_expansion";
      candidates = await this.catalogRepository.findBooks({
        where: buildFallbackSearchWhere(query),
        orderBy: SEARCH_BASE_ORDER,
        take: SEARCH_CANDIDATE_LIMIT,
      });
    }

    if (candidates.length === 0) {
      fallbackMode = "normalized_rescore";
      candidates = await this.catalogRepository.findBooks({
        where: buildBroadPublishedWhere(),
        orderBy: SEARCH_BASE_ORDER,
        take: SEARCH_CANDIDATE_LIMIT,
      });
    }

    const rankedBooks = Array.from(
      new Map(
        candidates
          .map((book) => scoreBook(book, query))
          .filter((item): item is RankedSearchBook => Boolean(item))
          .map((item) => [item.book.id, item]),
      ).values(),
    ).sort(sortRankedBooks);

    const totalItems = rankedBooks.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / SEARCH_PAGE_SIZE));
    const currentPage = totalItems === 0 ? 1 : Math.min(query.page, totalPages);
    const normalizedQuery: ParsedSearchQuery = {
      ...query,
      page: currentPage,
    };

    const searchLogId = await this.searchRepository.createSearchLog({
      requestId: requestContext.requestId,
      sessionId: requestContext.sessionId,
      userId: requestContext.userId,
      rawQuery: query.rawQuery,
      normalizedQuery: query.normalizedQuery,
      resultCount: totalItems,
      noResult: totalItems === 0,
      page: currentPage,
      fallbackApplied: fallbackMode !== "none",
      fallbackMode,
      matchedBy: Array.from(new Set(rankedBooks.flatMap((item) => item.matchedBy))),
      topBookSlugs: rankedBooks.slice(0, 5).map((item) => item.book.slug),
    });

    const pageResults = rankedBooks.slice(
      (currentPage - 1) * SEARCH_PAGE_SIZE,
      currentPage * SEARCH_PAGE_SIZE,
    );

    const books = pageResults.map((item, index) =>
      toProductCard(item.book, {
        sourceContext: "search_results",
        interactionEventName: ANALYTICS_EVENTS.SELECT_SEARCH_RESULT,
        searchLogId,
        searchRank: (currentPage - 1) * SEARCH_PAGE_SIZE + index + 1,
        searchSource: "results",
        searchQuery: query.rawQuery,
      }),
    );

    const [exploreLinks, suggestionSection] = await Promise.all([
      exploreLinksPromise,
      totalItems > 0
        ? this.buildSuggestionSection(rankedBooks, query, searchLogId)
        : this.buildNoResultSuggestionSection(query, searchLogId),
    ]);

    const pagination = buildPagination(normalizedQuery, totalItems, totalPages, currentPage);
    const matchedBy = Array.from(new Set(pageResults.flatMap((item) => item.matchedBy)));

    return {
      title: `Tìm kiếm: ${query.rawQuery}`,
      description: `Kết quả tìm kiếm sách cho ${query.rawQuery}.`,
      breadcrumb: buildBreadcrumb(),
      pageHeading: `Kết quả tìm kiếm cho "${query.rawQuery}"`,
      pageLead:
        "C?ng c? t?m ki?m hi?n ?u ti?n t?n s?ch, t?c gi?, nh? xu?t b?n v? t? kh?a; khi c?n s? m? r?ng theo t?ng t? ?? gi? tr?i nghi?m t?m ki?m h?u ?ch.",
      searchQuery: query.rawQuery,
      hasQuery: true,
      resultSummary:
        totalItems === 0
          ? `Không tìm thấy tựa sách nào cho "${query.rawQuery}".`
          : `Tìm thấy ${totalItems} tựa sách. Đang hiển thị ${pagination?.from ?? 1}-${pagination?.to ?? books.length}.`,
      fallbackNotice:
        fallbackMode === "term_expansion"
          ? "H? th?ng kh?ng th?y k?t qu? kh?p v?i c? c?m t?, n?n ?? m? r?ng theo t?ng t? kh?a ?? t?ng kh? n?ng t?m ???c s?ch."
          : fallbackMode === "normalized_rescore"
            ? "H? th?ng ?? m? r?ng theo ph??ng ?n so kh?p kh?ng d?u v? x?p h?ng theo lu?t ?? tr?nh b? s?t s?ch ph? h?p."
            : null,
      matchedBy,
      books,
      pagination,
      emptyState:
        totalItems === 0
          ? {
              title: "Kh?ng t?m th?y k?t qu? tr?ng kh?p",
              message:
                fallbackMode !== "none"
                  ? "H? th?ng ?? th? th?m c?c b??c m? r?ng truy v?n nh?ng v?n ch?a c? k?t qu? tr?ng kh?p. B?n c? th? ??i c?ch vi?t, th? theo t?c gi?/nh? xu?t b?n ho?c chuy?n sang c?c g?i ? b?n d??i."
                  : "Th? ??i sang t?n t?c gi?, nh? xu?t b?n, m?t t? kh?a ng?n h?n ho?c duy?t qua c?c kh?i g?i ? b?n d??i ?? ti?p t?c kh?m ph?.",
              resetHref: "/search",
              tips: [
                "R?t g?n t? kh?a ?? gi? l?i nh?ng th?nh ph?n quan tr?ng nh?t.",
                "Th? t?m theo t?n t?c gi? ho?c nh? xu?t b?n thay v? c? c?u d?i.",
                "N?u nh? ch? ?? h?n l? t?n s?ch, h?y th? b?ng t? kh?a n?i dung.",
              ],
            }
          : null,
      suggestionSection,
      exploreLinks,
      analytics: buildAnalytics(
        [
          {
            eventName: ANALYTICS_EVENTS.SEARCH,
            payload: {
              query: query.rawQuery,
              normalizedQuery: query.normalizedQuery,
              page: currentPage,
              fallbackMode,
            },
          },
          {
            eventName: ANALYTICS_EVENTS.VIEW_SEARCH_RESULTS,
            payload: {
              query: query.rawQuery,
              resultCount: totalItems,
              noResult: totalItems === 0,
              fallbackApplied: fallbackMode !== "none",
              fallbackMode,
            },
          },
          ...(totalItems === 0
            ? [
                {
                  eventName: ANALYTICS_EVENTS.SEARCH_NO_RESULT,
                  payload: {
                    query: query.rawQuery,
                    fallbackApplied: fallbackMode !== "none",
                    fallbackMode,
                  },
                },
              ]
            : []),
        ],
        {
          pageType: "search_results",
          searchQuery: query.rawQuery,
          resultCount: totalItems,
          fallbackApplied: fallbackMode !== "none",
          fallbackMode,
          matchedBy,
        },
      ),
    };
  }

  async captureSearchSelection(input: SearchSelectionCaptureInput) {
    return this.searchRepository.captureSearchSelection(input);
  }

  async getSearchSuggestions(rawInput: string): Promise<SearchSuggestionsResponse> {
    const query = buildParsedSearchQuery(rawInput);

    if (!query.hasQuery) {
      return {
        query: "",
        queries: [],
        books: [],
        topics: [],
        viewAllHref: "/search",
      };
    }

    let candidates = await this.catalogRepository.findBooks({
      where: buildPrimarySearchWhere(query),
      orderBy: SEARCH_BASE_ORDER,
      take: 10,
    });

    if (candidates.length === 0 && query.terms.length > 1) {
      candidates = await this.catalogRepository.findBooks({
        where: buildFallbackSearchWhere(query),
        orderBy: SEARCH_BASE_ORDER,
        take: 10,
      });
    }

    const rankedBooks = candidates
      .map((book) => scoreBook(book, query))
      .filter((item): item is RankedSearchBook => Boolean(item))
      .sort(sortRankedBooks);

    const books = rankedBooks.slice(0, 4).map((item) => ({
      label: item.book.title,
      href: buildBookDetailHref(item.book.slug),
      note: item.book.author.name,
      kind: "book" as const,
    }));

    const queries = Array.from(
      new Map(
        [
          {
            label: `Tìm "${query.rawQuery}" trong toàn bộ catalog`,
            href: buildSearchHref(query),
            note: "Hiển thị tất cả kết quả phù hợp",
            kind: "query" as const,
          },
          ...rankedBooks.slice(0, 3).map((item) => ({
            label: item.book.title,
            href: buildSearchHref(query, { rawQuery: item.book.title }),
            note: "Mở lại truy vấn theo tên sách",
            kind: "query" as const,
          })),
        ].map((entry) => [entry.label, entry]),
      ).values(),
    ).slice(0, 4);

    const topics = Array.from(
      new Map(
        rankedBooks
          .slice(0, 4)
          .flatMap((item) => {
            const primaryCategory = getPrimaryCategory(item.book);

            return [
              {
                label: item.book.author.name,
                href: `/books?author=${item.book.author.slug}`,
                note: "Tác giả",
                kind: "author" as const,
              },
              ...(primaryCategory
                ? [
                    {
                      label: primaryCategory.name,
                      href: `/categories/${primaryCategory.slug}`,
                      note: "Danh mục",
                      kind: "category" as const,
                    },
                  ]
                : []),
            ];
          })
          .map((entry) => [`${entry.kind}:${normalizeSearchText(entry.label)}`, entry]),
      ).values(),
    ).slice(0, 6);

    return {
      query: query.rawQuery,
      queries,
      books,
      topics,
      viewAllHref: buildSearchHref(query),
    };
  }
}
