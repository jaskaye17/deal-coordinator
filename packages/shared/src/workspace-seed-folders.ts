/**
 * Workspace-scoped folders under `{workspaceId}/_files/` (seed).
 * Top-level roots and their sidebar order: `files-navigation.ts` (`WORKSPACE_FILES_ROOT_PATHS`).
 * PDF templates are ingested via /templates (global library), not workspace folders.
 */
export const WORKSPACE_SEED_FOLDERS = {
  sharedDocuments: { name: 'SharedDocuments', path: 'SharedDocuments' },
  compliance: { name: 'compliance', path: 'SharedDocuments/compliance' },
} as const;
