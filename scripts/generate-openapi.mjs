import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { format } from "prettier";

const out = resolve(import.meta.dirname, "..", "docs", "api", "openapi.json");
const schemaRef = (name) => ({ $ref: "#/components/schemas/" + name });
const responseRef = (name) => ({ $ref: "#/components/responses/" + name });
const cookie = [{ supabaseSession: [] }];
const bearer = [{ bearerAuth: [] }];
const optionalBearer = [{ bearerAuth: [] }, {}];
const edgeServers = [
  {
    url: "{supabaseUrl}/functions/v1",
    description: "Supabase Edge Functions",
    variables: { supabaseUrl: { default: "http://localhost:54321" } },
  },
];
const uuid = { type: "string", format: "uuid" };
const date = { type: "string", format: "date" };
const dateTime = { type: "string", format: "date-time" };
const nullable = (schema) => ({ oneOf: [schema, { type: "null" }] });
const dataEnvelope = (data) => ({
  type: "object",
  required: ["data", "error"],
  additionalProperties: false,
  properties: { data, error: { type: "null" } },
});
const legacyEnvelope = (data) => ({
  type: "object",
  required: ["success", "data"],
  additionalProperties: false,
  properties: { success: { const: true }, data },
});
const jsonResponse = (
  schema,
  example,
  description = "Successful response",
) => ({
  description,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});
const body = (name, example, description = "JSON request body") => ({
  required: true,
  description,
  content: { "application/json": { schema: schemaRef(name), example } },
});
const pathId = (name, description, format = "uuid") => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", ...(format ? { format } : {}) },
  example:
    format === "uuid"
      ? "00000000-0000-4000-8000-000000000001"
      : "sample-supplier",
});
const query = (name, schema, description, example) => ({
  name,
  in: "query",
  required: false,
  description,
  schema,
  ...(example === undefined ? {} : { example }),
});

