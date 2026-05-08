import type {
  BreadcrumbItem,
  PageAnalyticsViewModel,
  PaginationViewModel,
  ProductCardViewModel,
} from "../catalog/catalog.types";

export interface ParsedSearchQuery {
  rawQuery: string;
  normalizedQuery: string;
  slugQuery: string;
  terms: string[];
  page: number;
  hasQuery: boolean;
}

export interface ParsedSearchSelectionQuery {
  searchLogId?: string;
  searchRank?: number;
  searchSource?: string;
}

export interface SearchExploreLinkViewModel {
  label: string;
  href: string;
  note: string;
}

export interface SearchSectionViewModel {
  eyebrow: string;
  title: string;
  description: string;
  books: ProductCardViewModel[];
}

export interface SearchSuggestionItemViewModel {
  label: string;
  href: string;
  note?: string;
  kind: "query" | "book" | "author" | "category";
}

export interface SearchSuggestionsResponse {
  query: string;
  queries: SearchSuggestionItemViewModel[];
  books: SearchSuggestionItemViewModel[];
  topics: SearchSuggestionItemViewModel[];
  viewAllHref: string;
}

export interface SearchEmptyStateViewModel {
  title: string;
  message: string;
  resetHref: string;
  tips: string[];
}

export interface SearchPageModel {
  title: string;
  description: string;
  breadcrumb: BreadcrumbItem[];
  pageHeading: string;
  pageLead: string;
  searchQuery: string;
  hasQuery: boolean;
  resultSummary: string;
  fallbackNotice?: string | null;
  matchedBy: string[];
  books: ProductCardViewModel[];
  pagination?: PaginationViewModel;
  emptyState: SearchEmptyStateViewModel | null;
  suggestionSection: SearchSectionViewModel;
  exploreLinks: SearchExploreLinkViewModel[];
  analytics: PageAnalyticsViewModel;
}

export interface SearchRequestContext {
  requestId: string;
  sessionId?: string;
  userId?: string | null;
}

export interface SearchSelectionCaptureInput extends SearchRequestContext {
  searchLogId: string;
  selectedRank: number;
  searchSource?: string;
  bookId: string;
  bookSlug: string;
  title: string;
}
