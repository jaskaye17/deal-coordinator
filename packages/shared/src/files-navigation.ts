/**
 * Canonical Files sidebar / storage layout. API and UI should follow this so structure stays consistent.
 *
 * - **Workspace** — `dealId: null`, roots listed in `WORKSPACE_FILES_ROOT_PATHS` order.
 * - **Deals** — one umbrella folder per deal (`path === DEAL_FILES_ROOT_PATH`), children follow `DEFAULT_DEAL_FOLDER_LEAVES` order.
 */
import { DEFAULT_DEAL_FOLDER_LEAVES } from './deal-folder-template';
import { WORKSPACE_SEED_FOLDERS } from './workspace-seed-folders';

/** Top-level workspace folder paths (`parentId: null`), in sidebar order. */
export const WORKSPACE_FILES_ROOT_PATHS: readonly string[] = [
  WORKSPACE_SEED_FOLDERS.sharedDocuments.path,
] as const;

/** Sidebar section headings (keep in sync with Files UI). */
export const FILES_NAV_SECTION_LABELS = {
  workspace: 'Workspace',
  deals: 'Deals',
} as const;

/**
 * Canonical order for default deal template leaf folder **names** (listing, disclosures, …).
 * Custom folders under the same parent sort after these, then alphabetically.
 */
export const DEAL_TEMPLATE_LEAF_SORT_ORDER: readonly string[] = DEFAULT_DEAL_FOLDER_LEAVES.map(
  (n) => n.name,
);

export function dealFilesSidebarLabel(deal: {
  displayName?: string | null;
  title?: string | null;
  propertyAddress?: string | null;
  address?: string | null;
}): string {
  return (
    deal.displayName?.trim() ||
    deal.title?.trim() ||
    deal.propertyAddress?.trim() ||
    deal.address?.trim() ||
    'Untitled deal'
  );
}

export function sortWorkspaceRootFolders<T extends { path: string }>(folders: T[]): T[] {
  const order = WORKSPACE_FILES_ROOT_PATHS;
  return [...folders].sort((a, b) => {
    const ia = order.indexOf(a.path);
    const ib = order.indexOf(b.path);
    const va = ia === -1 ? order.length : ia;
    const vb = ib === -1 ? order.length : ib;
    if (va !== vb) return va - vb;
    return a.path.localeCompare(b.path);
  });
}

export function sortDealTemplateChildFolders<T extends { name: string }>(folders: T[]): T[] {
  const order = DEAL_TEMPLATE_LEAF_SORT_ORDER;
  return [...folders].sort((a, b) => {
    const ia = order.indexOf(a.name);
    const ib = order.indexOf(b.name);
    const va = ia === -1 ? order.length : ia;
    const vb = ib === -1 ? order.length : ib;
    if (va !== vb) return va - vb;
    return a.name.localeCompare(b.name);
  });
}
