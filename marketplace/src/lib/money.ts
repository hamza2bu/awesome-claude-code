export function formatMoney(cents: number, currency = "usd", locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase() }).format(
    cents / 100,
  );
}

/** Parses a user-entered decimal amount ("12.5", "12,50") into minor units. */
export function parseMoneyToCents(input: string): number | null {
  const normalized = input.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, frac = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function formatBps(bps: number) {
  return `${(bps / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}
