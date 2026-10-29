export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

/** Only allow same-site relative redirects (blocks `//evil.com` and absolute URLs). */
export function safeRedirect(target: FormDataEntryValue | string | null | undefined, fallback = "/") {
  const value = typeof target === "string" ? target : "";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}
