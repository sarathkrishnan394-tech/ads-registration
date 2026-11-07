import { STATUS_LABEL } from "@/lib/constants";

const TONE: Record<string, string> = {
  converted: "bg-teal-light text-teal-dark",
  registered: "bg-teal-light text-navy",
  interested: "bg-[#e8f3ff] text-navy",
  callback: "bg-[#fff4d6] text-[#7a5b00]",
  hot: "bg-[#fdecea] text-danger",
  warm: "bg-[#fff4d6] text-[#7a5b00]",
  new: "bg-line text-muted",
  allocated: "bg-line text-navy",
  contacted: "bg-line text-navy",
  not_interested: "bg-[#fdecea] text-danger",
  duplicate: "bg-[#fdecea] text-danger",
  open: "bg-[#fff4d6] text-[#7a5b00]",
  merged: "bg-teal-light text-teal-dark",
  dismissed: "bg-line text-muted",
  draft: "bg-line text-navy",
  sent: "bg-teal-light text-teal-dark",
  pending: "bg-line text-muted",
  called: "bg-teal-light text-navy",
  active: "bg-teal-light text-teal-dark",
  planned: "bg-[#e8f3ff] text-navy",
  webinar: "bg-[#e8f3ff] text-navy",
  breakfast: "bg-[#fff4d6] text-[#7a5b00]",
  high: "bg-[#fdecea] text-danger",
  medium: "bg-[#fff4d6] text-[#7a5b00]",
};

export function StatusPill({ value }: { value: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[value] ?? "bg-line text-muted"}`}>
      {STATUS_LABEL[value] ?? value.replaceAll("_", " ")}
    </span>
  );
}
