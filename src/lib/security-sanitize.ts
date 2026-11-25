const CONTROL_CHARS_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlainText(input: unknown, maxLen = 500): string {
  return String(input ?? '')
    .replace(/\0/g, '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(CONTROL_CHARS_RE, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeUrlInput(input: unknown, maxLen = 1000): string {
  const cleaned = String(input ?? '')
    .replace(/\0/g, '')
    .replace(/[<>]/g, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/data\s*:\s*text\/html/gi, '')
    .replace(CONTROL_CHARS_RE, '')
    .trim()
    .slice(0, maxLen);

  return cleaned;
}
