"use client";

import { type FormEvent, useState, useTransition } from "react";
import { AlertTriangle, Lock, Trash2, Type } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@venora/ui";
import { deleteAccountAction } from "@/features/auth/actions/auth.actions";
import {
  DELETE_ACCOUNT_CONFIRMATION_PHRASE,
  deleteAccountSchema,
} from "@/features/auth/schemas/auth.schema";
import {
  AlertBanner,
  TextField,
  type FieldErrors,
} from "./account-form-shared";

export default function DeleteAccountDangerZone() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setConfirmationPhrase("");
    setFieldErrors({});
    setGeneralError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    const result = deleteAccountSchema.safeParse({
      password,
      confirmPassword,
      confirmationPhrase,
    });

    if (!result.success) {
      setFieldErrors(result.error.flatten().fieldErrors);
      return;
    }

    startTransition(async () => {
      const response = await deleteAccountAction({
        password,
        confirmPassword,
        confirmationPhrase,
      });

      if (response && !response.success) {
        setGeneralError(response.error || "Account deletion failed.");
        setFieldErrors(response.fieldErrors ?? {});
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-[28px] border border-red-200 bg-white shadow-xl shadow-red-100/60">
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
            <AlertTriangle className="h-5 w-5" />
          </div>

          <div>
            <h2 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950">
              Delete Account
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Permanently deleting your account will remove your access to
              Venora. Some booking history may be retained for security,
              transaction, and record purposes.
            </p>
          </div>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20 active:scale-[0.99] sm:w-auto"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          </DialogTrigger>

          <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-red-100 sm:max-w-[520px]">
            <form onSubmit={handleSubmit} className="space-y-5">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold tracking-[-0.03em] text-slate-950">
                  Confirm Account Deletion
                </DialogTitle>
                <DialogDescription className="leading-6">
                  This action cannot be easily undone. Please enter your current
                  password, re-enter it, and type "DELETE MY ACCOUNT" to
                  continue.
                </DialogDescription>
              </DialogHeader>

              {generalError && (
                <AlertBanner type="error">{generalError}</AlertBanner>
              )}

              <TextField
                id="delete-account-password"
                label="Current password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Enter password"
                disabled={isPending}
                error={fieldErrors.password?.[0]}
                icon={Lock}
                autoComplete="current-password"
                showPassword={showPassword}
                onShowPasswordChange={setShowPassword}
              />

              <TextField
                id="delete-account-confirm-password"
                label="Re-enter current password"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter password"
                disabled={isPending}
                error={fieldErrors.confirmPassword?.[0]}
                icon={Lock}
                autoComplete="current-password"
                showPassword={showConfirmPassword}
                onShowPasswordChange={setShowConfirmPassword}
              />

              <TextField
                id="delete-account-confirmation"
                label={`Type ${DELETE_ACCOUNT_CONFIRMATION_PHRASE}`}
                value={confirmationPhrase}
                onChange={setConfirmationPhrase}
                disabled={isPending}
                error={fieldErrors.confirmationPhrase?.[0]}
                icon={Type}
                autoComplete="off"
              />

              <DialogFooter className="gap-3 sm:space-x-0">
                <DialogClose asChild>
                  <button
                    type="button"
                    disabled={isPending}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Cancel
                  </button>
                </DialogClose>

                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Trash2 className="h-4 w-4" />
                  {isPending ? "Deleting account..." : "Delete my account"}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
