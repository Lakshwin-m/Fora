import { z } from "zod";

/**
 * Zod schemas for input validation — the first gate before sanitization.
 *
 * NOTE: These schemas validate the *shape* of the request.
 * The original spec included a `note` field on SendFriendRequestSchema
 * but Forá does not use friend-request notes, so it is omitted.
 *
 * CreateCapsuleSchema is intentionally loose on metadata fields because
 * the existing handler accepts many optional fields (recurrence, reminder, etc.)
 * that should not be rejected by validation. We validate only the fields
 * that enter the moderation pipeline.
 */

export const CreateCapsuleSchema = z.object({
  // Moderation fields — plaintext only, never stored
  plaintextTitle:   z.string().min(1).max(200),
  plaintextPreview: z.string().max(1000).optional(),

  // Storage fields — encrypted, never moderated server-side
  encryptedTitle:   z.string().max(50_000),
  encryptedContent: z.string().max(500_000),
  encryptedKeys:    z.record(z.string(), z.string()),

  // Required metadata
  unlockDate: z.string().optional(),
}).passthrough(); // allow extra fields (triggerType, recurrence, etc.)

export const PlantFlowerSchema = z.object({
  title:   z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  x:       z.number(),
  y:       z.number(),
  flower:  z.string().min(1),
  author:  z.string().max(50).optional().nullable(),
});

export const SendFriendRequestSchema = z.object({
  receiverId: z.string().min(1),
});

export const SearchUsersSchema = z.object({
  query: z.string().min(1).max(100),
});

/**
 * Onboarding / Profile update — validates user-profile fields
 * that were previously written directly to Firestore without
 * server-side checks.
 */
export const OnboardingSchema = z.object({
  name:         z.string().min(1).max(50),
  username:     z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  bio:          z.string().max(300).optional().default(""),
  dateOfBirth:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  privacyLevel: z.enum(["private", "connections", "public"]).optional(),
  photoURL:     z.string().max(2048).optional().default(""),
});

/**
 * Auth pre-validation — for any future server-auth endpoints.
 * Firebase Auth already enforces these, but having the schema
 * available lets us pre-validate before calling Firebase.
 */
export const AuthInputSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(8).max(128),
});
