# Global PDF template ingestion

System (global) contract and disclosure templates live in the **git repo** only as a **source of truth for developers and CI**. After ingestion, the API serves template metadata and file locations from the **database** and **object storage**—not from raw repo paths at runtime.

## Repository layout

Place PDFs under:

`apps/api/templates/global/`

You may use subfolders for organization (e.g. `examples/`, `tx/`, `disclosures/`). Ingestion walks the tree recursively.

### File naming

Recommended pattern (version in the filename):

- `listing_agreement__v1.pdf`
- `listing_agreement__v1.json` (optional sidecar metadata)

Double underscore before `v` and the version number makes parsing predictable. If there is **no** JSON sidecar, ingestion infers a minimal metadata set from the PDF basename (key, version, `documentType: generic`, empty workflows).

**Ingestion only discovers `*.pdf` files.** A JSON sidecar alone (e.g. `iabs__v1.json` without `iabs__v1.pdf` next to it) is ignored until the matching PDF exists in the repo—then metadata merges from the sidecar.

## Sidecar metadata (`*.json`)

Each PDF can have a JSON file with the same base name. Example:

```json
{
  "name": "TX Listing Agreement",
  "key": "tx-listing-agreement",
  "version": 1,
  "documentType": "listing_agreement",
  "workflows": ["listing", "offer_acceptance"],
  "jurisdiction": "TX",
  "tags": ["texas", "listing", "agreement"],
  "isRequiredByDefault": true,
  "description": "Standard Texas listing agreement",
  "notes": "Optional internal notes",
  "fieldMappingJson": null
}
```

- **`workflows`**: array of workflow keys. A **single template can belong to many workflows**; associations are stored in `TemplateWorkflow`, not as a single column on the template.
- **`key`**: becomes the global `slug` (normalized to lowercase kebab-case). Must be unique across all templates.
- **`version`**: intended logical version. If that version slot is already taken by different content (different hash), ingestion allocates the next free version number.

Unknown workflow keys are **auto-created** as `WorkflowDefinition` rows (label defaults to the key) so ingestion does not fail on new workflow names.

## Why copy files to storage?

- **Consistent runtime**: the app reads `storageKey` / signed URLs from the DB, independent of deploy layout or container filesystem.
- **Production parity**: local disk in dev, S3-compatible storage in staging/production, same code path.
- **Immutability**: system templates are not edited in place; workspace copies use `parentTemplateId` and a new row/version when you fork.

## Ingestion command

From the monorepo root:

```bash
pnpm templates:ingest
```

Options:

- `--dry-run`: log actions only (no DB or storage writes).

Environment:

- **`GLOBAL_TEMPLATES_DIR`**: optional absolute path to the folder to scan. If unset, ingestion picks the first path that exists: `apps/api/templates/global` (when cwd is the monorepo root) or `templates/global` (when cwd is `apps/api`, which is how `pnpm templates:ingest` runs).
- **`STORAGE_DRIVER`**: `local` (default) or `s3`.
- **`STORAGE_LOCAL_PATH`** / **`S3_*`**: same as the rest of the file stack.

## HTTP API (authenticated)

Requires `x-workspace-id` and `x-user-id` (dev headers) like other tenant routes.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/templates` | Paginated list (`page`, `pageSize` default 50, max 200; `q`, `documentType`, `workflowKey`, `scope`, `status`). Response `{ items, meta }` → envelope `{ data, meta }`. |
| `GET` | `/api/templates/:id` | Detail with versions and signed download URLs where supported. |
| `GET` | `/api/templates/:id/versions` | All versions. |
| `POST` | `/api/templates/ingest-global` | **Admin only** — runs the same ingestion as the CLI. |
| `POST` | `/api/templates/upload` | `multipart/form-data`: `file` (PDF), `name`, `slug`, `documentType`, optional `description`, `workflows` (JSON array string), `fieldMappingJson`, `jurisdiction`, `isGlobal=true` (admins only). |
| `POST` | `/api/templates` | JSON-only create without a file (optional `parentTemplateId` to fork). |
| `PATCH` | `/api/templates/:id` | Update **workspace** templates only; system templates return an error (fork instead). |
| `GET` | `/api/workflows` | Active workflow catalog (`WorkflowDefinition`). |

## Database model (summary)

- **`Template`**: `workspaceId` null + `isSystemTemplate` = global library entry; optional `parentTemplateId` for forks.
- **`TemplateVersion`**: `storageKey`, `fileHash`, `versionNumber`; unique `(templateId, fileHash)` prevents duplicate uploads of identical bytes.
- **`TemplateWorkflow`**: many-to-many between templates and workflow keys.
- **`WorkflowDefinition`**: catalog of valid workflow keys and labels.

Deal **`Document.templateId`** references **`Template`** (library row). Legacy `DocumentTemplate` has been removed.

## Migrations

After pulling schema changes:

```bash
pnpm db:migrate
```

Then seed (optional) and ingest:

```bash
pnpm db:seed
pnpm templates:ingest
```
