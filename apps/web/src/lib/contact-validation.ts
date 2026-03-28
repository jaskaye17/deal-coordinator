/** Strips to up to 10 US national digits; strips leading country code 1 when 11 digits. */
export function digitsFromPhone(value: string): string {
  let d = value.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d.slice(0, 10);
}

/** Display mask: (555) 555-5555 */
export function formatPhoneMask(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isCompleteUsPhoneDigits(digits: string): boolean {
  return digitsFromPhone(digits).length === 10;
}

export function phoneDigitsOptionalValid(digits: string): boolean {
  const d = digitsFromPhone(digits);
  return d.length === 0 || d.length === 10;
}

/** Practical email check — block obvious junk without being RFC-pedantic. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  return EMAIL_RE.test(t);
}

export function emailOptionalValid(value: string): boolean {
  const t = value.trim();
  return t.length === 0 || isValidEmail(t);
}

/** Empty or exactly five digits. */
export function isZipOptionalValid(zip: string): boolean {
  const z = zip.trim();
  return z.length === 0 || /^\d{5}$/.test(z);
}
