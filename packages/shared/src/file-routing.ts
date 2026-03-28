import { DEAL_FILES_ROOT_PATH } from './deal-folder-template';

/** Classifies uploads for automatic folder placement (no user picker). */
export type FileRoutingKind =
  | 'listing_agreement'
  | 'disclosure'
  | 'contract'
  | 'signed'
  | 'offer'
  | 'communication'
  | 'closing'
  | 'general';

/** Folder path relative to workspace storage (matches Folder.path, includes deal umbrella). */
export function folderPathForRoutingKind(kind: FileRoutingKind): string {
  const root = DEAL_FILES_ROOT_PATH;
  switch (kind) {
    case 'listing_agreement':
      return `${root}/listing`;
    case 'disclosure':
      return `${root}/disclosures`;
    case 'contract':
    case 'signed':
    case 'offer':
      return `${root}/contracts`;
    case 'communication':
    case 'closing':
    default:
      return `${root}/general`;
  }
}

const ROUTING_KEYWORDS: Array<{ kind: FileRoutingKind; patterns: RegExp[] }> = [
  {
    kind: 'listing_agreement',
    patterns: [/listing\s*agreement/i, /listing\s*contract/i, /exclusive\s*right/i],
  },
  {
    kind: 'disclosure',
    patterns: [/disclosure/i, /iabs/i, /seller\s*disclosure/i],
  },
  {
    kind: 'contract',
    patterns: [/purchase\s*agreement/i, /sales\s*contract/i, /\bpsa\b/i, /contract(?!or)/i],
  },
  { kind: 'signed', patterns: [/signed/i, /executed/i, /counter.?signed/i] },
  { kind: 'offer', patterns: [/offer/i, /pre[- ]?approval/i, /proof\s*of\s*funds/i] },
  { kind: 'closing', patterns: [/closing/i, /hud/i, /settlement/i, /cd\b/i] },
];

/**
 * Infer routing kind from original filename / MIME hints (best-effort).
 */
export function inferFileRoutingKind(fileName: string, _mimeType?: string): FileRoutingKind {
  const base = fileName.trim();
  for (const { kind, patterns } of ROUTING_KEYWORDS) {
    if (patterns.some((p) => p.test(base))) return kind;
  }
  return 'general';
}
