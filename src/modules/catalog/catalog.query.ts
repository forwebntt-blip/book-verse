import type { Request } from "express";
import { AVAILABILITY_STATUS } from "../../shared/contracts";
import type { CatalogScope, CatalogSort, ParsedCatalogQuery } from "./catalog.types";
import { CATALOG_SORTS } from "./catalog.types";

const DEFAULT_SORT: CatalogSort = CATALOG_SORTS.FEATURED;
const DEFAULT_PAGE = 1;

function getSingleQueryValue(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    const firstValue = value.find((item) => typeof item === "string");
    return typeof firstValue === "string" ? firstValue.trim() : undefined;
  }

  return typeof value === "string" ? value.trim() : undefined;
}

function parseSlug(value: unknown): string | undefined {
  const raw = getSingleQueryValue(value);

  if (!raw) {
    return undefined;
  }

  return raw.toLowerCase();
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

function parsePage(value: unknown): number {
  const parsed = parseNonNegativeInteger(value);

  if (!parsed || parsed < 1) {
    return DEFAULT_PAGE;
  }

  return parsed;
}

function parseSort(value: unknown): CatalogSort {
  const raw = getSingleQueryValue(value);
  const allowedSorts = new Set<CatalogSort>(Object.values(CATALOG_SORTS));

  if (!raw || !allowedSorts.has(raw as CatalogSort)) {
    return DEFAULT_SORT;
  }

  return raw as CatalogSort;
}

export function parseCatalogQuery(query: Request["query"]): ParsedCatalogQuery {
  const parsedAvailability = getSingleQueryValue(query.availability)?.toUpperCase();
  const allowedAvailability = new Set<string>(Object.values(AVAILABILITY_STATUS));

  let priceMin = parseNonNegativeInteger(query.priceMin);
  let priceMax = parseNonNegativeInteger(query.priceMax);

  if (
    typeof priceMin === "number" &&
    typeof priceMax === "number" &&
    priceMin > priceMax
  ) {
    [priceMin, priceMax] = [priceMax, priceMin];
  }

  return {
    categorySlug: parseSlug(query.category),
    authorSlug: parseSlug(query.author),
    publisherSlug: parseSlug(query.publisher),
    availability:
      parsedAvailability && allowedAvailability.has(parsedAvailability)
        ? (parsedAvailability as ParsedCatalogQuery["availability"])
        : undefined,
    priceMin,
    priceMax,
    sort: parseSort(query.sort),
    page: parsePage(query.page),
  };
}

export function getCatalogBasePath(scope: CatalogScope): string {
  switch (scope.type) {
    case "category":
      return `/categories/${scope.slug ?? ""}`;
    case "collection":
      return `/collections/${scope.slug ?? ""}`;
    default:
      return "/books";
  }
}

export function buildCatalogHref(
  basePath: string,
  query: ParsedCatalogQuery,
  overrides: Partial<ParsedCatalogQuery> = {},
): string {
  const nextQuery: ParsedCatalogQuery = {
    ...query,
    ...overrides,
  };

  const params = new URLSearchParams();

  if (nextQuery.categorySlug) {
    params.set("category", nextQuery.categorySlug);
  }

  if (nextQuery.authorSlug) {
    params.set("author", nextQuery.authorSlug);
  }

  if (nextQuery.publisherSlug) {
    params.set("publisher", nextQuery.publisherSlug);
  }

  if (nextQuery.availability) {
    params.set("availability", nextQuery.availability);
  }

  if (typeof nextQuery.priceMin === "number") {
    params.set("priceMin", String(nextQuery.priceMin));
  }

  if (typeof nextQuery.priceMax === "number") {
    params.set("priceMax", String(nextQuery.priceMax));
  }

  if (nextQuery.sort !== DEFAULT_SORT) {
    params.set("sort", nextQuery.sort);
  }

  if (nextQuery.page > DEFAULT_PAGE) {
    params.set("page", String(nextQuery.page));
  }

  const queryString = params.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}
