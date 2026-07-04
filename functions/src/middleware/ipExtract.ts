/**
 * Extract client IP from an Express/Cloud Functions request.
 * Cloud Functions behind Google's load balancer use x-forwarded-for.
 */
export function extractIP(req: { headers: Record<string, any>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    // x-forwarded-for can be a comma-separated list; the first entry is the client
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}
