"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, Loader2, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Button,
} from "@venora/ui";
import { createInquiryAction } from "../application/actions";

const inquiryFormSchema = z.object({
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must not exceed 1000 characters"),
});

type InquiryFormValues = z.infer<typeof inquiryFormSchema>;

interface InquiryDialogProps {
  venueId: string;
  venueName: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function InquiryDialog({
  venueId,
  venueName,
  trigger,
  onSuccess,
}: InquiryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InquiryFormValues>({
    resolver: zodResolver(inquiryFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(values: InquiryFormValues) {
    setError(null);
    const result = await createInquiryAction({
      venueId,
      message: values.message,
    });

    if (result.error) {
      setError(result.error.message);
      return;
    }

    const inquiryId = (result.data as { id?: string } | null)?.id;
    form.reset();
    setOpen(false);
    if (onSuccess) onSuccess();
    if (inquiryId) {
      router.push(`/account/venue-inquiries/${inquiryId}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-medium gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Inquire Host
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-6 shadow-2xl sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Inquire About {venueName}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)] mt-1">
            Send a question to the venue team. You can continue the conversation
            from your Venue Inquiries inbox.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 mt-4"
          >
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-[var(--text-primary)]">
                    Your message
                  </FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={5}
                      placeholder="Hi! I am interested in booking your venue for a wedding next year. Could you let me know if catering is included in your base package?"
                      className="w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
                    />
                  </FormControl>
                  <FormMessage className="text-xs text-red-500 font-medium" />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="h-11 rounded-lg border-[var(--border-default)] px-5 text-sm font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 items-center gap-2 rounded-lg bg-[var(--color-brand-600)] px-5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-brand-700)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Inquiry
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
