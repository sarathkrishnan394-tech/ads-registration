export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00971")) return digits.slice(2);
  if (digits.startsWith("971")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `971${digits.slice(1)}`;
  return digits;
}

export function normalizeCompany(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b(llc|fze|fz-llc|fz llc|co|company)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