const schemas = {
  ErrorDetail: {
    type: "object",
    additionalProperties: true,
    description:
      "Safe structured validation details, often from Zod flatten() or format().",
  },
  StandardError: {
    type: "object",
    required: ["code", "message"],
    additionalProperties: false,
    properties: {
      code: { type: "string", example: "VALIDATION_ERROR" },
      message: { type: "string", example: "Invalid input." },
      details: nullable(schemaRef("ErrorDetail")),
    },
  },
  ErrorEnvelope: {
    type: "object",
    required: ["data", "error"],
    additionalProperties: false,
    properties: { data: { type: "null" }, error: schemaRef("StandardError") },
  },
  LegacyErrorEnvelope: {
    type: "object",
    required: ["success", "error"],
    additionalProperties: false,
    properties: {
      success: { const: false },
      error: schemaRef("StandardError"),
    },
  },
  Pagination: {
    type: "object",
    required: ["page", "limit", "totalItems", "totalPages"],
    properties: {
      page: { type: "integer", minimum: 1, example: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, example: 24 },
      totalItems: { type: "integer", minimum: 0, example: 48 },
      totalPages: { type: "integer", minimum: 1, example: 2 },
    },
  },
  BookingStatus: {
    type: "string",
    enum: [
      "pending",
      "approved",
      "payment_pending",
      "confirmed",
      "declined",
      "cancelled",
      "completed",
      "reviewed",
      "expired",
      "refunded",
    ],
  },
  VenueSummary: {
    type: "object",
    required: ["id", "name"],
    properties: {
      id: uuid,
      name: { type: "string" },
      slug: { type: "string" },
      city: nullable({ type: "string" }),
      province: nullable({ type: "string" }),
    },
  },
  Booking: {
    type: "object",
    required: ["id", "status", "eventDate", "guestCount"],
    properties: {
      id: uuid,
      status: schemaRef("BookingStatus"),
      eventDate: date,
      guestCount: { type: "integer", minimum: 1 },
      totalAmount: nullable({ type: "number", minimum: 0 }),
      depositAmount: nullable({ type: "number", minimum: 0 }),
      paymentDueAt: nullable(dateTime),
      venue: nullable(schemaRef("VenueSummary")),
    },
  },
  BookingCreateRequest: {
    type: "object",
    required: ["venueId", "eventDate", "guestCount"],
    additionalProperties: false,
    properties: {
      venueId: uuid,
      packageId: nullable(uuid),
      eventDate: { ...date, description: "Today or a future date." },
      eventStartTime: {
        type: "string",
        pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
      },
      eventEndTime: { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
      guestCount: { type: "integer", minimum: 1 },
      specialRequests: { type: "string", maxLength: 1000 },
    },
  },
  BookingStatusRequest: {
    oneOf: [
      {
        type: "object",
        required: ["action", "totalAmount", "depositAmount"],
        properties: {
          action: { const: "approve" },
          totalAmount: { type: "number", exclusiveMinimum: 0 },
          depositAmount: { type: "number", exclusiveMinimum: 0 },
          note: { type: "string", maxLength: 1000 },
        },
      },
      {
        type: "object",
        required: ["action", "reason"],
        properties: {
          action: { const: "decline" },
          reason: { type: "string", minLength: 5, maxLength: 500 },
        },
      },
      {
        type: "object",
        required: ["action"],
        properties: {
          action: { const: "cancel" },
          reason: { type: "string", maxLength: 500 },
        },
      },
      {
        type: "object",
        required: ["action"],
        properties: { action: { const: "complete" } },
      },
    ],
    discriminator: { propertyName: "action" },
  },
  PaymentProvider: {
    type: "string",
    enum: ["paymongo", "stripe"],
    default: "paymongo",
    description:
      "Only PayMongo currently has a registered gateway when configured.",
  },
  PaymentStartRequest: {
    type: "object",
    additionalProperties: false,
    properties: { provider: schemaRef("PaymentProvider") },
  },
  Payment: {
    type: "object",
    required: [
      "bookingId",
      "transactionId",
      "amount",
      "provider",
      "checkoutUrl",
      "status",
    ],
    properties: {
      bookingId: uuid,
      transactionId: uuid,
      amount: { type: "number", minimum: 0 },
      provider: schemaRef("PaymentProvider"),
      checkoutUrl: { type: "string", format: "uri" },
      status: { type: "string", example: "pending" },
    },
  },
  RefundRequest: {
    type: "object",
    additionalProperties: false,
    properties: { reason: { type: "string", maxLength: 500 } },
  },
  Refund: {
    type: "object",
    required: ["refundId", "bookingId", "amount", "status"],
    properties: {
      refundId: uuid,
      bookingId: uuid,
      amount: { type: "number", minimum: 0 },
      status: {
        type: "string",
        enum: ["pending", "processing", "succeeded", "failed"],
      },
    },
  },
  VenuePackage: {
    type: "object",
    required: ["name", "price"],
    properties: {
      name: { type: "string", minLength: 3 },
      description: nullable({ type: "string" }),
      price: { type: "number", exclusiveMinimum: 0 },
      price_unit: {
        type: "string",
        enum: ["per_event", "per_hour", "per_pax", "per_day"],
        default: "per_event",
      },
      min_guests: nullable({ type: "integer", minimum: 1 }),
      max_guests: nullable({ type: "integer", minimum: 1 }),
      inclusions: { type: "array", items: { type: "string" }, default: [] },
      is_active: { type: "boolean", default: true },
    },
  },
  Venue: {
    type: "object",
    required: [
      "organization_id",
      "name",
      "province",
      "city",
      "address",
      "capacity_max",
      "base_price",
    ],
    properties: {
      id: uuid,
      organization_id: uuid,
      name: { type: "string", minLength: 3 },
      description: nullable({ type: "string" }),
      province: { type: "string", minLength: 2 },
      city: { type: "string", minLength: 2 },
      municipality: nullable({ type: "string" }),
      address: { type: "string", minLength: 5 },
      capacity_min: nullable({ type: "integer", minimum: 1 }),
      capacity_max: { type: "integer", minimum: 1 },
      base_price: { type: "number", exclusiveMinimum: 0 },
      price_unit: {
        type: "string",
        enum: ["per_event", "per_hour", "per_pax", "per_day"],
        default: "per_event",
      },
      indoor_outdoor: { type: "string", enum: ["indoor", "outdoor", "both"] },
      air_conditioned: { type: "boolean", default: false },
      parking_available: { type: "boolean", default: false },
      overnight_accommodation: { type: "boolean", default: false },
      pet_friendly: { type: "boolean", default: false },
      wheelchair_accessible: { type: "boolean", default: false },
      has_pool: { type: "boolean", default: false },
      ceremony_venue: { type: "boolean", default: false },
      reception_venue: { type: "boolean", default: false },
    },
  },
  VenueCreateRequest: {
    type: "object",
    required: ["venue"],
    additionalProperties: false,
    properties: {
      venue: schemaRef("Venue"),
      packages: {
        type: "array",
        items: schemaRef("VenuePackage"),
        default: [],
      },
      amenities: { type: "array", items: { type: "string" }, default: [] },
      simulate_error: {
        type: "boolean",
        default: false,
        description:
          "Rollback test flag present in implementation. Production clients should omit it.",
      },
    },
  },
  SupplierCategory: {
    type: "object",
    required: ["id", "name", "slug"],
    properties: {
      id: uuid,
      name: { type: "string" },
      slug: { type: "string" },
    },
  },
  SupplierPackage: {
    type: "object",
    required: ["id", "supplierId", "name", "isActive"],
    properties: {
      id: uuid,
      supplierId: uuid,
      name: { type: "string" },
      description: nullable({ type: "string" }),
      price: nullable({ type: "number", minimum: 0 }),
      priceUnit: nullable({ type: "string" }),
      inclusions: { type: "array", items: { type: "string" } },
      minGuests: nullable({ type: "integer" }),
      maxGuests: nullable({ type: "integer" }),
      isActive: { type: "boolean" },
    },
  },
  Review: {
    type: "object",
    required: ["id", "overallRating"],
    properties: {
      id: uuid,
      supplierId: uuid,
      venueId: uuid,
      bookingId: uuid,
      overallRating: { type: "integer", minimum: 1, maximum: 5 },
      comment: nullable({ type: "string", maxLength: 1000 }),
      customerName: { type: "string" },
      customerAvatarUrl: nullable({ type: "string", format: "uri" }),
      createdAt: dateTime,
    },
  },
  Supplier: {
    type: "object",
    required: [
      "id",
      "profileId",
      "businessName",
      "slug",
      "serviceAreas",
      "isFeatured",
      "accreditationStatus",
      "avgRating",
      "reviewCount",
      "packages",
      "portfolio",
      "reviews",
    ],
    properties: {
      id: uuid,
      profileId: uuid,
      businessName: { type: "string" },
      slug: { type: "string" },
      category: nullable(schemaRef("SupplierCategory")),
      headline: nullable({ type: "string" }),
      description: nullable({ type: "string" }),
      basePrice: nullable({ type: "number", minimum: 0 }),
      priceUnit: nullable({ type: "string" }),
      serviceAreas: { type: "array", items: { type: "string" } },
      contactEmail: nullable({ type: "string", format: "email" }),
      contactPhone: nullable({ type: "string" }),
      profileImageUrl: nullable({ type: "string", format: "uri" }),
      heroImageUrl: nullable({ type: "string", format: "uri" }),
      isFeatured: { type: "boolean" },
      accreditationStatus: { type: "string" },
      avgRating: { type: "number", minimum: 0, maximum: 5 },
      reviewCount: { type: "integer", minimum: 0 },
      packages: { type: "array", items: schemaRef("SupplierPackage") },
      portfolio: {
        type: "array",
        items: { type: "object", additionalProperties: true },
      },
      reviews: { type: "array", items: schemaRef("Review") },
      createdAt: dateTime,
    },
  },
  SupplierContactRequest: {
    type: "object",
    required: ["contactName", "contactEmail", "message"],
    additionalProperties: false,
    properties: {
      serviceId: uuid,
      bookingId: uuid,
      contactName: { type: "string", minLength: 2, maxLength: 120 },
      contactEmail: { type: "string", format: "email" },
      contactPhone: { type: "string", minLength: 7, maxLength: 32 },
      eventDate: date,
      eventLocation: { type: "string", maxLength: 160 },
      guestCount: { type: "number", exclusiveMinimum: 0 },
      message: { type: "string", minLength: 10, maxLength: 1500 },
    },
  },
  Notification: {
    type: "object",
    required: ["id", "kind", "title", "priority", "isRead", "createdAt"],
    properties: {
      id: uuid,
      channel: { type: "string", enum: ["in_app", "email", "push", "sms"] },
      kind: {
        type: "string",
        enum: [
          "booking_update",
          "payment_update",
          "review_request",
          "admin_alert",
          "supplier_inquiry",
          "system",
        ],
      },
      title: { type: "string" },
      body: nullable({ type: "string" }),
      link: nullable({ type: "string" }),
      metadata: nullable({ type: "object", additionalProperties: true }),
      priority: { type: "string" },
      isRead: { type: "boolean" },
      readAt: nullable(dateTime),
      createdAt: dateTime,
    },
  },
  NotificationPreferences: {
    type: "object",
    required: [
      "emailEnabled",
      "pushEnabled",
      "inAppEnabled",
      "bookingUpdates",
      "paymentUpdates",
      "reviewRequests",
      "adminAlerts",
      "quietHoursStart",
      "quietHoursEnd",
      "timezone",
    ],
    properties: {
      emailEnabled: { type: "boolean" },
      smsEnabled: { type: "boolean", default: false },
      pushEnabled: { type: "boolean" },
      inAppEnabled: { type: "boolean" },
      bookingUpdates: { type: "boolean" },
      paymentUpdates: { type: "boolean" },
      reviewRequests: { type: "boolean" },
      adminAlerts: { type: "boolean" },
      quietHoursStart: nullable({
        type: "string",
        pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
      }),
      quietHoursEnd: nullable({
        type: "string",
        pattern: "^([01]\\d|2[0-3]):[0-5]\\d$",
      }),
      timezone: {
        type: "string",
        minLength: 1,
        maxLength: 64,
        default: "Asia/Manila",
      },
    },
  },
  PushSubscription: {
    type: "object",
    required: ["endpoint", "keys"],
    additionalProperties: false,
    properties: {
      endpoint: { type: "string", format: "uri" },
      keys: {
        type: "object",
        required: ["p256dh", "auth"],
        properties: {
          p256dh: { type: "string", minLength: 16 },
          auth: { type: "string", minLength: 8 },
        },
      },
      userAgent: { type: "string", maxLength: 500 },
    },
  },
  PushDeleteRequest: {
    type: "object",
    required: ["endpoint"],
    additionalProperties: false,
    properties: { endpoint: { type: "string", format: "uri" } },
  },
  AdminAudit: {
    type: "object",
    required: ["id", "action", "createdAt"],
    properties: {
      id: uuid,
      actorId: nullable(uuid),
      action: { type: "string" },
      resourceType: nullable({ type: "string" }),
      resourceId: nullable(uuid),
      metadata: { type: "object", additionalProperties: true },
      createdAt: dateTime,
    },
  },
  PayMongoWebhook: {
    type: "object",
    required: ["data"],
    additionalProperties: true,
    properties: {
      data: {
        type: "object",
        required: ["id", "type", "attributes"],
        additionalProperties: true,
        properties: {
          id: { type: "string", example: "evt_test_example" },
          type: { type: "string", example: "event" },
          attributes: {
            type: "object",
            required: ["type", "data"],
            additionalProperties: true,
            properties: {
              type: {
                type: "string",
                example: "checkout_session.payment.paid",
              },
              data: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    },
  },
  AISearchRequest: {
    type: "object",
    additionalProperties: false,
    properties: {
      query: { type: "string", maxLength: 500 },
      filters: {
        type: "object",
        additionalProperties: false,
        properties: {
          q: { type: "string" },
          keyword: { type: "string" },
          province: { type: "string" },
          city: { type: "string" },
          municipality: { type: "string" },
          min_budget: { type: "number", exclusiveMinimum: 0 },
          max_budget: { type: "number", exclusiveMinimum: 0 },
          guests: { type: "number", exclusiveMinimum: 0 },
          capacity: { type: "number", exclusiveMinimum: 0 },
          venue_types: { type: "array", items: { type: "string" } },
          indoor_outdoor: {
            type: "string",
            enum: ["indoor", "outdoor", "both"],
          },
          parking: { type: "boolean" },
          pet_friendly: { type: "boolean" },
          wheelchair_accessible: { type: "boolean" },
          page: { type: "integer", minimum: 1 },
          per_page: { type: "integer", minimum: 1, maximum: 50 },
          sort_by: { type: "string" },
        },
      },
    },
    anyOf: [{ required: ["query"] }, { required: ["filters"] }],
  },
  AIRecommendationRequest: {
    type: "object",
    additionalProperties: false,
  },
  AIVenueDescriptionRequest: {
    type: "object",
    required: ["venueId", "contentType"],
    additionalProperties: false,
    properties: {
      venueId: uuid,
      contentType: {
        type: "string",
        enum: ["description", "seo_meta", "package_description"],
      },
      packageId: uuid,
      tone: {
        type: "string",
        enum: ["elegant", "casual", "luxury"],
        default: "elegant",
      },
    },
  },
  AIPackageComparisonRequest: {
    type: "object",
    required: ["packageIds"],
    additionalProperties: false,
    properties: {
      packageIds: {
        type: "array",
        minItems: 2,
        maxItems: 4,
        uniqueItems: true,
        items: uuid,
      },
    },
  },
  AICostEstimatorRequest: {
    type: "object",
    required: ["venueId", "guestCount", "eventType", "durationHours"],
    additionalProperties: false,
    properties: {
      venueId: uuid,
      guestCount: { type: "number", minimum: 1 },
      eventType: { type: "string", minLength: 1, maxLength: 60 },
      durationHours: { type: "number", exclusiveMinimum: 0 },
      includesCatering: { type: "boolean", default: false },
      includesAV: { type: "boolean", default: false },
    },
  },
  AIAssistantRequest: {
    type: "object",
    required: ["sessionId", "message"],
    additionalProperties: false,
    properties: {
      sessionId: { type: "string", minLength: 1, maxLength: 100 },
      message: { type: "string", minLength: 1, maxLength: 2000 },
      conversationId: { type: "string", maxLength: 100 },
    },
  },
  NotificationDeliveryRequest: {
    oneOf: [
      {
        type: "object",
        required: ["record"],
        additionalProperties: false,
        properties: {
          record: {
            type: "object",
            required: ["id", "notification_id", "user_id", "channel"],
            additionalProperties: false,
            properties: {
              id: uuid,
              notification_id: uuid,
              user_id: uuid,
              channel: {
                type: "string",
                enum: ["email", "sms", "push", "in_app"],
              },
            },
          },
        },
      },
      {
        type: "object",
        additionalProperties: false,
        properties: { limit: { type: "integer", minimum: 1, default: 25 } },
      },
    ],
  },
  GenericObject: { type: "object", additionalProperties: true },
};

const components = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "Supabase JWT",
      description:
        "Supabase access token. Never use a service-role token in browser code.",
    },
    supabaseSession: {
      type: "apiKey",
      in: "cookie",
      name: "sb-<project-ref>-auth-token",
      description:
        "Supabase SSR session cookie; the actual value can be chunked.",
    },
    paymongoSignature: {
      type: "apiKey",
      in: "header",
      name: "Paymongo-Signature",
      description: "Timestamped PayMongo HMAC over the raw body.",
    },
  },
  schemas,
  responses: {
    BadRequest: {
      description: "Invalid request or workflow state",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input.",
              details: {},
            },
          },
        },
      },
    },
    Unauthorized: {
      description: "Authentication missing or invalid",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "UNAUTHORIZED",
              message: "Please sign in to continue.",
            },
          },
        },
      },
    },
    Forbidden: {
      description: "Caller lacks role, permission, or ownership",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "FORBIDDEN",
              message: "You do not have permission.",
            },
          },
        },
      },
    },
    NotFound: {
      description: "Resource not found",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: { code: "NOT_FOUND", message: "Resource not found." },
          },
        },
      },
    },
    Conflict: {
      description: "Booking/date/state conflict",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "BOOKING_CONFLICT",
              message: "Venue is unavailable on the selected date.",
            },
          },
        },
      },
    },
    TooManyRequests: {
      description: "Configured usage limit exceeded",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "AI_LIMIT_EXCEEDED",
              message: "Usage limit reached.",
            },
          },
        },
      },
    },
    InternalError: {
      description: "Unexpected server or upstream failure",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: { code: "INTERNAL_ERROR", message: "Something went wrong." },
          },
        },
      },
    },
    ServiceUnavailable: {
      description: "Required provider, workflow, or configuration unavailable",
      content: {
        "application/json": {
          schema: schemaRef("ErrorEnvelope"),
          example: {
            data: null,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Service is not configured.",
            },
          },
        },
      },
    },
  },
};

