import type { Request } from "express";
import { ANALYTICS_EVENTS } from "../../shared/contracts";
import { AppError } from "../../shared/errors/app-error";
import type {
  ParsedAnalyticsEventPayload,
  ParsedAnalyticsIdentifyPayload,
} from "./analytics.types";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === 1;
}

function asObject(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError({
      statusCode: 400,
      code: "INVALID_ANALYTICS_PAYLOAD",
      message: `${field} must be an object.`,
    });
  }

  return value as Record<string, unknown>;
}

export function parseAnalyticsEventsPayload(body: Request["body"]): ParsedAnalyticsEventPayload {
  const rawEvents = Array.isArray(body?.events) ? body.events : [];
  const allowedEvents = new Set(Object.values(ANALYTICS_EVENTS));

  const events = rawEvents.map((event: unknown, index: number) => {
    const record = asObject(event, `events[${index}]`);
    const eventName = asString(record.eventName);

    if (!eventName || !allowedEvents.has(eventName as never)) {
      throw new AppError({
        statusCode: 400,
        code: "INVALID_ANALYTICS_PAYLOAD",
        message: `events[${index}].eventName is invalid.`,
      });
    }

    return {
      eventName: eventName as never,
      occurredAt: asString(record.occurredAt),
      payload: asObject(record.payload ?? {}, `events[${index}].payload`),
    };
  });

  return {
    consentGranted: asBoolean(body?.consentGranted),
    sessionId: asString(body?.sessionId),
    cartId: asString(body?.cartId),
    orderId: asString(body?.orderId),
    pagePath: asString(body?.pagePath),
    deviceType: asString(body?.deviceType),
    events,
  };
}

export function parseAnalyticsIdentifyPayload(body: Request["body"]): ParsedAnalyticsIdentifyPayload {
  return {
    consentGranted: asBoolean(body?.consentGranted),
    sessionId: asString(body?.sessionId),
    isLoggedIn: asBoolean(body?.isLoggedIn),
    deviceType: asString(body?.deviceType),
    landingPath: asString(body?.landingPath),
    referrer: asString(body?.referrer),
  };
}
