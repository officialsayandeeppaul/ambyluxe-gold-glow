/**
 * Medusa returns OTP request as HTTP 401 with body `{ type: "unauthorized", message: "OTP_SENT" }`.
 * The JS SDK may not put that JSON in `Error.message`, so we scan nested response / serialized data.
 */
export function isOtpSentSuccess(err: unknown): boolean {
  return collectErrorText(err).includes('OTP_SENT');
}

function collectErrorText(err: unknown, depth = 0): string {
  if (depth > 8) return '';
  if (err == null) return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'number' || typeof err === 'boolean') return String(err);
  if (err instanceof Error) {
    const msg = err.message;
    const cause = (err as Error & { cause?: unknown }).cause;
    return `${msg} ${collectErrorText(cause, depth + 1)}`;
  }
  if (typeof err !== 'object') return String(err);
  const o = err as Record<string, unknown>;
  const parts: string[] = [];
  for (const k of ['message', 'type', 'error', 'code']) {
    const v = o[k];
    if (typeof v === 'string') parts.push(v);
  }
  if (o.response && typeof o.response === 'object') {
    const r = o.response as Record<string, unknown>;
    if (r.data !== undefined) parts.push(collectErrorText(r.data, depth + 1));
    if (typeof r.status === 'number') parts.push(String(r.status));
  }
  if (o.data !== undefined) parts.push(collectErrorText(o.data, depth + 1));
  if (typeof o.body === 'string') parts.push(o.body);
  try {
    parts.push(JSON.stringify(o));
  } catch {
    parts.push(String(o));
  }
  return parts.join(' ');
}
