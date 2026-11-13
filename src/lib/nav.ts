/**
 * Only same-site relative paths are allowed as post-login destinations, so a crafted
 * `?next=` can never bounce someone to another origin.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return "/dashboard";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}
