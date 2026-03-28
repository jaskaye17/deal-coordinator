/** Default deal folder tree under each deal’s `root` folder. Order matches `files-navigation.ts` (`DEAL_TEMPLATE_LEAF_SORT_ORDER`). */
export interface FolderTemplateNode {
  name: string;
  children?: FolderTemplateNode[];
}

/** Internal path segment for the per-deal umbrella folder (DB `Folder.path`). */
export const DEAL_FILES_ROOT_PATH = 'root';

/**
 * Default folders created under each deal’s umbrella (`root/`).
 * Align with `folderPathForRoutingKind` in file-routing.ts.
 */
export const DEFAULT_DEAL_FOLDER_LEAVES: FolderTemplateNode[] = [
  { name: 'listing' },
  { name: 'disclosures' },
  { name: 'contracts' },
  { name: 'general' },
];

/** @deprecated Use DEFAULT_DEAL_FOLDER_LEAVES — kept for seed JSON and older imports. */
export const DEFAULT_DEAL_FOLDER_TEMPLATE: FolderTemplateNode[] = DEFAULT_DEAL_FOLDER_LEAVES;

/** Used to detect whether default deal folders were already created (idempotent seed / ensure). */
export const DEFAULT_DEAL_FOLDER_MARKER_PATH = DEAL_FILES_ROOT_PATH;

export interface FolderTemplateJson {
  roots: FolderTemplateNode[];
}

export function parseFolderTemplateRoots(structureJson: unknown): FolderTemplateNode[] {
  if (Array.isArray(structureJson)) {
    return structureJson as FolderTemplateNode[];
  }
  if (structureJson && typeof structureJson === 'object' && 'roots' in structureJson) {
    const roots = (structureJson as FolderTemplateJson).roots;
    return Array.isArray(roots) ? roots : [];
  }
  return [];
}
