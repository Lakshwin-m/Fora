import OpenAI from "openai";

/* ================================================================
   Types
   ================================================================ */

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
  scores: Record<string, number>;
  skipped: boolean;
}

/* ================================================================
   Constants
   ================================================================ */

const TIMEOUT_MS = 3000;

/* ================================================================
   Moderation
   ================================================================ */

/**
 * Call the OpenAI Moderation API (free — no credits consumed).
 *
 * Fails OPEN on timeout or API error:
 *   - OpenAI downtime should never block users from creating capsules.
 *   - Log the failure — don't surface it to users.
 */
export async function moderateContent(
  text: string,
  apiKey: string
): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, categories: [], scores: {}, skipped: false };
  }

  const client = new OpenAI({ apiKey });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.moderations.create(
      {
        model: "omni-moderation-latest",
        input: text.slice(0, 4000),
      },
      { signal: controller.signal as any }
    );
    clearTimeout(timer);

    const result = response.results[0];
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, hit]) => hit)
      .map(([cat]) => cat);

    return {
      flagged: result.flagged,
      categories: flaggedCategories,
      scores: result.category_scores as unknown as Record<string, number>,
      skipped: false,
    };
  } catch (err: any) {
    clearTimeout(timer);

    if (err.name === "AbortError") {
      console.error("[Moderation] Timeout after 3s — failing open");
    } else {
      console.error("[Moderation] API error:", err.message);
    }

    // Fail open — allow the request through, log the failure
    return { flagged: false, categories: [], scores: {}, skipped: true };
  }
}

/**
 * Combine multiple fields into a single moderation call.
 * One API call is cheaper and more accurate (model sees full context).
 */
export function buildModerationText(fields: {
  title?: string;
  content?: string;
  message?: string;
}): string {
  return [fields.title, fields.content, fields.message]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 4000);
}
