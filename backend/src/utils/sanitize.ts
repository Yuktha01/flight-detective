/**
 * Sanitizes log messages and error objects to prevent leaking sensitive API keys.
 * Replaces query parameters like `access_key=...` with `access_key=[REDACTED]`,
 * and scrubs any raw occurrences of AVIATIONSTACK_API_KEY from the message.
 */
export function sanitizeLog(input: unknown): string {
  const rawMessage =
    typeof input === "string"
      ? input
      : input instanceof Error
        ? input.message
        : String(input);

  let sanitized = rawMessage.replace(/access_key=[^&\s]+/gi, "access_key=[REDACTED]");

  const apiKey = process.env.AVIATIONSTACK_API_KEY?.trim();
  if (apiKey && apiKey.length > 0) {
    sanitized = sanitized.split(apiKey).join("[REDACTED]");
  }

  return sanitized;
}
