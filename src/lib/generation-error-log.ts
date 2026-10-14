/** Keep useful error causes without logging request bodies, signed URLs or SQL parameters. */
export function generationErrorDetails(
  error: unknown,
  sensitiveValues: string[] = [],
  depth = 0
): Record<string, unknown> {
  const redact = (value: string) => {
    let text = value;
    for (const secret of sensitiveValues.filter(Boolean)) {
      text = text.split(secret).join('[redacted]');
    }
    return text
      .replace(/\bparams:[\s\S]*/i, 'params: [redacted]')
      .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
      .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
      .replace(/-----BEGIN[\s\S]*?-----END[^\n]+-----/g, '[private key]')
      .replace(
        /((?:api[_-]?key|secret|token|password|authorization)\s*[=:]\s*)[^\s,;]+/gi,
        '$1[redacted]'
      )
      .slice(0, 2000);
  };
  if (!(error instanceof Error)) {
    return {
      message: typeof error === 'string' ? redact(error) : 'Non-Error thrown',
    };
  }
  return {
    name: error.name,
    message: redact(error.message),
    stack: error.stack
      ?.split('\n')
      .filter((line) => /^\s+at /.test(line))
      .slice(0, 8)
      .map(redact)
      .join('\n'),
    ...(error.cause && depth < 3
      ? {
          cause: generationErrorDetails(
            error.cause,
            sensitiveValues,
            depth + 1
          ),
        }
      : {}),
  };
}
