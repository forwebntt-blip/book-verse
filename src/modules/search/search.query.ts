import type { Request } from "express";
import type { ParsedSearchQuery, ParsedSearchSelectionQuery } from "./search.types";

const DEFAULT_PAGE = 1;
const MAX_QUERY_LENGTH = 120;

function getSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value.find((item) => typeof item === "string");
    return typeof firstValue === "string" ? firstValue.trim() : undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeSearchText(value: string): string {
  return normalizeWhitespace(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " "),
  );
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

export function toSearchSlug(value: string): string {
  return tokenizeSearchText(value).join("-");
}

function parseNonNegativeInteger(value: unknown): number | undefined {
  const raw = getSingleQueryValue(value);

  if (!raw) {
    return undefined;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parsePositiveInteger(value: unknown): number | undefined {
  const parsed = parseNonNegativeInteger(value);

  if (!parsed || parsed < 1) {
    return undefined;
  }

  return parsed;
}

function parsePage(value: unknown): number {
  return parsePositiveInteger(value) ?? DEFAULT_PAGE;
}

function sanitizeSearchSource(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const sanitized = value.toLowerCase().replace(/[^a-z0-9:_-]/g, "");
  return sanitized || undefined;
}

export function parseSearchQuery(query: Request["query"]): ParsedSearchQuery {
  const rawQuery = normalizeWhitespace((getSingleQueryValue(query.q) ?? "").slice(0, MAX_QUERY_LENGTH));
  return buildParsedSearchQuery(rawQuery, parsePage(query.page));
}

export function buildParsedSearchQuery(
  rawInput: string,
  page = DEFAULT_PAGE,
): ParsedSearchQuery {
  const rawQuery = normalizeWhitespace(rawInput.slice(0, MAX_QUERY_LENGTH));
  const normalizedQuery = normalizeSearchText(rawQuery);
  const terms = tokenizeSearchText(rawQuery);

  return {
    rawQuery,
    normalizedQuery,
    slugQuery: terms.join("-"),
    terms,
    page: page < 1 ? DEFAULT_PAGE : page,
    hasQuery: normalizedQuery.length > 0,
  };
}

export function parseSearchSelectionQuery(
  query: Request["query"],
): ParsedSearchSelectionQuery {
  return {
    searchLogId: getSingleQueryValue(query.searchLogId),
    searchRank: parsePositiveInteger(query.searchRank),
    searchSource: sanitizeSearchSource(getSingleQueryValue(query.searchSource)),
  };
}

export function buildSearchHref(
  query: ParsedSearchQuery,
  overrides: Partial<Pick<ParsedSearchQuery, "rawQuery" | "page">> = {},
): string {
  const nextQuery = {
    rawQuery: overrides.rawQuery ?? query.rawQuery,
    page: overrides.page ?? query.page,
  };
  const params = new URLSearchParams();

  if (nextQuery.rawQuery) {
    params.set("q", nextQuery.rawQuery);
  }

  if (nextQuery.page > DEFAULT_PAGE) {
    params.set("page", String(nextQuery.page));
  }

  const queryString = params.toString();
  return queryString ? `/search?${queryString}` : "/search";
}

export function buildBookDetailHref(
  slug: string,
  tracking?: {
    searchLogId?: string;
    searchRank?: number;
    searchSource?: string;
  },
): string {
  const params = new URLSearchParams();

  if (tracking?.searchLogId) {
    params.set("searchLogId", tracking.searchLogId);
  }

  if (typeof tracking?.searchRank === "number" && tracking.searchRank > 0) {
    params.set("searchRank", String(tracking.searchRank));
  }

  if (tracking?.searchSource) {
    params.set("searchSource", tracking.searchSource);
  }

  const queryString = params.toString();
  return queryString ? `/books/${slug}?${queryString}` : `/books/${slug}`;
}
