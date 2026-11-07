"use client";

import { useFormStatus } from "react-dom";
import { allocateAction, generateReportAction, runAgentAction } from "@/app/actions";

type Props = {
  agentId?: string;
  slot?: "morning" | "afternoon";
  allocate?: boolean;
  label: string;
  className?: string;
};

function Submit({ label, className }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "inline-flex min-h-10 items-center rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
      }
    >
      {pending ? "Running…" : label}
    </button>
  );
}

export function RunButton({ agentId, slot, allocate, label, className }: Props) {
  const action = allocate
    ? allocateAction
    : slot
      ? generateReportAction.bind(null, slot)
      : runAgentAction.bind(null, agentId ?? "");
  return (
    <form action={action}>
      <Submit label={label} className={className} />
    </form>
  );
}
