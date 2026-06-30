"use client";

import { useState } from "react";
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
    } else {
      form.reset();
      setOpen(false);
      if (onSuccess) onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full h-11 rounded-xl font-medium gap-2">
            <MessageSquare className="h-4 w-4" />
            Inquire Host
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Inquire About {venueName}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--text-secondary)] mt-1">
            Send a direct inquiry message to the venue coordinator. They will respond to you via notifications and email.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {error && (
              <div className="p-3.5 rounded-xl border border-red-200/20 bg-red-500/10 text-red-600 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-[var(--text-primary)] tracking-wide uppercase">
                    Your Message
                  </FormLabel>
                  <FormControl>
                    <textarea
                      {...field}
                      rows={5}
                      placeholder="Hi! I am interested in booking your venue for a wedding next year. Could you let me know if catering is included in your base package?"
                      className="w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20 focus:border-[var(--color-brand-500)] transition-all resize-none"
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
                className="h-11 rounded-xl px-5 text-sm font-medium border-[var(--border-default)]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 rounded-xl px-5 text-sm font-semibold bg-[var(--color-brand-600)] text-white hover:bg-[var(--color-brand-700)] focus:ring-2 focus:ring-[var(--color-brand-500)]/20 transition-all flex items-center gap-2"
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
