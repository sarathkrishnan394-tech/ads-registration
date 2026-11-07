"use client";

import { useFormStatus } from "react-dom";
import { draftProposalAction } from "@/app/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-10 rounded-lg border border-navy px-4 text-sm font-semibold text-navy disabled:opacity-60"
    >
      {pending ? "Drafting…" : "Ask Faris for a proposal"}
    </button>
  );
}

export function DraftProposalButton({ customerId }: { customerId: number }) {
  return (
    <form action={draftProposalAction.bind(null, customerId)}>
      <Submit />
    </form>
  );
}
