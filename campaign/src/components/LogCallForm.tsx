"use client";

import { useState, useTransition } from "react";
import { logCallAction } from "@/app/actions";
import { CALL_OUTCOMES } from "@/lib/constants";

export function LogCallForm({
  customerId,
  callerId,
  compact = false,
}: {
  customerId: number;
  callerId: string;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(!compact);

  if (compact && !open) {
    return (
      <button type="button" className="text-sm font-semibold text-teal" onClick={() => setOpen(true)}>
        Log call
      </button>
    );
  }

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(formData) => {
        start(async () => {
          await logCallAction(formData);
          setOpen(false);
        });
      }}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="callerId" value={callerId} />
      <label className="flex flex-col gap-1 text-xs text-muted">
        Outcome
        <select name="outcome" required className="min-h-9 rounded-md border border-line bg-white px-2 text-sm text-charcoal">
          {CALL_OUTCOMES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs text-muted">
        Notes
        <input name="notes" className="min-h-9 rounded-md border border-line bg-white px-2 text-sm text-charcoal" placeholder="Optional" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-9 rounded-md bg-navy px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
