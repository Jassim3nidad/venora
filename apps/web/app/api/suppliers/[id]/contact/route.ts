import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supplierContactRequestSchema } from "@/features/suppliers/schemas/supplier.schema";

type SupplierContactRouteProps = {
  params: Promise<{ id: string }>;
};

function normalizeOptionalString(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalNumber(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export async function POST(
  request: NextRequest,
  { params }: SupplierContactRouteProps,
) {
  try {
    const { id } = await params;
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "AUTH_REQUIRED",
            message: "Please sign in to contact a supplier.",
          },
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = supplierContactRequestSchema.safeParse({
      ...body,
      supplierId: id,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid contact request.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const input = parsed.data;
    const { data: supplier, error: supplierError } = await supabase
      .from("supplier_profiles")
      .select("id, accreditation_status")
      .eq("id", id)
      .eq("accreditation_status", "accredited")
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Supplier not found.",
          },
        },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
      .from("supplier_contact_requests")
      .insert({
        supplier_id: id,
        service_id: input.serviceId ?? null,
        customer_id: user.id,
        contact_name: input.contactName,
        contact_email: input.contactEmail,
        contact_phone: normalizeOptionalString(input.contactPhone),
        event_date: normalizeOptionalString(input.eventDate),
        event_location: normalizeOptionalString(input.eventLocation),
        guest_count: normalizeOptionalNumber(input.guestCount),
        message: input.message,
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONTACT_REQUEST_FAILED",
            message: error.message,
          },
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/suppliers/[id]/contact]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to send supplier inquiry.",
        },
      },
      { status: 500 },
    );
  }
}