const defaultErrors = {
  400: responseRef("BadRequest"),
  401: responseRef("Unauthorized"),
  403: responseRef("Forbidden"),
  500: responseRef("InternalError"),
};

const definitions = [
  {
    method: "get",
    path: "/api/bookings",
    summary: "List customer bookings",
    tags: ["Bookings"],
    security: cookie,
    description:
      "Returns bookings owned by the current user, newest first. Reads bookings and venue summaries. Safe and not application-rate-limited.",
    successSchema: dataEnvelope({ type: "array", items: schemaRef("Booking") }),
    successExample: { data: [], error: null },
    errors: [401, 500],
  },
  {
    method: "post",
    path: "/api/bookings",
    summary: "Create booking inquiry",
    tags: ["Bookings"],
    security: cookie,
    description:
      "Creates a booking through create_booking_inquiry. Database checks publication, capacity, date conflicts, caller, and state; writes history/notifications and synchronizes availability. Duplicate active slots conflict. Not application-rate-limited.",
    requestBody: body("BookingCreateRequest", {
      venueId: "00000000-0000-4000-8000-000000000001",
      packageId: null,
      eventDate: "2027-02-20",
      guestCount: 120,
      specialRequests: "Wheelchair-accessible entrance",
    }),
    status: "201",
    successSchema: dataEnvelope({
      type: "object",
      required: ["bookingId", "status", "eventDate"],
      properties: {
        bookingId: uuid,
        status: schemaRef("BookingStatus"),
        eventDate: date,
      },
    }),
    successExample: {
      data: {
        bookingId: "00000000-0000-4000-8000-000000000001",
        status: "pending",
        eventDate: "2027-02-20",
      },
      error: null,
    },
    errors: [400, 401, 409, 500, 503],
  },
  {
    method: "patch",
    path: "/api/bookings/{id}/status",
    summary: "Transition booking status",
    tags: ["Bookings"],
    security: cookie,
    parameters: [pathId("id", "Booking ID")],
    description:
      "Approves, declines, cancels, or completes through workflow RPCs. Approve/decline require venue organization management or admin; RPCs recheck authorization and state. Side effects include history, invoice, notifications, availability, and cache revalidation.",
    requestBody: body("BookingStatusRequest", {
      action: "approve",
      totalAmount: 100000,
      depositAmount: 30000,
      note: "Pay within 48 hours",
    }),
    successSchema: dataEnvelope({
      type: "object",
      required: ["bookingId", "status"],
      properties: { bookingId: uuid, status: schemaRef("BookingStatus") },
    }),
    successExample: {
      data: {
        bookingId: "00000000-0000-4000-8000-000000000001",
        status: "approved",
      },
      error: null,
    },
    errors: [400, 403, 500],
  },
  {
    method: "post",
    path: "/api/bookings/{id}/payment",
    summary: "Start booking checkout",
    tags: ["Bookings", "Payments"],
    security: cookie,
    parameters: [pathId("id", "Booking ID")],
    description:
      "Starts or resumes the deposit checkout. The RPC locks/reuses one pending transaction; hosted sessions younger than 55 minutes are reused; first-attach-wins persistence converges races. Only PayMongo is registered when configured.",
    requestBody: body("PaymentStartRequest", { provider: "paymongo" }),
    successSchema: dataEnvelope(schemaRef("Payment")),
    successExample: {
      data: {
        bookingId: "00000000-0000-4000-8000-000000000001",
        transactionId: "00000000-0000-4000-8000-000000000002",
        amount: 30000,
        provider: "paymongo",
        checkoutUrl: "https://checkout.paymongo.com/example",
        status: "pending",
      },
      error: null,
    },
    errors: [400, 401, 403, 404, 500, 503],
  },
  {
    method: "post",
    path: "/api/bookings/{id}/refund",
    summary: "Request booking refund",
    tags: ["Bookings", "Payments"],
    security: cookie,
    parameters: [pathId("id", "Booking ID")],
    description:
      "Creates an eligible refund, invokes the provider, records correlation, and may complete synchronously. Customer, venue participant, or admin permission is enforced by RPC; later webhooks reconcile.",
    requestBody: body("RefundRequest", {
      reason: "Event cancelled by customer",
    }),
    successSchema: dataEnvelope(schemaRef("Refund")),
    successExample: {
      data: {
        refundId: "00000000-0000-4000-8000-000000000003",
        bookingId: "00000000-0000-4000-8000-000000000001",
        amount: 30000,
        status: "processing",
      },
      error: null,
    },
    errors: [400, 401, 403, 404, 500, 503],
  },
  {
    method: "post",
    path: "/api/venues",
    summary: "Create venue transaction",
    tags: ["Venues"],
    security: cookie,
    description:
      "Atomically creates venue, packages, and amenities through create_venue_transaction. Requires venue_owner, event_coordinator, or admin and valid organization access. Not idempotent.",
    requestBody: body("VenueCreateRequest", {
      venue: {
        organization_id: "00000000-0000-4000-8000-000000000001",
        name: "Harbor Garden Events",
        province: "Cebu",
        city: "Cebu City",
        address: "1 Example Street",
        capacity_max: 200,
        base_price: 85000,
        price_unit: "per_event",
        indoor_outdoor: "both",
      },
      packages: [],
      amenities: ["Parking"],
      simulate_error: false,
    }),
    status: "201",
    legacy: true,
    successSchema: legacyEnvelope({
      type: "object",
      additionalProperties: true,
    }),
    successExample: {
      success: true,
      data: { venue_id: "00000000-0000-4000-8000-000000000010" },
    },
    errors: [400, 401, 403, 500],
  },
  {
    method: "get",
    path: "/api/suppliers",
    summary: "List public suppliers",
    tags: ["Suppliers"],
    security: [],
    description:
      "Filters and paginates accredited supplier profiles in application memory. Database errors or empty results fall back to bundled sample suppliers. Safe and not application-rate-limited.",
    parameters: [
      query("q", { type: "string", maxLength: 120 }, "Search text", "catering"),
      query(
        "category",
        { type: "string", maxLength: 80 },
        "Category slug",
        "catering",
      ),
      query(
        "location",
        { type: "string", maxLength: 120 },
        "Service-area substring",
        "Cebu",
      ),
      query("minPrice", { type: "number" }, "Minimum starting price", 10000),
      query("maxPrice", { type: "number" }, "Maximum starting price", 100000),
      query("minRating", { type: "number" }, "Minimum average rating", 4),
      query(
        "accreditedOnly",
        { type: "boolean", default: true },
        "Accepted but public query already requires accreditation",
        true,
      ),
      query(
        "sort",
        {
          type: "string",
          enum: ["recommended", "rating", "price", "newest"],
          default: "recommended",
        },
        "Sort order",
        "recommended",
      ),
      query("page", { type: "integer", minimum: 1, default: 1 }, "Page", 1),
      query(
        "limit",
        {
          type: "integer",
          minimum: 1,
          maximum: 100,
          default: 24,
        },
        "Page size",
        24,
      ),
    ],
    legacy: true,
    successSchema: legacyEnvelope({
      allOf: [schemaRef("Pagination")],
      type: "object",
      required: ["items", "categories"],
      properties: {
        items: { type: "array", items: schemaRef("Supplier") },
        categories: { type: "array", items: schemaRef("SupplierCategory") },
      },
    }),
    successExample: {
      success: true,
      data: {
        items: [],
        categories: [],
        page: 1,
        limit: 24,
        totalItems: 0,
        totalPages: 1,
      },
    },
    errors: [400, 500],
  },
  {
    method: "get",
    path: "/api/suppliers/{id}",
    summary: "Get public supplier",
    tags: ["Suppliers"],
    security: [],
    parameters: [pathId("id", "Supplier UUID or slug", null)],
    description:
      "Returns one accredited supplier by UUID or slug with services, portfolio, and reviews. May return a matching bundled sample supplier.",
    legacy: true,
    successSchema: legacyEnvelope(schemaRef("Supplier")),
    successExample: {
      success: true,
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        profileId: "00000000-0000-4000-8000-000000000002",
        businessName: "Example Catering",
        slug: "example-catering",
        serviceAreas: ["Cebu"],
        isFeatured: false,
        accreditationStatus: "accredited",
        avgRating: 4.8,
        reviewCount: 12,
        packages: [],
        portfolio: [],
        reviews: [],
      },
    },
    errors: [404, 500],
  },
  {
    method: "post",
    path: "/api/suppliers/{id}/contact",
    summary: "Contact accredited supplier",
    tags: ["Suppliers"],
    security: cookie,
    parameters: [pathId("id", "Supplier profile ID")],
    description:
      "Creates a contact request for an accredited supplier. Not idempotent; repeat submissions create multiple inquiries.",
    requestBody: body("SupplierContactRequest", {
      contactName: "Alex Customer",
      contactEmail: "alex@example.test",
      eventDate: "2027-02-20",
      eventLocation: "Cebu City",
      guestCount: 120,
      message: "Please send package availability for our event.",
    }),
    status: "201",
    legacy: true,
    successSchema: legacyEnvelope({
      type: "object",
      required: ["id", "status", "created_at"],
      properties: {
        id: uuid,
        status: { type: "string" },
        created_at: dateTime,
      },
    }),
    successExample: {
      success: true,
      data: {
        id: "00000000-0000-4000-8000-000000000003",
        status: "new",
        created_at: "2026-07-14T00:00:00Z",
      },
    },
    errors: [400, 401, 404, 500],
  },
  {
    method: "get",
    path: "/api/notifications",
    summary: "List user notifications",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Bootstraps preferences, then returns current user's non-expired notifications and unread count. Safe except for idempotent preference creation.",
    parameters: [
      query(
        "limit",
        { type: "integer", minimum: 1, maximum: 100, default: 20 },
        "Maximum results",
        20,
      ),
      query(
        "read",
        {
          type: "string",
          enum: ["all", "unread", "read"],
          default: "all",
        },
        "Read-state filter",
        "all",
      ),
      query(
        "kind",
        {
          type: "string",
          enum: [
            "booking_update",
            "payment_update",
            "review_request",
            "admin_alert",
            "supplier_inquiry",
            "system",
          ],
        },
        "Notification kind",
      ),
    ],
    successSchema: dataEnvelope({
      type: "object",
      required: ["notifications", "unreadCount"],
      properties: {
        notifications: { type: "array", items: schemaRef("Notification") },
        unreadCount: { type: "integer", minimum: 0 },
      },
    }),
    successExample: {
      data: { notifications: [], unreadCount: 0 },
      error: null,
    },
    errors: [400, 401, 500],
  },
  {
    method: "post",
    path: "/api/notifications/{id}/read",
    summary: "Mark notification read",
    tags: ["Notifications"],
    security: cookie,
    parameters: [pathId("id", "Notification ID")],
    description:
      "Marks one current-user notification read through mark_notification_read. Idempotent.",
    successSchema: dataEnvelope({
      type: "object",
      required: ["id"],
      properties: { id: uuid },
    }),
    successExample: {
      data: { id: "00000000-0000-4000-8000-000000000001" },
      error: null,
    },
    errors: [400, 401, 500],
  },
  {
    method: "post",
    path: "/api/notifications/read-all",
    summary: "Mark all notifications read",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Marks all current-user notifications read and returns count. Idempotent after first call.",
    successSchema: dataEnvelope({
      type: "object",
      required: ["markedCount"],
      properties: { markedCount: { type: "integer", minimum: 0 } },
    }),
    successExample: { data: { markedCount: 3 }, error: null },
    errors: [400, 401, 500],
  },
  {
    method: "get",
    path: "/api/notification-preferences",
    summary: "Get notification preferences",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Returns current-user preferences and idempotently inserts defaults when absent.",
    successSchema: dataEnvelope(schemaRef("NotificationPreferences")),
    successExample: {
      data: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        bookingUpdates: true,
        paymentUpdates: true,
        reviewRequests: true,
        adminAlerts: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: "Asia/Manila",
      },
      error: null,
    },
    errors: [401, 500],
  },
  {
    method: "patch",
    path: "/api/notification-preferences",
    summary: "Update notification preferences",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Upserts current-user preferences. SMS is always persisted disabled. Idempotent last-write-wins update.",
    requestBody: body("NotificationPreferences", {
      emailEnabled: true,
      smsEnabled: false,
      pushEnabled: true,
      inAppEnabled: true,
      bookingUpdates: true,
      paymentUpdates: true,
      reviewRequests: true,
      adminAlerts: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      timezone: "Asia/Manila",
    }),
    successSchema: dataEnvelope(schemaRef("NotificationPreferences")),
    successExample: {
      data: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        inAppEnabled: true,
        bookingUpdates: true,
        paymentUpdates: true,
        reviewRequests: true,
        adminAlerts: false,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        timezone: "Asia/Manila",
      },
      error: null,
    },
    errors: [400, 401, 500],
  },
  {
    method: "get",
    path: "/api/notifications/push-public-key",
    summary: "Get VAPID public key",
    tags: ["Notifications"],
    security: [],
    description:
      "Returns the intentionally public Web Push VAPID key. The private key remains server-only.",
    successSchema: dataEnvelope({
      type: "object",
      required: ["publicKey"],
      properties: { publicKey: { type: "string" } },
    }),
    successExample: { data: { publicKey: "<vapid-public-key>" }, error: null },
    errors: [503],
  },
  {
    method: "post",
    path: "/api/notifications/push-subscriptions",
    summary: "Register push subscription",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Upserts current-user push subscription by user and endpoint and clears disabled_at. Idempotent for the same endpoint.",
    requestBody: body("PushSubscription", {
      endpoint: "https://push.example.test/subscription",
      keys: {
        p256dh: "example-p256dh-key-material",
        auth: "example-auth-key",
      },
      userAgent: "Example Browser",
    }),
    successSchema: dataEnvelope({
      type: "object",
      required: ["subscriptionId"],
      properties: { subscriptionId: uuid },
    }),
    successExample: {
      data: { subscriptionId: "00000000-0000-4000-8000-000000000001" },
      error: null,
    },
    errors: [400, 401, 500],
  },
  {
    method: "delete",
    path: "/api/notifications/push-subscriptions",
    summary: "Disable push subscription",
    tags: ["Notifications"],
    security: cookie,
    description:
      "Sets disabled_at for the current user's endpoint. Repeating is harmless.",
    requestBody: body("PushDeleteRequest", {
      endpoint: "https://push.example.test/subscription",
    }),
    successSchema: dataEnvelope({
      type: "object",
      required: ["disabled"],
      properties: { disabled: { const: true } },
    }),
    successExample: { data: { disabled: true }, error: null },
    errors: [400, 401, 500],
  },
  {
    method: "get",
    path: "/api/analytics/venue-owner/export",
    summary: "Export venue owner analytics",
    tags: ["Analytics"],
    security: cookie,
    description:
      "Returns private/no-store CSV or PDF scoped to venues belonging to organizations the venue_owner, event_coordinator, or admin owns or belongs to. Read-only.",
    export: true,
    errors: [400, 401, 403, 500],
  },
  {
    method: "get",
    path: "/api/admin/reports/export",
    summary: "Export platform admin report",
    tags: ["Admin", "Analytics"],
    security: cookie,
    description:
      "Returns platform-wide CSV or PDF. Requires reports.export and writes report_exports plus audit_logs, so GET has an audit side effect.",
    export: true,
    errors: [400, 401, 403, 500],
  },
  {
    method: "post",
    path: "/api/webhooks/paymongo",
    summary: "Receive PayMongo webhook",
    tags: ["Webhooks", "Payments"],
    security: [{ paymongoSignature: [] }],
    description:
      "Verifies timestamped HMAC over the raw body, atomically claims provider event ID, reconciles stored checkout/payment/refund context, and records outcome. Duplicate/skipped events return 200; 500 asks PayMongo to retry.",
    requestBody: body("PayMongoWebhook", {
      data: {
        id: "evt_test_example",
        type: "event",
        attributes: {
          type: "checkout_session.payment.paid",
          data: {
            id: "cs_test_example",
            type: "checkout_session",
            attributes: {},
          },
        },
      },
    }),
    webhook: "paymongo",
  },
  {
    method: "get",
    path: "/auth/callback",
    summary: "Complete Supabase auth callback",
    tags: ["Authentication"],
    security: [],
    description:
      "Handles PKCE/OAuth code exchange, provider errors, and email-token handoff. Returns redirects only and maps raw provider details to stable login error codes.",
    parameters: [
      query("code", { type: "string" }, "One-time PKCE/OAuth code"),
      query("token_hash", { type: "string" }, "Email verification token hash"),
      query("type", { type: "string" }, "Supabase verification type"),
      query(
        "next",
        { type: "string" },
        "Requested application destination",
        "/account",
      ),
      query("error", { type: "string" }, "Provider error code"),
    ],
    redirect: true,
  },
  {
    method: "get",
    path: "/logout",
    summary: "Log out current session",
    tags: ["Authentication"],
    security: [{ supabaseSession: [] }, {}],
    description:
      "Calls Supabase signOut, clears auth cookies, and redirects home. Safe to repeat.",
    redirect: true,
  },
  {
    method: "get",
    path: "/api/debug",
    summary: "Return not found for the disabled diagnostic route",
    tags: ["Internal"],
    security: [],
    deprecated: true,
    description:
      "The former diagnostic implementation is disabled. Every request receives an empty 404 response and no user, inquiry, environment, stack, or configuration data.",
    responses: {
      404: {
        description: "Not found; diagnostic endpoint is disabled",
      },
    },
  },
  {
    method: "post",
    path: "/ai-search",
    summary: "Search venues with AI parsing",
    tags: ["AI", "Venues"],
    security: optionalBearer,
    edge: true,
    description:
      "Parses natural language and filters, optionally warms embeddings, invokes search_venues, and writes search/usage logs. AI parsing degrades to deterministic extraction. Each call writes a search log.",
    requestBody: body("AISearchRequest", {
      query: "garden venue in Cebu under 100000",
      filters: { guests: 120, parking: true, per_page: 24 },
    }),
    successSchema: dataEnvelope(schemaRef("GenericObject")),
    successExample: {
      data: {
        venues: [],
        parsedFilters: {},
        searchParameters: {},
        fallbackReason: null,
        embeddedVenueCount: 0,
      },
      error: null,
    },
    errors: [400, 401, 403, 429, 500, 502],
  },
  {
    method: "post",
    path: "/ai-recommendation",
    summary: "Recommend venues for customer",
    tags: ["AI", "Venues"],
    security: bearer,
    edge: true,
    description:
      "Requires authenticated customer context. Ranks cold-start/personalized venues and writes recommendation impression events and usage logs. Repeat calls create new impressions.",
    requestBody: body("AIRecommendationRequest", {}),
    successSchema: dataEnvelope(schemaRef("GenericObject")),
    successExample: {
      data: {
        venues: [],
        recommendationEventIds: {},
        mode: "cold_start",
        preferenceQuery: null,
      },
      error: null,
    },
    errors: [400, 401, 403, 429, 500, 502],
  },
  {
    method: "post",
    path: "/ai-venue-description",
    summary: "Generate venue copy draft",
    tags: ["AI", "Venues"],
    security: bearer,
    edge: true,
    description:
      "Requires venue organization membership or admin. Applies moderation/usage limits, generates bounded copy, logs usage, and inserts a draft. Never publishes automatically and is not idempotent.",
    requestBody: body("AIVenueDescriptionRequest", {
      venueId: "00000000-0000-4000-8000-000000000001",
      contentType: "description",
      tone: "elegant",
    }),
    successSchema: dataEnvelope(schemaRef("GenericObject")),
    successExample: {
      data: {
        content: {
          id: "00000000-0000-4000-8000-000000000002",
          venueId: "00000000-0000-4000-8000-000000000001",
          contentType: "description",
          generatedText: "Generated venue description.",
          status: "draft",
          createdAt: "2026-07-14T00:00:00Z",
        },
      },
      error: null,
    },
    errors: [400, 401, 403, 404, 429, 500, 502],
  },
  {
    method: "post",
    path: "/ai-package-comparison",
    summary: "Compare venue packages",
    tags: ["AI", "Venues"],
    security: optionalBearer,
    edge: true,
    description:
      "Returns deterministic comparison for 2-4 active packages and optional AI narrative. AI failure/disable/limits degrade to a null summary. Writes a comparison log.",
    requestBody: body("AIPackageComparisonRequest", {
      packageIds: [
        "00000000-0000-4000-8000-000000000001",
        "00000000-0000-4000-8000-000000000002",
      ],
    }),
    successSchema: dataEnvelope(schemaRef("GenericObject")),
    successExample: {
      data: {
        comparisonTable: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            name: "Example Package",
            price: 50000,
          },
        ],
        aiSummary: null,
      },
      error: null,
    },
    errors: [400, 401, 403, 404, 429, 500, 502],
  },
  {
    method: "post",
    path: "/ai-cost-estimator",
    summary: "Estimate event cost",
    tags: ["AI", "Payments"],
    security: optionalBearer,
    edge: true,
    description:
      "Loads a published venue/packages, generates and validates a PHP itemized estimate with one retry, logs usage, and stores generated content. Not idempotent.",
    requestBody: body("AICostEstimatorRequest", {
      venueId: "00000000-0000-4000-8000-000000000001",
      guestCount: 120,
      eventType: "wedding",
      durationHours: 6,
      includesCatering: true,
      includesAV: false,
    }),
    successSchema: dataEnvelope(schemaRef("GenericObject")),
    successExample: {
      data: {
        estimate: {
          baseVenue: 85000,
          packages: 0,
          catering: 60000,
          av: 0,
          total: 145000,
          breakdown: ["Venue base: PHP 85,000", "Catering: PHP 60,000"],
        },
        venue: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Harbor Garden Events",
          basePrice: 85000,
        },
      },
      error: null,
    },
    errors: [400, 401, 403, 404, 429, 500, 502],
  },
  {
    method: "post",
    path: "/ai-assistant",
    summary: "Stream customer assistant response",
    tags: ["AI"],
    security: optionalBearer,
    edge: true,
    description:
      "Creates/resumes a conversation, optionally adds authenticated user's booking context, persists messages/usage, and streams SSE. A strict cancellation command returns a confirmation proposal; the customer-confirmed action is role/ownership checked, conditionally claimed, executed under the user JWT, and audited.",
    requestBody: body("AIAssistantRequest", {
      sessionId: "browser-session-example",
      message: "Show venues for 120 guests in Cebu.",
    }),
    stream: true,
    errors: [400, 401, 403, 404, 409, 429, 500, 502],
  },
  {
    method: "post",
    path: "/booking-notifications",
    summary: "Dispatch notification delivery",
    tags: ["Notifications", "Internal"],
    security: bearer,
    edge: true,
    description:
      "Internal queue endpoint requiring the exact service-role bearer used by the database webhook. Dispatches one delivery or a bounded batch, updates attempts/status, retries failed rows, and skips SMS. Do not expose publicly.",
    requestBody: body("NotificationDeliveryRequest", {
      record: {
        id: "00000000-0000-4000-8000-000000000001",
        notification_id: "00000000-0000-4000-8000-000000000002",
        user_id: "00000000-0000-4000-8000-000000000003",
        channel: "email",
      },
    }),
    successSchema: schemaRef("GenericObject"),
    successExample: { success: true },
    errors: [401, 500, 503],
  },
  {
    method: "post",
    path: "/rsvp-notifications",
    summary: "Deliver RSVP invitations or reminders",
    tags: ["Notifications", "Internal"],
    security: bearer,
    edge: true,
    description:
      "Invitation mode requires the signed-in guest-list owner's bearer and rechecks guest ownership through RLS. Reminder mode requires the dedicated reminder secret, conditionally claims due pending rows, and sends a bounded SMTP batch.",
    requestBody: body("GenericObject", {
      mode: "invitation",
      guestId: "00000000-0000-4000-8000-000000000001",
    }),
    successSchema: schemaRef("GenericObject"),
    successExample: { success: true, delivery: "sent" },
    errors: [400, 401, 404, 500, 503],
  },
];

