import { sanitize, detectInjections, SanitizeOptions } from "./sanitize";
import { moderateContent, buildModerationText } from "./moderate";
import { logModerationEvent, hashForLogging, LogAction } from "./moderationLog";
import { extractIP } from "../middleware/ipExtract";

/* ================================================================
   Types
   ================================================================ */

export interface PipelineInput {
  title?:   string;
  content?: string;
  message?: string;
}

export interface PipelineOptions {
  uid: string;
  contentType: "capsule" | "flower" | "friendRequest";
  openaiApiKey: string;
  fields: {
    title?:   SanitizeOptions;
    content?: SanitizeOptions;
    message?: SanitizeOptions;
  };
}

export interface PipelineResult {
  allowed: boolean;
  sanitized: PipelineInput;
  rejectionReason?: string;
}

/* ================================================================
   Pipeline
   ================================================================ */

/**
 * Orchestrate sanitization → injection detection → OpenAI moderation.
 * Drop into any HTTP handler between auth/rate-limiting and business logic.
 */
export async function runPipeline(
  req: { headers: Record<string, any>; socket?: { remoteAddress?: string } },
  input: PipelineInput,
  opts: PipelineOptions
): Promise<PipelineResult> {
  const ip = extractIP(req);
  const sanitized: PipelineInput = {};

  // ── Stage 1: Sanitize each field ──────────────────────────────────────
  try {
    if (input.title && opts.fields.title) {
      sanitized.title = sanitize(input.title, opts.fields.title).clean;
    }
    if (input.content && opts.fields.content) {
      sanitized.content = sanitize(input.content, opts.fields.content).clean;
    }
    if (input.message && opts.fields.message) {
      sanitized.message = sanitize(input.message, opts.fields.message).clean;
    }
  } catch (err: any) {
    return {
      allowed: false,
      sanitized: {},
      rejectionReason: err.publicMessage ?? "Invalid input",
    };
  }

  // ── Stage 2: Injection detection ──────────────────────────────────────
  const allText = [sanitized.title, sanitized.content, sanitized.message]
    .filter(Boolean)
    .join(" ");

  const injection = detectInjections(allText);

  if (!injection.clean) {
    logModerationEvent({
      uid: opts.uid,
      ip,
      contentType: opts.contentType,
      flagged: true,
      categories: ["command_injection"],
      scores: {},
      action: "blocked_injection",
      injectionPatterns: injection.patterns,
      contentHash: hashForLogging(allText),
    });

    // Never reveal which pattern matched — prevents adversarial tuning
    return {
      allowed: false,
      sanitized: {},
      rejectionReason: "Content violates community guidelines",
    };
  }

  // ── Stage 3: OpenAI Moderation ────────────────────────────────────────
  const moderationText = buildModerationText(sanitized);
  const modResult = await moderateContent(moderationText, opts.openaiApiKey);

  const action: LogAction = modResult.skipped
    ? "skipped_timeout"
    : modResult.flagged
      ? "blocked_openai"
      : "allowed";

  logModerationEvent({
    uid: opts.uid,
    ip,
    contentType: opts.contentType,
    flagged: modResult.flagged,
    categories: modResult.categories,
    scores: modResult.scores,
    action,
    injectionPatterns: [],
    contentHash: hashForLogging(allText),
  });

  if (modResult.flagged) {
    return {
      allowed: false,
      sanitized: {},
      rejectionReason: "Content violates community guidelines",
    };
  }

  return { allowed: true, sanitized };
}
