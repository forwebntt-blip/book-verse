import type { Prisma } from "../../generated/prisma/client.js";
import { AnalyticsEventName } from "../../generated/prisma/enums.js";
import { getPrismaClient } from "../../infra/database/prisma";
import type {
  SearchRequestContext,
  SearchSelectionCaptureInput,
} from "./search.types";

interface CreateSearchLogParams extends SearchRequestContext {
  rawQuery: string;
  normalizedQuery: string;
  resultCount: number;
  page: number;
  noResult: boolean;
  fallbackApplied: boolean;
  fallbackMode?: string;
  matchedBy: string[];
  topBookSlugs: string[];
}

export class SearchRepository {
  async createSearchLog(params: CreateSearchLogParams): Promise<string> {
    const prisma = await getPrismaClient();
    const occurredAt = new Date();

    return prisma.$transaction(async (tx) => {
      const factSearch = await tx.factSearch.create({
        data: {
          sessionId: params.sessionId,
          userId: params.userId ?? undefined,
          query: params.rawQuery,
          normalizedQuery: params.normalizedQuery,
          resultCount: params.resultCount,
          noResult: params.noResult,
          occurredAt,
        },
        select: {
          id: true,
        },
      });

      const outboxEvents: Prisma.AnalyticsEventOutboxCreateManyInput[] = [
        {
          dedupeKey: `search:${params.requestId}:search`,
          eventName: AnalyticsEventName.SEARCH,
          sourceModule: "search",
          sessionId: params.sessionId,
          userId: params.userId ?? undefined,
          occurredAt,
          payload: {
            query: params.rawQuery,
            normalizedQuery: params.normalizedQuery,
            page: params.page,
          },
        },
        {
          dedupeKey: `search:${params.requestId}:view_results`,
          eventName: AnalyticsEventName.VIEW_SEARCH_RESULTS,
          sourceModule: "search",
          sessionId: params.sessionId,
          userId: params.userId ?? undefined,
          occurredAt,
          payload: {
            query: params.rawQuery,
            normalizedQuery: params.normalizedQuery,
            resultCount: params.resultCount,
            noResult: params.noResult,
            page: params.page,
            fallbackApplied: params.fallbackApplied,
            fallbackMode: params.fallbackMode,
            matchedBy: params.matchedBy,
            topBookSlugs: params.topBookSlugs,
          },
        },
      ];

      if (params.noResult) {
        outboxEvents.push({
          dedupeKey: `search:${params.requestId}:no_result`,
          eventName: AnalyticsEventName.SEARCH_NO_RESULT,
          sourceModule: "search",
          sessionId: params.sessionId,
          userId: params.userId ?? undefined,
          occurredAt,
          payload: {
            query: params.rawQuery,
            normalizedQuery: params.normalizedQuery,
            page: params.page,
            fallbackApplied: params.fallbackApplied,
            fallbackMode: params.fallbackMode,
          },
        });
      }

      await tx.analyticsEventOutbox.createMany({
        data: outboxEvents,
        skipDuplicates: true,
      });

      return factSearch.id;
    });
  }

  async captureSearchSelection(
    params: SearchSelectionCaptureInput,
  ): Promise<{
    query: string;
    normalizedQuery: string;
    resultCount: number;
    noResult: boolean;
    searchSource: string;
  } | null> {
    const prisma = await getPrismaClient();
    const occurredAt = new Date();

    return prisma.$transaction(async (tx) => {
      const factSearch = await tx.factSearch.findUnique({
        where: {
          id: params.searchLogId,
        },
        select: {
          id: true,
          query: true,
          normalizedQuery: true,
          resultCount: true,
          noResult: true,
          sessionId: true,
          userId: true,
        },
      });

      if (!factSearch) {
        return null;
      }

      const searchSource = params.searchSource ?? "results";

      await tx.factSearch.update({
        where: {
          id: factSearch.id,
        },
        data: {
          bookId: params.bookId,
          selectedRank: params.selectedRank,
        },
      });

      await tx.analyticsEventOutbox.createMany({
        data: [
          {
            dedupeKey: `search:select:${factSearch.id}:${params.bookId}:${params.selectedRank}:${searchSource}`,
            eventName: AnalyticsEventName.SELECT_SEARCH_RESULT,
            sourceModule: "search",
            sessionId: params.sessionId ?? factSearch.sessionId ?? undefined,
            userId: params.userId ?? factSearch.userId ?? undefined,
            occurredAt,
            payload: {
              query: factSearch.query,
              normalizedQuery: factSearch.normalizedQuery,
              resultCount: factSearch.resultCount,
              noResult: factSearch.noResult,
              selectedRank: params.selectedRank,
              bookId: params.bookId,
              bookSlug: params.bookSlug,
              title: params.title,
              searchSource,
            },
          },
        ],
        skipDuplicates: true,
      });

      return {
        query: factSearch.query,
        normalizedQuery: factSearch.normalizedQuery,
        resultCount: factSearch.resultCount,
        noResult: factSearch.noResult,
        searchSource,
      };
    });
  }
}