const errorMap = {
  400: "BadRequest",
  401: "Unauthorized",
  403: "Forbidden",
  404: "NotFound",
  409: "Conflict",
  429: "TooManyRequests",
  500: "InternalError",
  502: "InternalError",
  503: "ServiceUnavailable",
};

function operationId(method, path) {
  return (
    method.toLowerCase() +
    path
      .replace(/[{}]/g, "")
      .split("/")
      .filter(Boolean)
      .map((part) =>
        part.replace(/[^A-Za-z0-9]+(.)/g, (_match, char) => char.toUpperCase()),
      )
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("")
  );
}

function exportResponses() {
  return {
    200: {
      description: "CSV or PDF export",
      headers: {
        "Content-Disposition": {
          schema: {
            type: "string",
            example: 'attachment; filename="venora-analytics.csv"',
          },
        },
        "Cache-Control": {
          schema: { type: "string", example: "private, no-store" },
        },
      },
      content: {
        "text/csv": {
          schema: { type: "string" },
          example: "period,revenue,bookings\n2026-01,250000,4",
        },
        "application/pdf": {
          schema: { type: "string", contentEncoding: "base64" },
        },
      },
    },
  };
}

function webhookResponses(provider) {
  if (provider === "paymongo") {
    return {
      200: jsonResponse(
        {
          type: "object",
          required: ["received", "result"],
          properties: {
            received: { const: true },
            result: {
              type: "string",
              enum: ["processed", "duplicate", "skipped"],
            },
          },
        },
        { received: true, result: "processed" },
      ),
      401: jsonResponse(
        { type: "object", properties: { error: { type: "string" } } },
        { error: "Invalid signature" },
        "Invalid signature",
      ),
      500: jsonResponse(
        { type: "object", properties: { error: { type: "string" } } },
        { error: "Processing failed" },
        "Processing failed; provider should retry",
      ),
      503: jsonResponse(
        { type: "object", properties: { error: { type: "string" } } },
        { error: "Provider not configured" },
        "Gateway not configured",
      ),
    };
  }
  return {
    200: jsonResponse(
      {
        type: "object",
        required: ["received"],
        properties: { received: { const: true } },
      },
      { received: true },
    ),
    401: jsonResponse(
      { type: "object", properties: { error: { type: "string" } } },
      { error: "Invalid signature" },
      "Invalid signature",
    ),
    500: jsonResponse(
      { type: "object", properties: { error: { type: "string" } } },
      { error: "Processing failed" },
      "Processing failed or success path not implemented",
    ),
  };
}

