import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupplierBySlug } from "@/features/suppliers/application/queries";

type SupplierRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _request: NextRequest,
  { params }: SupplierRouteProps,
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const supplier = await getPublicSupplierBySlug(supabase, id);

    if (!supplier) {
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

    return NextResponse.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("[GET /api/suppliers/[id]]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch supplier.",
        },
      },
      { status: 500 },
    );
  }
}
