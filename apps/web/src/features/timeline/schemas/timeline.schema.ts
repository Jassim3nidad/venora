import { z } from "zod";

export const TIMELINE_STATUSES = [
  "todo",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export const TIMELINE_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);
const optionalDateTime = z
  .union([z.string().datetime(), z.literal("")])
  .optional()
  .nullable()
  .transform((value) => value || null);

export const timelineTaskSchema = z
  .object({
    id: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional().nullable(),
    title: z.string().trim().min(1, "Task title is required").max(160),
    description: optionalText(2000),
    startTime: optionalDateTime,
    endTime: optionalDateTime,
    ownerName: optionalText(120),
    status: z.enum(TIMELINE_STATUSES).default("todo"),
    priority: z.enum(TIMELINE_PRIORITIES).default("medium"),
    dependsOnTaskId: z.string().uuid().optional().nullable(),
  })
  .superRefine((task, context) => {
    if (
      task.startTime &&
      task.endTime &&
      new Date(task.endTime) < new Date(task.startTime)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
    if (task.id && task.dependsOnTaskId === task.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dependsOnTaskId"],
        message: "A task cannot depend on itself",
      });
    }
  });

export const deleteTimelineTaskSchema = z.object({
  id: z.string().uuid(),
});

export type TimelineTaskInput = z.infer<typeof timelineTaskSchema>;