const paths = {};
for (const item of definitions) {
  let responses;
  if (item.responses) {
    responses = item.responses;
  } else if (item.redirect) {
    responses = {
      302: {
        description: "Redirect",
        headers: {
          Location: {
            required: true,
            schema: { type: "string", format: "uri-reference" },
            example: item.path === "/logout" ? "/" : "/account",
          },
        },
      },
      307: {
        description: "Temporary redirect variant emitted by Next.js",
        headers: {
          Location: {
            required: true,
            schema: { type: "string", format: "uri-reference" },
          },
        },
      },
    };
  } else if (item.export) {
    responses = exportResponses();
  } else if (item.webhook) {
    responses = webhookResponses(item.webhook);
  } else if (item.stream) {
    responses = {
      200: {
        description:
          "SSE stream; first event contains conversationId, followed by OpenAI-compatible chunks",
        content: {
          "text/event-stream": {
            schema: { type: "string" },
            example:
              'data: {"conversationId":"00000000-0000-4000-8000-000000000001"}\n\n' +
              'data: {"choices":[{"delta":{"content":"Here are"}}]}\n\n',
          },
        },
      },
    };
  } else {
    responses = {
      [item.status ?? "200"]: jsonResponse(
        item.successSchema,
        item.successExample,
      ),
    };
  }

  for (const code of item.errors ?? []) {
    if (responses[code]) continue;
    if (item.legacy) {
      responses[code] = jsonResponse(
        schemaRef("LegacyErrorEnvelope"),
        {
          success: false,
          error: {
            code:
              code === 401
                ? "AUTH_REQUIRED"
                : code === 403
                  ? "FORBIDDEN"
                  : "SERVER_ERROR",
            message:
              code === 401 ? "Authentication required." : "Request failed.",
          },
        },
        "Request failed",
      );
    } else {
      responses[code] = responseRef(errorMap[code]);
    }
  }

  const operation = {
    summary: item.summary,
    description: item.description,
    operationId: operationId(item.method, item.path),
    tags: item.tags,
    "x-venora-surface": item.edge
      ? "supabase-edge-function"
      : "next-route-handler",
    security: item.security,
    ...(item.parameters ? { parameters: item.parameters } : {}),
    ...(item.requestBody ? { requestBody: item.requestBody } : {}),
    responses,
    ...(item.deprecated ? { deprecated: true } : {}),
    ...(item.edge ? { servers: edgeServers } : {}),
  };

  if (item.export) {
    operation.parameters = [
      query(
        "format",
        { type: "string", enum: ["csv", "pdf"], default: "csv" },
        "Export format",
        "csv",
      ),
      query(
        "from",
        date,
        "Start date; defaults to a 12-month range",
        "2026-01-01",
      ),
      query("to", date, "End date; must be on/after from", "2026-12-31"),
    ];
  }

  paths[item.path] ??= {};
  paths[item.path][item.method] = operation;
}

