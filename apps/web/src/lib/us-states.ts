/** US states (50); codes are USPS abbreviations. */

export type UsState = { code: string; name: string };

export const US_STATES: readonly UsState[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
] as const;

const CODES = new Set(US_STATES.map((s) => s.code));

/** Map stored text (abbrev or full name) to a USPS code, or '' if unknown. */
export function normalizeStateToCode(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  const upper = t.toUpperCase();
  if (upper.length === 2 && CODES.has(upper)) return upper;
  const lower = t.toLowerCase();
  const hit = US_STATES.find((s) => s.name.toLowerCase() === lower);
  return hit?.code ?? '';
}

export function isValidUsStateCode(code: string): boolean {
  return code.length === 2 && CODES.has(code.toUpperCase());
}

/** Readable label for profile display (abbrev, full name, or legacy free text). */
export function displayUsState(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  const code = normalizeStateToCode(t);
  if (code) {
    const row = US_STATES.find((s) => s.code === code);
    return row ? `${row.code} — ${row.name}` : code;
  }
  return t;
}
