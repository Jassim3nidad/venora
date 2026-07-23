import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPublicSupplierList } from "@/features/suppliers/application/queries";
import {
  getSupplierStartingPrice,
  supplierSearchText,
} from "@/features/suppliers/utils/supplier-derive";
import { supplierSearchSchema } from "@/features/suppliers/schemas/supplier.schema";

const listQuerySchema = supplierSearchSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const parsed = listQuerySchema.safeParse(query);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid supplier filters.",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const filters = parsed.data;
    const supabase = await createClient();
    const { suppliers, categories } = await getPublicSupplierList(supabase);
    const filtered = suppliers
      .filter((supplier) => {
        if (
          filters.q &&
          !supplierSearchText(supplier).includes(normalize(filters.q))
        ) {
          return false;
        }
        if (
          filters.category &&
          supplier.category?.slug !== normalize(filters.category)
        ) {
          return false;
        }
        if (
          filters.location &&
          !supplier.serviceAreas.some((area) =>
            normalize(area).includes(normalize(filters.location)),
          )
        ) {
          return false;
        }
        if (filters.minRating && supplier.avgRating < filters.minRating) {
          return false;
        }

        const startingPrice = getSupplierStartingPrice(supplier);
        if (
          filters.minPrice &&
          (!startingPrice || startingPrice < filters.minPrice)
        ) {
          return false;
        }
        if (
          filters.maxPrice &&
          (!startingPrice || startingPrice > filters.maxPrice)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (filters.sort === "rating") return b.avgRating - a.avgRating;
        if (filters.sort === "price") {
          return (
            (getSupplierStartingPrice(a) ?? Number.MAX_SAFE_INTEGER) -
            (getSupplierStartingPrice(b) ?? Number.MAX_SAFE_INTEGER)
          );
        }
        if (filters.sort === "newest") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }

        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return b.avgRating - a.avgRating;
      });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / filters.limit));
    const offset = (filters.page - 1) * filters.limit;

    return NextResponse.json({
      success: true,
      data: {
        items: filtered.slice(offset, offset + filters.limit),
        categories,
        page: filters.page,
        limit: filters.limit,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[GET /api/suppliers]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: "Failed to fetch suppliers.",
        },
      },
      { status: 500 },
    );
  }
}
