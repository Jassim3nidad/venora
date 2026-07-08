"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/src/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import { ForbiddenError, UnauthorizedError } from "@/src/lib/errors";

const addServiceSchema = z.object({
  name: z.string().trim().min(2, "Service name is too short").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce.number().min(0).optional(),
  priceUnit: z.enum(["per_event", "per_hour", "per_pax", "per_day"]).optional(),
});

const deleteServiceSchema = z.object({
  serviceId: z.string().uuid(),
});

const updateInquiryStatusSchema = z.object({
  bookingSupplierId: z.string().uuid(),
  status: z.enum(["confirmed", "cancelled"]),
});

async function requireSupplierId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<string> {
  const { data: supplierProfile } = await supabase
    .from("supplier_profiles")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!supplierProfile) {
    throw new ForbiddenError("Create your supplier profile before managing services.");
  }

  return supplierProfile.id as string;
}

export async function addSupplierServiceAction(rawInput: unknown) {
  return createServerAction(addServiceSchema, async ({ name, description, price, priceUnit }) => {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError("You must be signed in as a supplier.");

    const supplierId = await requireSupplierId(supabase, user.id);

    const { error } = await supabase.from("supplier_services").insert({
      supplier_id: supplierId,
      name,
      description: description || null,
      price: price ?? null,
      price_unit: priceUnit ?? null,
    });

    if (error) throw error;

    revalidatePath("/dashboard/supplier/services");
    revalidatePath("/dashboard/supplier");
    return { success: true };
  }, rawInput);
}

export async function deleteSupplierServiceAction(rawInput: unknown) {
  return createServerAction(deleteServiceSchema, async ({ serviceId }) => {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError("You must be signed in as a supplier.");

    const supplierId = await requireSupplierId(supabase, user.id);

    const { error } = await supabase
      .from("supplier_services")
      .delete()
      .eq("id", serviceId)
      .eq("supplier_id", supplierId);

    if (error) throw error;

    revalidatePath("/dashboard/supplier/services");
    revalidatePath("/dashboard/supplier");
    return { success: true };
  }, rawInput);
}

export async function updateInquiryStatusAction(rawInput: unknown) {
  return createServerAction(updateInquiryStatusSchema, async ({ bookingSupplierId, status }) => {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new UnauthorizedError("You must be signed in as a supplier.");

    const supplierId = await requireSupplierId(supabase, user.id);

    const { error } = await supabase
      .from("booking_suppliers")
      .update({ status })
      .eq("id", bookingSupplierId)
      .eq("supplier_id", supplierId);

    if (error) throw error;

    revalidatePath("/dashboard/supplier/inquiries");
    revalidatePath("/dashboard/supplier/bookings");
    revalidatePath("/dashboard/supplier");
    return { success: true };
  }, rawInput);
}
