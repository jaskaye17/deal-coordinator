/**
 * PDF template rects use bottom-left origin (pdf-lib / AcroForm widgets).
 * DocuSign tab positions use x from left, y from top of page.
 */
export function pdfRectToDocuSignPosition(
  pageHeight: number,
  rect: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x,
    y: pageHeight - rect.y - rect.height,
    width: rect.width,
    height: rect.height,
  };
}

/** DocuSign recipientId is 1-based index as string ("1", "2", …). */
export function recipientIdForSignerRole(
  recipients: Array<{ role: string }>,
  signerRole: string | null | undefined,
): string | null {
  if (!signerRole?.trim()) return null;
  const fr = signerRole.trim().toLowerCase();
  const idx = recipients.findIndex((r) => r.role.trim().toLowerCase() === fr);
  return idx >= 0 ? String(idx + 1) : null;
}
