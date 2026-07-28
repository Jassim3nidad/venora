import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

export const seatingTableSchema = z.object({
  id: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional().nullable(),
  tableName: z.string().trim().min(1, "Table name is required").max(100),
  capacity: z.coerce.number().int().min(1).max(100),
  notes: optionalText(1000),
});

export const deleteSeatingTableSchema = z.object({
  id: z.string().uuid(),
});

export const seatingAssignmentSchema = z.object({
  tableId: z.string().uuid(),
  guestId: z.string().uuid(),
  seatNumber: z.coerce.number().int().min(1).max(100).optional().nullable(),
});

export const removeSeatingAssignmentSchema = z.object({
  id: z.string().uuid(),
});

export type SeatingTableInput = z.infer<typeof seatingTableSchema>;
