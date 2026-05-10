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

const SEARCH_PAGE_SIZE = 5;
const SEARCH_CANDIDATE_LIMIT = 80;
const DISCOVERY_LIMIT = 4;

const AVAILABILITY_LABELS = {
  [AVAILABILITY_STATUS.IN_STOCK]: "Còn hàng",
  [AVAILABILITY_STATUS.LOW_STOCK]: "Sắp hết hàng",
  [AVAILABILITY_STATUS.OUT_OF_STOCK]: "Tạm hết hàng",
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
    { label: "Trang chủ", href: "/" },
    { label: "Tìm kiếm", active: true },
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
    matchedBy.add("Tên sách");
    score += titleScore;
  }

  const authorScore = scoreField(author, query, {
    exact: 210,
    startsWith: 170,
    contains: 145,
    perTerm: 24,
  });

  if (authorScore > 0) {
    matchedBy.add("Tác giả");
    score += authorScore;
  }

  const publisherScore = scoreField(publisher, query, {
    exact: 170,
    startsWith: 145,
    contains: 120,
    perTerm: 18,
  });

  if (publisherScore > 0) {
    matchedBy.add("Nhà xuất bản");
    score += publisherScore;
  }

  const exactKeywordMatch = keywords.some((keyword) => keyword === query.normalizedQuery);
  const containsKeywordMatch = keywords.some((keyword) => keyword.includes(query.normalizedQuery));
  const termKeywordMatches = query.terms.filter((term) =>
    keywords.some((keyword) => keyword.includes(term)),
  ).length;

  if (exactKeywordMatch) {
    matchedBy.add("Từ khóa");
    score += 160;
  } else if (containsKeywordMatch) {
    matchedBy.add("Từ khóa");
    score += 130;
  } else if (termKeywordMatches > 0) {
    matchedBy.add("Từ khóa");
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
      eyebrow: "Khám phá nhanh",
      title: "Bắt đầu từ những tựa sách đang được ưu tiên",
      description:
        "Khi chưa có từ khóa cụ thể, người dùng vẫn có một điểm bắt đầu rõ ràng từ sách nổi bật, bán chạy và đang có sẵn.",
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
        label: "Duyệt toàn bộ danh mục",
        href: "/books",
        note: "Mở danh sách sách đầy đủ và tiếp tục lọc theo nhu cầu.",
      },
      ...categories.map((category) => ({
        label: `Danh mục ${category.name}`,
        href: `/categories/${category.slug}`,
        note: category.description ?? "Đi thẳng vào một danh mục đã có dữ liệu.",
      })),
      ...collections
        .filter((collection) => collection.publishStatus === PublishStatus.PUBLISHED)
        .map((collection) => ({
          label: `Bộ sưu tập ${collection.name}`,
          href: `/collections/${collection.slug}`,
          note: collection.description ?? "Khám phá một bộ sưu tập đang được xuất bản.",
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
      eyebrow: "Không để trang trống",
      title: "Thử bắt đầu từ những tựa sách có khả năng phù hợp",
      description:
        "Khi không có kết quả trùng khớp, storefront vẫn đưa ra một nhóm sách theo luật để người dùng không bị ngắt quãng hành trình khám phá.",
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
        title: "Tìm kiếm sách",
        description:
          "Tìm sách theo tên sách, tác giả, từ khóa và nhà xuất bản, đồng thời giữ lại lối khám phá khi chưa có từ khóa cụ thể.",
        breadcrumb: buildBreadcrumb(),
        pageHeading: "Tìm kiếm sách trong storefront",
        pageLead:
          "Tìm theo tên sách, tác giả, từ khóa hoặc nhà xuất bản. Nếu chưa có từ khóa, bạn vẫn có thể bắt đầu từ các gợi ý bên dưới.",
        searchQuery: "",
        hasQuery: false,
        resultSummary:
          "Nhập từ khóa để nhận kết quả tìm kiếm và các gợi ý mở rộng phù hợp với danh mục hiện tại.",
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
        "Công cụ tìm kiếm hiện ưu tiên tên sách, tác giả, nhà xuất bản và từ khóa; khi cần sẽ mở rộng theo tương tự để giữ trải nghiệm tìm kiếm hữu ích.",
      searchQuery: query.rawQuery,
      hasQuery: true,
      resultSummary:
        totalItems === 0
          ? `Không tìm thấy tựa sách nào cho "${query.rawQuery}".`
          : `Tìm thấy ${totalItems} tựa sách. Đang hiển thị ${pagination?.from ?? 1}-${pagination?.to ?? books.length}.`,
      fallbackNotice:
        fallbackMode === "term_expansion"
          ? "Hệ thống không thấy kết quả khớp với cả cụm từ, nên đã mở rộng theo từng từ khóa để tăng khả năng tìm được sách."
          : fallbackMode === "normalized_rescore"
            ? "Hệ thống đã mở rộng theo phương án so khớp không dấu và xếp hạng theo luật để tránh bỏ sót sách phù hợp."
            : null,
      matchedBy,
      books,
      pagination,
      emptyState:
        totalItems === 0
          ? {
              title: "Không tìm thấy kết quả trùng khớp",
              message:
                fallbackMode !== "none"
                  ? "Hệ thống đã thử thêm các bước mở rộng truy vấn nhưng vẫn chưa có kết quả trùng khớp. Bạn có thể đổi cách viết, thử theo tác giả/nhà xuất bản hoặc chuyển sang các gợi ý bên dưới."
                  : "Thử đổi sang tên tác giả, nhà xuất bản, một từ khóa ngắn hơn hoặc duyệt qua các khối gợi ý bên dưới để tiếp tục khám phá.",
              resetHref: "/search",
              tips: [
                "Rút gọn từ khóa để giữ lại những thành phần quan trọng nhất.",
                "Thử tìm theo tên tác giả hoặc nhà xuất bản thay vì cả câu dài.",
                "Nếu nhớ chủ đề hơn là tên sách, hãy thử bằng từ khóa nội dung.",
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
