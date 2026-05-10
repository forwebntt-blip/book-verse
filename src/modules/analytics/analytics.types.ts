import type { AnalyticsEventName } from "../../shared/contracts";

export interface ParsedAnalyticsEventPayload {
  consentGranted: boolean;
  sessionId?: string;
  cartId?: string;
  orderId?: string;
  pagePath?: string;
  deviceType?: string;
  events: Array<{
    eventName: AnalyticsEventName;
    occurredAt?: string;
    payload: Record<string, unknown>;
  }>;
}

export interface ParsedAnalyticsIdentifyPayload {
  consentGranted: boolean;
  sessionId?: string;
  isLoggedIn: boolean;
  deviceType?: string;
  landingPath?: string;
  referrer?: string;
}

export interface AnalyticsDashboardViewModel {
  overview: {
    sessions: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
  };
  homepageFunnel: Array<{ label: string; value: number }>;
  searchFunnel: Array<{ label: string; value: number }>;
  checkoutFunnel: Array<{ label: string; value: number }>;
  revenueSeries: Array<{ label: string; revenue: number; orders: number }>;
  paymentMethodBreakdown: Array<{ label: string; value: number }>;
  deviceBreakdown: Array<{ label: string; value: number }>;
  categoryBreakdown: Array<{ label: string; value: number }>;
  topBooks: Array<{ label: string; value: number }>;
  topSearchTerms: Array<{ label: string; value: number }>;
  noResultTerms: Array<{ label: string; value: number }>;
  guestVsLoggedIn: Array<{ label: string; value: number }>;
}

export interface AnalyticsRecommendationSnapshot {
  bestsellerBookIds: string[];
  recommendedBookIdsByBookId: Record<string, string[]>;
  topSearchTerms: string[];
}
