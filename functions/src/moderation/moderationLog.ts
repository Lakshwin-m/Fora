import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createHash } from "crypto";

/* ================================================================
   Types
   ================================================================ */

export type LogAction =
  | "blocked_injection"
  | "blocked_openai"
  | "allowed"
  | "skipped_timeout";

export interface ModerationEvent {
  uid: string;
  ip: string;
  contentType: "capsule" | "flower" | "friendRequest";
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
  action: LogAction;
  injectionPatterns: string[];
  contentHash: string;
}

/* ================================================================
   Logging
   ================================================================ */

/**
 * Fire-and-forget write to `_moderationLog`.
 * A logging failure must never block a user write.
 */
export function logModerationEvent(event: ModerationEvent): void {
  getFirestore()
    .collection("_moderationLog")
    .add({ ...event, timestamp: Timestamp.now() })
    .catch((err) => console.error("[ModerationLog] write failed:", err));
}

/**
 * SHA-256 hash truncated to 16 hex chars.
 * Enough for audit correlation, not brute-forceable back to content.
 */
export function hashForLogging(text: string): string {
  return createHash("sha256")
    .update(text.normalize("NFKC"))
    .digest("hex")
    .slice(0, 16);
}
