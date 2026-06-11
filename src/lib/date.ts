import { format, isValid } from "date-fns";

/**
 * Converts Firestore Timestamp | ISO string | millis → Date
 */
export function parseFirebaseDate(value: any): Date | null {
  if (!value) return null;

  // Firestore Timestamp
  if (typeof value === "object") {
  const seconds = value.seconds ?? value._seconds;

  if (typeof seconds === "number") {
    return new Date(seconds * 1000);
  }
}

  // ISO string or millis
  const date = new Date(value);
  return isValid(date) && date.getTime() > 0 ? date : null;
}

/**
 * Safe date formatting (never throws)
 */
export function formatFirebaseDate(
  value: any,
  pattern = "dd MMM yyyy, hh:mm a"
): string {
  const date = parseFirebaseDate(value);
  if (!date) return "—";

  try {
    return format(date, pattern);
  } catch {
    return "—";
  }
}
