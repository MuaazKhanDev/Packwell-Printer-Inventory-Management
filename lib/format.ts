export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMoney(value: number) {
  const digits = Math.abs(value - Math.round(value)) > 0.001 ? 2 : 0;
  const formatted = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `Rs ${formatted}`;
}

export function formatQty(value: number) {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 2 }).format(value);
}

export function formatQtyWithUnit(value: number, unit: string) {
  return `${formatQty(value)} ${unit}`;
}
