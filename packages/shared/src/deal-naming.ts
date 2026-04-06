/** Max length for the slug base before uniqueness suffixes. */
export const DEAL_SLUG_MAX_LENGTH = 96;

export interface GenerateDealNameInput {
  primaryContactName: string;
  propertyAddress: string;
}

export interface GenerateDealNameResult {
  displayName: string;
  /** Lowercase, hyphenated base; not guaranteed unique per workspace. */
  slug: string;
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

function slugifySegment(raw: string): string {
  const s = stripDiacritics(raw)
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s.length > 0 ? s : 'deal';
}

function truncateSlug(slug: string, maxLen: number): string {
  if (slug.length <= maxLen) return slug;
  return slug.slice(0, maxLen).replace(/-+$/g, '') || 'deal';
}

/**
 * Builds human display name and URL-safe slug from contact + property.
 * Storage paths must use deal id, never this slug.
 */
export function generateDealName(input: GenerateDealNameInput): GenerateDealNameResult {
  const contact = input.primaryContactName.trim();
  const addr = input.propertyAddress.trim();
  const displayName = `${contact} — ${addr}`;
  const slug = truncateSlug(`${slugifySegment(contact)}-${slugifySegment(addr)}`, DEAL_SLUG_MAX_LENGTH);
  return { displayName, slug };
}
