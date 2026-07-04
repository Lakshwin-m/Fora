import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createHash } from "crypto";

/* ================================================================
   Validation Failure Logger
   ================================================================
   Fire-and-forget logger for input validation failures.
   Writes to `_validationFailures` collection for monitoring.

   NEVER logs actual input values — only failure metadata.
   A logging failure must never block a user request.
   ================================================================ */

export interface ValidationFailureEvent {
  endpoint: string;
  ip: string;
  uid: string | null;
  reason: string;         // Generic category: "schema" | "sanitization" | "injection"
  timestamp: FirebaseFirestore.Timestamp;
}

/**
 * Extract IP from request headers (same logic as ipExtract middleware).
 */
function extractIPFromReq(req: {
  headers: Record<string, any>;
  socket?: { remoteAddress?: string };
}): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

/**
 * Log a validation failure — fire and forget.
 * Never throws, never blocks the response.
 */
export function logValidationFailure(
  endpoint: string,
  req: { headers: Record<string, any>; socket?: { remoteAddress?: string } },
  uid: string | null,
  reason: string
): void {
  const event: ValidationFailureEvent = {
    endpoint,
    ip: extractIPFromReq(req),
    uid,
    reason,
    timestamp: Timestamp.now(),
  };

  getFirestore()
    .collection("_validationFailures")
    .add(event)
    .catch((err) =>
      console.error("[ValidationLogger] write failed:", err)
    );
}
