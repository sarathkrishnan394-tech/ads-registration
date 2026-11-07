"use client";

import { useFormStatus } from "react-dom";
import { dismissDuplicateAction, mergeDuplicateAction } from "@/app/actions";

function Submit({ label, className }: { label: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Working…" : label}
    </button>
  );
}

export function DuplicateActions({ groupId }: { groupId: number }) {
  return (
    <div className="flex gap-2">
      <form action={mergeDuplicateAction.bind(null, groupId)}>
        <Submit label="Merge" className="rounded-md bg-navy px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60" />
      </form>
      <form action={dismissDuplicateAction.bind(null, groupId)}>
        <Submit
          label="Dismiss"
          className="rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-muted disabled:opacity-60"
        />
      </form>
    </div>
  );
}
