"use client";

import { useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type ConfirmedActionValues = { amount: number | null; text: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  // Highlighted note shown on the form and again on the confirm step.
  warning?: string;
  // Optional amount field: digits only (a leading minus when allowNegative).
  amount?: {
    label: string;
    initial?: number;
    allowNegative?: boolean;
    // Inclusive bound on the absolute value, checked locally for fast
    // feedback only; the server remains authoritative.
    maxAbs?: number;
    hint?: string;
  };
  text: { label: string; maxLength: number; placeholder?: string };
  confirmLabel: string;
  destructive?: boolean;
  // Throws to show an inline error; resolves to close.
  onSubmit: (values: ConfirmedActionValues) => Promise<void>;
  // Summary line(s) for the confirmation step.
  summary: (values: ConfirmedActionValues) => string;
};

// Two-step dialog (fill in, then explicitly confirm) for final admin actions.
// Mounted only while open (parent renders it conditionally) so state is fresh.
export default function ConfirmedActionDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  amount,
  text,
  confirmLabel,
  destructive,
  onSubmit,
  summary,
}: Props) {
  const [amountInput, setAmountInput] = useState(
    amount?.initial !== undefined ? String(amount.initial) : "",
  );
  const [textInput, setTextInput] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  function parsed(): { values?: ConfirmedActionValues; error?: string } {
    let amt: number | null = null;
    if (amount) {
      const pattern = amount.allowNegative ? /^-?[0-9]+$/ : /^[0-9]+$/;
      if (!pattern.test(amountInput)) {
        return { error: "Enter a whole number of rupiah." };
      }
      amt = Number(amountInput);
      if (!Number.isSafeInteger(amt) || amt === 0) {
        return { error: "Amount must be a non-zero whole number." };
      }
      if (!amount.allowNegative && amt <= 0) {
        return { error: "Amount must be greater than 0." };
      }
      if (amount.maxAbs !== undefined && Math.abs(amt) > amount.maxAbs) {
        return { error: "Amount is above the allowed limit." };
      }
    }
    const trimmed = textInput.trim();
    if (!trimmed) return { error: `${text.label} is required.` };
    if ([...trimmed].length > text.maxLength) {
      return { error: `${text.label} must be at most ${text.maxLength} characters.` };
    }
    return { values: { amount: amt, text: trimmed } };
  }

  function handleReview() {
    const r = parsed();
    if (r.error) {
      setError(r.error);
      return;
    }
    setError("");
    setStep("confirm");
  }

  async function handleConfirm() {
    if (inFlight.current) return;
    const r = parsed();
    if (!r.values) {
      setError(r.error ?? "Invalid input.");
      setStep("form");
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      await onSubmit(r.values);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  const values = step === "confirm" ? parsed().values : undefined;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {step === "confirm" ? `Confirm: ${title}` : title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {step === "confirm"
              ? "This action is final and cannot be undone."
              : description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {warning && (
          <p className="rounded-lg border border-[#ffe2b8] bg-[#fff7e6] px-3 py-2 text-[12.5px] text-[#8a5a00]">
            {warning}
          </p>
        )}

        {step === "form" ? (
          <div className="space-y-3">
            {amount && (
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                  {amount.label}
                </span>
                <input
                  value={amountInput}
                  inputMode="numeric"
                  autoComplete="off"
                  disabled={pending}
                  onChange={(e) =>
                    setAmountInput(
                      e.target.value.replace(
                        amount.allowNegative ? /[^0-9-]/g : /[^0-9]/g,
                        "",
                      ),
                    )
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-[#e8eef4] px-3 text-[13px] text-[#1f2a37] outline-none focus:border-[#3b9eff]"
                />
                {amount.hint && (
                  <span className="mt-1 block text-[11.5px] text-[#8a97a8]">
                    {amount.hint}
                  </span>
                )}
              </label>
            )}
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a97a8]">
                {text.label}
              </span>
              <textarea
                value={textInput}
                rows={3}
                maxLength={text.maxLength}
                disabled={pending}
                placeholder={text.placeholder}
                onChange={(e) => setTextInput(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#e8eef4] px-3 py-2 text-[13px] text-[#1f2a37] outline-none focus:border-[#3b9eff]"
              />
              <span className="mt-1 block text-right text-[11px] text-[#8a97a8]">
                {textInput.length}/{text.maxLength}
              </span>
            </label>
          </div>
        ) : (
          <div className="rounded-lg bg-[#f8fafc] px-4 py-3 text-[13px] break-words whitespace-pre-line text-[#1f2a37]">
            {values ? summary(values) : ""}
          </div>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] text-[#e85d3b]">
            {error}
          </p>
        )}

        <AlertDialogFooter>
          {step === "form" ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="max-lg:h-9"
                disabled={pending}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="max-lg:h-9"
                onClick={handleReview}
              >
                Review
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="max-lg:h-9"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setStep("form");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                variant={destructive ? "destructive" : "default"}
                className="max-lg:h-9"
                disabled={pending}
                onClick={() => void handleConfirm()}
              >
                {pending ? "Processing..." : confirmLabel}
              </Button>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
