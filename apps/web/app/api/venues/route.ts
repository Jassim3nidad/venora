import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// ─── Zod Validation Schemas ───

const packageSchema = z.object({
  name: z.string().min(3, "Package name must be at least 3 characters"),
  description: z.string().optional().nullable(),
  price: z.number().positive("Price must be greater than 0"),
  price_unit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]).default("per_event"),
  min_guests: z.number().int().min(1).optional().nullable(),
  max_guests: z.number().int().min(1).optional().nullable(),
  inclusions: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
});

const createVenueSchema = z.object({
  venue: z.object({
    organization_id: z.string().uuid("Invalid organization ID"),
    name: z.string().min(3, "Venue name must be at least 3 characters"),
    description: z.string().optional().nullable(),
    province: z.string().min(2, "Province is required"),
    city: z.string().min(2, "City is required"),
    municipality: z.string().optional().nullable(),
    address: z.string().min(5, "Address is required"),
    capacity_min: z.number().int().min(1).optional().nullable(),
    capacity_max: z.number().int().min(1),
    base_price: z.number().positive("Base price must be greater than 0"),
    price_unit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]).default("per_event"),
    indoor_outdoor: z.enum(["indoor", "outdoor", "both"]).default("indoor"),
    // Filter flags
    air_conditioned: z.boolean().default(false),
    parking_available: z.boolean().default(false),
    overnight_accommodation: z.boolean().default(false),
    pet_friendly: z.boolean().default(false),
    wheelchair_accessible: z.boolean().default(false),
    has_pool: z.boolean().default(false),
    ceremony_venue: z.boolean().default(false),
    reception_venue: z.boolean().default(false),
  }).refine((d) => !d.capacity_min || d.capacity_max >= d.capacity_min, {
    message: "Max capacity must be greater than or equal to min capacity",
    path: ["capacity_max"],
  }),
  packages: z.array(packageSchema).default([]),
  amenities: z.array(z.string()).default([]),
  simulate_error: z.boolean().default(false),
});

/**
 * POST /api/venues
 * Creates a venue along with its packages and amenities in a single transaction.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = (await createClient()) as any;

    // 1. Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "You must be signed in to create a venue.",
          },
        },
        { status: 401 }
      );
    }

    // 2. Validate request body
    const body = await request.json();
    const result = createVenueSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: result.error.format(),
          },
        },
        { status: 400 }
      );
    }

    const payload = result.data;

    // 3. Check role-based access using SECURITY DEFINER has_role RPC
    const [isOwnerRes, isCoordRes, isAdminRes] = await Promise.all([
      supabase.rpc("has_role", { check_role: "venue_owner" }),
      supabase.rpc("has_role", { check_role: "event_coordinator" }),
      supabase.rpc("has_role", { check_role: "admin" })
    ]);

    const isAllowed = isOwnerRes.data || isCoordRes.data || isAdminRes.data;

    if (!isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to create a venue.",
          },
        },
        { status: 403 }
      );
    }

    // 4. Call the SQL transaction function via RPC
    const { data, error: rpcError } = await supabase.rpc("create_venue_transaction", {
      p_organization_id: payload.venue.organization_id,
      p_name: payload.venue.name,
      p_description: payload.venue.description || null,
      p_province: payload.venue.province,
      p_city: payload.venue.city,
      p_address: payload.venue.address,
      p_capacity_min: payload.venue.capacity_min || null,
      p_capacity_max: payload.venue.capacity_max,
      p_base_price: payload.venue.base_price,
      p_price_unit: payload.venue.price_unit,
      p_indoor_outdoor: payload.venue.indoor_outdoor,
      p_air_conditioned: payload.venue.air_conditioned,
      p_parking_available: payload.venue.parking_available,
      p_overnight_accommodation: payload.venue.overnight_accommodation,
      p_pet_friendly: payload.venue.pet_friendly,
      p_wheelchair_accessible: payload.venue.wheelchair_accessible,
      p_has_pool: payload.venue.has_pool,
      p_ceremony_venue: payload.venue.ceremony_venue,
      p_reception_venue: payload.venue.reception_venue,
      p_packages: payload.packages,
      p_amenities: payload.amenities,
      p_simulate_error: payload.simulate_error,
    });

    if (rpcError) {
      // Map database exceptions to TRANSACTION_FAILED
      const message = rpcError.message || "Unknown database error";
      const code = message.includes("FORBIDDEN") ? "FORBIDDEN" : "TRANSACTION_FAILED";
      const status = message.includes("FORBIDDEN") ? 403 : 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code,
            message,
          },
        },
        { status }
      );
    }

    // 5. Return successful response
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("[POST /api/venues] Server error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: err.message || "An unexpected server error occurred.",
        },
      },
      { status: 500 }
    );
  }
}