const spec = {
  openapi: "3.1.0",
  jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
  info: {
    title: "Venora API",
    version: "2026-07-14",
    license: { name: "Proprietary", identifier: "LicenseRef-Proprietary" },
    summary: "Code-backed HTTP API for Venora",
    description:
      "Next.js Route Handlers and Supabase Edge Functions confirmed at commit " +
      "15e6173b6f695f6d9f5f4a29517badf0b3a3a016. Server Actions and PostgreSQL " +
      "RPCs are documented separately and are not represented as fake REST routes.",
  },
  servers: [
    {
      url: "{appUrl}",
      description: "Venora Next.js application",
      variables: {
        appUrl: {
          default: "http://localhost:3000",
          description: "NEXT_PUBLIC_APP_URL",
        },
      },
    },
  ],
  tags: [
    {
      name: "Authentication",
      description: "Supabase auth callback and session termination",
    },
    { name: "Bookings", description: "Booking inquiry and lifecycle" },
    { name: "Payments", description: "Checkout and refund orchestration" },
    { name: "Venues", description: "Venue management" },
    { name: "Suppliers", description: "Supplier marketplace and inquiries" },
    { name: "Notifications", description: "In-app and web-push state" },
    { name: "Analytics", description: "CSV/PDF exports" },
    { name: "Admin", description: "Permission-gated administrator APIs" },
    { name: "Webhooks", description: "Provider-signed payment events" },
    { name: "AI", description: "Supabase AI Edge Functions" },
    { name: "Internal", description: "Unsupported or operational surfaces" },
  ],
  paths,
  components,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  await format(JSON.stringify(spec), { parser: "json" }),
  "utf8",
);
console.log(
  "Generated " + out + " with " + definitions.length + " operations.",
);
