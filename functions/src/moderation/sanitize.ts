import he from "he";

/* ================================================================
   Types
   ================================================================ */

export interface SanitizeOptions {
  maxLength: number;
  allowBasicFormatting: boolean;
  fieldName: string;
}

export interface SanitizeResult {
  clean: string;
  wasModified: boolean;
}

export interface InjectionCheckResult {
  clean: boolean;
  patterns: string[];
}

/* ================================================================
   Sanitization
   ================================================================ */

/**
 * Synchronous input cleaning — zero latency, zero cost.
 *
 * Pipeline order:
 *   1. Null bytes
 *   2. Strip HTML tags (optional basic formatting whitelist)
 *   3. Decode HTML entities
 *   4. Re-strip after decode
 *   5. NFKC unicode normalization
 *   6. Strip non-printable characters
 *   7. Collapse excessive whitespace
 *   8. Trim
 *   9. Empty check
 *  10. Length check
 */
export function sanitize(raw: string, opts: SanitizeOptions): SanitizeResult {
  if (typeof raw !== "string") {
    throw fieldError(opts.fieldName, "must be a string");
  }

  const original = raw;
  let s = raw;

  // Step 1: Null bytes — crash parsers, used in injection attacks
  s = s.replace(/\0/g, "");

  // Step 2: Strip HTML tags
  if (opts.allowBasicFormatting) {
    const SAFE = new Set(["b", "i", "em", "strong", "br", "p", "ul", "ol", "li"]);
    s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi, (match, tag) =>
      SAFE.has(tag.toLowerCase()) ? match : ""
    );
  } else {
    s = s.replace(/<[^>]*>/g, "");
  }

  // Step 3: Decode HTML entities (catches double-encoded XSS)
  s = he.decode(s);

  // Step 4: Re-strip after decode
  s = s.replace(/<[^>]*>/g, "");

  // Step 5: NFKC unicode normalization
  s = s.normalize("NFKC");

  // Step 6: Strip non-printable characters
  // Keep: tab (0x09), newline (0x0A), carriage return (0x0D), printable ASCII, extended unicode
  s = s.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, "");

  // Step 7: Collapse excessive whitespace
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/[ \t]{3,}/g, "  ");

  // Step 8: Trim
  s = s.trim();

  // Step 9: Empty check
  if (s.length === 0) {
    throw fieldError(opts.fieldName, "cannot be empty after sanitization");
  }

  // Step 10: Length check
  if (s.length > opts.maxLength) {
    throw fieldError(
      opts.fieldName,
      `exceeds maximum length of ${opts.maxLength} characters`
    );
  }

  return { clean: s, wasModified: s !== original };
}

/* ================================================================
   Injection Detection
   ================================================================ */

const INJECTION_PATTERNS: [RegExp, string][] = [
  // Shell
  [/\brm\s+-rf\b/i,                       "shell: rm -rf"],
  [/\bsudo\b/i,                            "shell: sudo"],
  [/`[^`]{0,200}`/,                        "shell: backtick execution"],
  [/\$\([^)]{0,200}\)/,                    "shell: subshell $()"],
  [/;\s*(ls|cat|wget|curl|nc|bash|sh)\b/i, "shell: chained command"],
  [/\|\s*(bash|sh|zsh|fish|cmd)\b/i,       "shell: pipe to shell"],

  // Code execution
  [/\b(exec|eval|system|popen)\s*\(/i,     "code: execution call"],
  [/\bimport\s+os\b/i,                     "code: os import"],
  [/process\.env\b/i,                      "code: env access"],

  // XSS (post-sanitization belt-and-suspenders)
  [/<script\b/i,                           "xss: script tag"],
  [/javascript\s*:/i,                      "xss: javascript protocol"],
  [/on\w+\s*=\s*["'`]/i,                  "xss: event handler attribute"],
  [/data\s*:\s*text\/html/i,               "xss: data URI"],

  // Template injection
  [/\{\{[\s\S]*?\}\}/,                     "injection: template braces"],
  [/\$\{[\s\S]*?\}/,                        "injection: template literal"],
  [/#\{[\s\S]*?\}/,                          "injection: Ruby template"],

  // SQL
  [/\bDROP\s+TABLE\b/i,                    "sql: DROP TABLE"],
  [/\bUNION\s+SELECT\b/i,                  "sql: UNION SELECT"],
  [/\bOR\s+1\s*=\s*1\b/i,                 "sql: boolean injection"],
  [/\bOR\s+'1'\s*=\s*'1'/i,                "sql: string injection"],
  [/--\s*$/m,                              "sql: comment terminator"],

  // Path traversal
  [/\.\.\//,                               "path: traversal ../"],
  [/\/etc\/(passwd|shadow|hosts)\b/i,      "path: sensitive file"],

  // SSRF / URL injection
  [/https?:\/\/169\.254\./i,               "ssrf: metadata endpoint"],
  [/https?:\/\/localhost/i,                 "ssrf: localhost"],
  [/https?:\/\/127\./i,                     "ssrf: loopback"],
];

export function detectInjections(text: string): InjectionCheckResult {
  const found = INJECTION_PATTERNS
    .filter(([pattern]) => pattern.test(text))
    .map(([, name]) => name);

  return { clean: found.length === 0, patterns: found };
}

/* ================================================================
   Field Configs
   ================================================================ */

export const Fields = {
  capsuleTitle: {
    fieldName: "title",
    maxLength: 200,
    allowBasicFormatting: false,
  },
  capsulePreview: {
    fieldName: "content preview",
    maxLength: 1000,
    allowBasicFormatting: false,
  },
  flowerTitle: {
    fieldName: "title",
    maxLength: 100,
    allowBasicFormatting: false,
  },
  flowerMessage: {
    fieldName: "message",
    maxLength: 500,
    allowBasicFormatting: false,
  },
  searchQuery: {
    fieldName: "query",
    maxLength: 100,
    allowBasicFormatting: false,
  },
} as const;

/* ================================================================
   Internal Helpers
   ================================================================ */

function fieldError(field: string, reason: string): Error {
  const err = new Error(`[Sanitize] ${field} ${reason}`) as any;
  err.statusCode = 400;
  err.publicMessage = `Invalid input: ${field} ${reason}`;
  return err;
}
