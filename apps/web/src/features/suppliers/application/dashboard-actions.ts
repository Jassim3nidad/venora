"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServerAction } from "@/src/lib/server-action";
import {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/errors";
import {
  clearSupplierAvailabilitySchema,
  supplierAvailabilitySchema,
  supplierMessageSchema,
  supplierQuoteIdSchema,
  supplierQuoteSchema,
} from "../schemas/supplier-dashboard.schema";

async function requireSupplier() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError("Please sign in to continue.");

  const { data: supplier, error } = await supabase
    .from("supplier_profiles")
    .select("id, business_name")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (error) throw new ValidationError(error.message);
  if (!supplier) throw new NotFoundError("Supplier profile");
  return { supabase, user, supplier };
}

async function requireOwnedInquiry(
  supabase: any,
  supplierId: string,
  inquiryId: string,
) {
  const { data, error } = await supabase
    .from("supplier_contact_requests")
    .select("id, customer_id")
    .eq("id", inquiryId)
    .eq("supplier_id", supplierId)
    .maybeSingle();
  if (error) throw new ValidationError(error.message);
  if (!data) throw new ForbiddenError("Inquiry is not available.");
  return data;
}

function revalidateSupplierDashboard() {
  revalidatePath("/dashboard/supplier");
  revalidatePath("/dashboard/supplier/inquiries");
  revalidatePath("/dashboard/supplier/quotes");
  revalidatePath("/dashboard/supplier/calendar");
  revalidatePath("/dashboard/supplier/analytics");
}

export async function upsertSupplierQuoteAction(rawInput: unknown) {
  return createServerAction(
    supplierQuoteSchema,
    async (input) => {
      const { supabase, supplier } = await requireSupplier();
      await requireOwnedInquiry(supabase, supplier.id, input.inquiryId);
      const { data, error } = await supabase.rpc(
        "upsert_supplier_quote_dashboard",
        {
          p_quote_id: input.id ?? null,
          p_inquiry_id: input.inquiryId,
          p_title: input.title,
          p_service_description: input.serviceDescription ?? "",
          p_items: input.items,
          p_additional_fees: input.additionalFees,
          p_valid_until: input.validUntil ?? null,
          p_terms: input.terms ?? "",
        },
      );
      if (error) throw new ValidationError(error.message);
      revalidateSupplierDashboard();
      return { quoteId: data as string };
    },
    rawInput,
  );
}

async function transitionQuote(rawInput: unknown, from: string, to: string) {
  return createServerAction(
    supplierQuoteIdSchema,
    async ({ quoteId }) => {
      const { supabase, supplier } = await requireSupplier();
      const payload =
        to === "sent"
          ? { status: to, sent_at: new Date().toISOString() }
          : { status: to };
      const { data, error } = await supabase
        .from("supplier_quotes")
        .update(payload)
        .eq("id", quoteId)
        .eq("supplier_id", supplier.id)
        .eq("status", from)
        .select("id")
        .maybeSingle();
      if (error) throw new ValidationError(error.message);
      if (!data)
        throw new ValidationError(
          "Quote is no longer eligible for this action.",
        );
      revalidateSupplierDashboard();
      return { quoteId };
    },
    rawInput,
  );
}

export async function sendSupplierQuoteAction(rawInput: unknown) {
  return transitionQuote(rawInput, "draft", "sent");
}

export async function withdrawSupplierQuoteAction(rawInput: unknown) {
  return transitionQuote(rawInput, "sent", "withdrawn");
}

export async function sendSupplierInquiryMessageAction(rawInput: unknown) {
  return createServerAction(
    supplierMessageSchema,
    async (input) => {
      const { supabase, user, supplier } = await requireSupplier();
      await requireOwnedInquiry(supabase, supplier.id, input.inquiryId);
      const { data, error } = await supabase
        .from("supplier_inquiry_messages")
        .insert({
          inquiry_id: input.inquiryId,
          sender_id: user.id,
          message: input.message,
        })
        .select("id")
        .single();
      if (error) throw new ValidationError(error.message);
      revalidatePath(`/dashboard/supplier/inquiries/${input.inquiryId}`);
      return { messageId: data.id as string };
    },
    rawInput,
  );
}

export async function setSupplierAvailabilityAction(rawInput: unknown) {
  return createServerAction(
    supplierAvailabilitySchema,
    async (input) => {
      const { supabase, user, supplier } = await requireSupplier();
      const { data: job } = await supabase
        .from("booking_suppliers")
        .select("id, bookings!inner(event_date)")
        .eq("supplier_id", supplier.id)
        .eq("status", "confirmed")
        .eq("bookings.event_date", input.date)
        .maybeSingle();
      if (job)
        throw new ValidationError("Confirmed jobs cannot be manually changed.");
      const { error } = await supabase.from("supplier_availability").upsert(
        {
          supplier_id: supplier.id,
          date: input.date,
          status: input.status,
          reason: input.reason ?? null,
          created_by: user.id,
        },
        { onConflict: "supplier_id,date" },
      );
      if (error) throw new ValidationError(error.message);
      revalidateSupplierDashboard();
      revalidatePath("/suppliers");
      return { date: input.date };
    },
    rawInput,
  );
}

export async function clearSupplierAvailabilityAction(rawInput: unknown) {
  return createServerAction(
    clearSupplierAvailabilitySchema,
    async (input) => {
      const { supabase, supplier } = await requireSupplier();
      const { error } = await supabase
        .from("supplier_availability")
        .delete()
        .eq("supplier_id", supplier.id)
        .eq("date", input.date);
      if (error) throw new ValidationError(error.message);
      revalidateSupplierDashboard();
      revalidatePath("/suppliers");
      return { date: input.date };
    },
    rawInput,
  );
}
