'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge, EmptyState, Spinner } from '@deal-coordinator/ui';
import {
  useFolderTree,
  useFolderContents,
  useChildFolders,
  useCreateFolder,
  useUploadFile,
  useDeleteFile,
  useDeleteFolder,
} from '@/lib/hooks';
import type { FolderRecord, FileAssetRecord, FolderBreadcrumbItem } from '@/lib/hooks';

const FILE_PAGE_SIZE = 25;

function formatSize(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function folderItemCount(f: FolderRecord): number {
  const c = f._count?.children ?? 0;
  const n = f._count?.files ?? 0;
  return c + n;
}

function folderCountTitle(f: FolderRecord): string {
  const c = f._count?.children ?? 0;
  const n = f._count?.files ?? 0;
  return `${c} folder${c === 1 ? '' : 's'}, ${n} file${n === 1 ? '' : 's'}`;
}

function FolderTreeItem({
  folder,
  depth,
  selectedId,
  onSelectFolder,
  rowLabel,
  expandedIds,
  onToggleExpand,
}: {
  folder: FolderRecord;
  depth: number;
  selectedId: string | null;
  onSelectFolder: (id: string) => void;
  rowLabel?: string;
  expandedIds: Set<string>;
  onToggleExpand: (folderId: string) => void;
}) {
  const childFolderCount = folder._count?.children ?? 0;
  const hasSubtree = childFolderCount > 0;
  const expanded = expandedIds.has(folder.id);
  const { data: loadedChildren } = useChildFolders(folder.id, {
    enabled: expanded && hasSubtree,
  });
  const isSelected = selectedId === folder.id;
  const totalBadge = folderItemCount(folder);
  const displayName = rowLabel ?? folder.name;

  return (
    <div>
      <div
        className="flex w-full items-center gap-0.5 rounded-md text-left text-sm transition-colors"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        <button
          type="button"
          className={`flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-30`}
          disabled={!hasSubtree}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          onClick={(e) => {
            e.stopPropagation();
            if (hasSubtree) onToggleExpand(folder.id);
          }}
        >
          {hasSubtree ? (
            <svg
              className={`size-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <span className="size-3.5" />
          )}
        </button>
        <button
          type="button"
          title={displayName}
          onClick={() => {
            onSelectFolder(folder.id);
            if (hasSubtree) onToggleExpand(folder.id);
          }}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1 py-1.5 text-left transition-colors ${
            isSelected ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <svg className="size-4 shrink-0 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
          </svg>
          <span className="truncate">{displayName}</span>
          {totalBadge > 0 ? (
            <span
              className="ml-auto shrink-0 text-xs text-slate-400"
              title={folderCountTitle(folder)}
            >
              {totalBadge}
            </span>
          ) : null}
        </button>
      </div>
      {expanded && loadedChildren?.length ? (
        <div>
          {loadedChildren.map((child: FolderRecord) => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelectFolder={onSelectFolder}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const crumbLinkClass =
  'font-medium text-brand-600 underline decoration-brand-600/50 underline-offset-2 transition-colors hover:text-brand-700 hover:decoration-brand-700';

function Breadcrumbs({
  items,
  onNavigate,
}: {
  items: FolderBreadcrumbItem[];
  onNavigate: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Folder path"
      className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm"
    >
      {items.map((item, i) => (
        <span key={item.id} className="flex min-w-0 max-w-full items-center gap-1">
          {i > 0 ? (
            <span className="shrink-0 text-slate-400" aria-hidden>
              /
            </span>
          ) : null}
          <button
            type="button"
            title={item.name}
            onClick={() => onNavigate(item.id)}
            className={`${crumbLinkClass} block min-h-0 min-w-0 max-w-[min(100%,18rem)] overflow-hidden text-left text-ellipsis whitespace-nowrap sm:max-w-[min(100%,24rem)]`}
          >
            {item.name}
          </button>
        </span>
      ))}
    </nav>
  );
}

function NewFolderSplitButton({
  onNewFolder,
  onOpenAddFiles,
  menuOpen,
  setMenuOpen,
  disabled,
}: {
  onNewFolder: () => void;
  onOpenAddFiles: () => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, setMenuOpen]);

  return (
    <div ref={wrapRef} className="inline-flex rounded-md shadow-sm">
      <Button
        type="button"
        variant="secondary"
        size="md"
        className="shrink-0 whitespace-nowrap rounded-r-none border-r border-slate-200 px-3"
        disabled={disabled}
        onClick={onNewFolder}
      >
        + Folder
      </Button>
      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="h-10 w-8 shrink-0 rounded-l-none px-0 min-w-0"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          disabled={disabled}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="sr-only">Open menu</span>
          <svg className="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
        {menuOpen ? (
          <div
            className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            role="menu"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setMenuOpen(false);
                onOpenAddFiles();
              }}
            >
              Add Files
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type ColWidths = { name: number; type: number; size: number; modified: number; actions: number };

const COL_MIN: ColWidths = { name: 140, type: 80, size: 80, modified: 120, actions: 88 };

function estimateNameColumnPx(names: string[]): number {
  if (!names.length) return COL_MIN.name;
  const longest = names.reduce((a, b) => (a.length >= b.length ? a : b), '');
  return Math.min(1600, Math.max(COL_MIN.name, Math.ceil(longest.length * 8.2) + 52));
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-hidden
      className="absolute right-0 top-0 z-20 h-full w-3 translate-x-1/2 cursor-col-resize select-none hover:bg-brand-400/25 active:bg-brand-400/40"
      onMouseDown={onMouseDown}
    />
  );
}

function ResizableFilesTable({
  childFolders,
  files,
  openFolder,
  onOpenFile,
  onDeleteFile,
}: {
  childFolders: FolderRecord[];
  files: FileAssetRecord[];
  openFolder: (id: string) => void;
  onOpenFile: (id: string) => void;
  onDeleteFile: (id: string) => void;
}) {
  const [colWidths, setColWidths] = useState<ColWidths>({
    name: 280,
    type: 104,
    size: 96,
    modified: 176,
    actions: 104,
  });
  const [nameWidthManual, setNameWidthManual] = useState(false);

  const computedNameWidth = useMemo(() => {
    const names = [
      ...childFolders.map((f) => f.name),
      ...files.map((f) => f.fileName),
    ];
    return estimateNameColumnPx(names);
  }, [childFolders, files]);

  useEffect(() => {
    if (nameWidthManual) return;
    setColWidths((w) => ({ ...w, name: computedNameWidth }));
  }, [computedNameWidth, nameWidthManual]);

  const startResize = useCallback(
    (key: keyof ColWidths) => (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (key === 'name') setNameWidthManual(true);
      const startX = e.clientX;
      const startWidth = colWidths[key];

      function onMove(ev: MouseEvent) {
        const delta = ev.clientX - startX;
        const next = Math.max(COL_MIN[key], startWidth + delta);
        setColWidths((w) => ({ ...w, [key]: next }));
      }
      function onUp() {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        document.body.style.removeProperty('cursor');
        document.body.style.removeProperty('user-select');
      }
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [colWidths],
  );

  const tableWidth =
    colWidths.name +
    colWidths.type +
    colWidths.size +
    colWidths.modified +
    colWidths.actions;

  return (
    <table
      className="border-collapse text-left text-sm"
      style={{
        tableLayout: 'fixed',
        width: `max(100%, ${tableWidth}px)`,
      }}
    >
      <colgroup>
        <col style={{ width: colWidths.name }} />
        <col style={{ width: colWidths.type }} />
        <col style={{ width: colWidths.size }} />
        <col style={{ width: colWidths.modified }} />
        <col style={{ width: colWidths.actions }} />
      </colgroup>
      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
        <tr>
          <th className="relative px-4 py-2.5 font-medium">
            Name
            <ResizeHandle onMouseDown={startResize('name')} />
          </th>
          <th className="relative px-2 py-2.5 font-medium">
            Type
            <ResizeHandle onMouseDown={startResize('type')} />
          </th>
          <th className="relative px-2 py-2.5 text-right font-medium">
            Size
            <ResizeHandle onMouseDown={startResize('size')} />
          </th>
          <th className="relative px-2 py-2.5 font-medium">
            Modified
            <ResizeHandle onMouseDown={startResize('modified')} />
          </th>
          <th className="relative px-2 py-2.5 text-right font-medium">
            Actions
            <ResizeHandle onMouseDown={startResize('actions')} />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {childFolders.map((f) => (
          <tr
            key={`folder-${f.id}`}
            className="cursor-pointer hover:bg-slate-50"
            onDoubleClick={() => openFolder(f.id)}
            title="Double-click to open"
          >
            <td className="px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <svg
                  className="size-5 shrink-0 text-amber-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="whitespace-nowrap font-medium text-slate-900" title={f.name}>
                  {f.name}
                </span>
              </div>
            </td>
            <td className="px-2 py-2.5 text-slate-600">Folder</td>
            <td
              className="px-2 py-2.5 text-right text-slate-500"
              title={folderCountTitle(f)}
            >
              {folderItemCount(f) > 0 ? `${folderItemCount(f)} items` : '—'}
            </td>
            <td className="px-2 py-2.5 text-slate-500">—</td>
            <td className="px-2 py-2.5 text-right text-slate-400"> </td>
          </tr>
        ))}
        {files.map((file: FileAssetRecord) => {
          const isPdf = file.mimeType === 'application/pdf' || file.fileName.endsWith('.pdf');
          return (
            <tr
              key={`file-${file.id}`}
              className="cursor-pointer hover:bg-slate-50"
              onClick={() => onOpenFile(file.id)}
              title="Click to open in viewer"
            >
              <td className="px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <svg
                    className={`size-5 shrink-0 ${isPdf ? 'text-red-500' : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="whitespace-nowrap font-medium text-slate-900" title={file.fileName}>
                    {file.fileName}
                  </span>
                </div>
              </td>
              <td className="px-2 py-2.5">
                {file.mimeType ? (
                  <Badge variant="gray" className="text-[10px]">
                    {file.mimeType.split('/')[1]?.toUpperCase() ?? file.mimeType}
                  </Badge>
                ) : (
                  <span className="text-slate-500">File</span>
                )}
              </td>
              <td className="px-2 py-2.5 text-right text-slate-600">{formatSize(file.fileSize)}</td>
              <td className="px-2 py-2.5 text-slate-500 whitespace-nowrap">
                {new Date(file.createdAt).toLocaleString()}
              </td>
              <td className="px-2 py-2.5 text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file.id);
                  }}
                >
                  Delete
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function FilesPage() {
  const router = useRouter();
  const { data: tree, isLoading: loadingRoots } = useFolderTree();
  const workspaceFolders = tree?.workspace ?? [];
  const dealEntries = tree?.deals ?? [];
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [filePage, setFilePage] = useState(1);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpanded = useCallback((folderId: string) => {
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  useEffect(() => {
    setFilePage(1);
  }, [selectedFolderId]);

  useEffect(() => {
    if (!selectedFolderId) setShowNewFolder(false);
  }, [selectedFolderId]);

  const { data: contents, isLoading: loadingContents } = useFolderContents(
    selectedFolderId,
    filePage,
    { pageSize: FILE_PAGE_SIZE },
  );

  useEffect(() => {
    const crumbs = contents?.breadcrumb;
    if (!crumbs?.length) return;
    const parentIds = crumbs.slice(0, -1).map((b) => b.id);
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      for (const id of parentIds) next.add(id);
      return next;
    });
  }, [selectedFolderId, contents?.breadcrumb]);

  const createFolder = useCreateFolder();
  const deleteFile = useDeleteFile();
  const deleteFolder = useDeleteFolder();
  const upload = useUploadFile();

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const selectedFolder = contents?.folder ?? null;

  const openFolder = useCallback((folderId: string) => {
    setSelectedFolderId(folderId);
  }, []);

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || !selectedFolder) return;
      for (const file of Array.from(fileList)) {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
        );
        upload.mutate({
          fileName: file.name,
          content: base64,
          mimeType: file.type || undefined,
          folderId: selectedFolder.id,
          dealId: selectedFolder.dealId ?? undefined,
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [selectedFolder, upload],
  );

  function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim() || !selectedFolder) return;
    createFolder.mutate(
      {
        name: newFolderName.trim(),
        parentId: selectedFolder.id,
        scope: selectedFolder.dealId ? 'deal' : 'workspace',
        dealId: selectedFolder.dealId ?? undefined,
      },
      {
        onSuccess: () => {
          setNewFolderName('');
          setShowNewFolder(false);
        },
      },
    );
  }

  const hasSidebar = workspaceFolders.length > 0 || dealEntries.length > 0;
  const fileMeta = contents?.filePagination;
  const childFolders = contents?.childFolders ?? [];
  const files = contents?.files ?? [];
  const listEmpty =
    !loadingContents &&
    selectedFolderId &&
    childFolders.length === 0 &&
    files.length === 0 &&
    (!fileMeta || fileMeta.total === 0);

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[28rem] flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Files</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a folder on the left. The list shows subfolders and files together; double-click a folder row to open it
            (the same folder is selected in the tree).
          </p>
        </div>
        <NewFolderSplitButton
          onNewFolder={() => setShowNewFolder(true)}
          onOpenAddFiles={handlePickFiles}
          menuOpen={actionsMenuOpen}
          setMenuOpen={setActionsMenuOpen}
          disabled={!selectedFolderId}
        />
      </div>

      {selectedFolderId && contents?.breadcrumb?.length ? (
        <div className="mb-3 min-w-0 max-w-full shrink-0">
          <Breadcrumbs items={contents.breadcrumb} onNavigate={setSelectedFolderId} />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
            {loadingRoots ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner className="size-6 text-slate-400" />
              </div>
            ) : !hasSidebar ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No folders yet</p>
            ) : (
              <>
                {workspaceFolders.map((folder: FolderRecord) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    depth={0}
                    selectedId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    expandedIds={expandedFolderIds}
                    onToggleExpand={toggleExpanded}
                  />
                ))}
                {dealEntries.map((d) => (
                  <FolderTreeItem
                    key={d.dealId}
                    folder={d.rootFolder}
                    rowLabel={d.label}
                    depth={0}
                    selectedId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    expandedIds={expandedFolderIds}
                    onToggleExpand={toggleExpanded}
                  />
                ))}
              </>
            )}
          </div>

          {selectedFolder ? (
            <div className="shrink-0 border-t border-slate-100 p-2">
              <Button
                size="sm"
                variant="secondary"
                className="w-full text-xs"
                onClick={() => {
                  if (confirm('Delete this folder?')) {
                    deleteFolder.mutate(selectedFolder.id, {
                      onSuccess: () => setSelectedFolderId(null),
                    });
                  }
                }}
                disabled={deleteFolder.isPending}
              >
                Delete Folder
              </Button>
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-slate-50/80 p-4">
          {upload.isPending ? (
            <p className="mb-3 shrink-0 text-sm text-brand-600">Uploading…</p>
          ) : null}

          {showNewFolder ? (
            <Card className="mb-4 shrink-0 p-4">
              <form onSubmit={handleCreateFolder} className="flex flex-wrap gap-2">
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name"
                  className="min-w-[12rem] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  autoFocus
                />
                <Button type="submit" disabled={createFolder.isPending || !selectedFolder}>
                  Create
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowNewFolder(false)}>
                  Cancel
                </Button>
              </form>
            </Card>
          ) : null}

          {!selectedFolderId ? (
            <Card className="min-h-0 flex-1">
              <EmptyState
                title="Select a folder"
                description="Choose a folder on the left to see its contents in the list."
              />
            </Card>
          ) : loadingContents ? (
            <Card className="flex min-h-40 flex-1 items-center justify-center">
              <Spinner className="size-6 text-slate-400" />
            </Card>
          ) : (
            <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
              <div className="min-h-0 flex-1 overflow-auto">
                {listEmpty ? (
                  <div className="flex min-h-[12rem] items-center justify-center px-4 py-10">
                    <EmptyState
                      title="This folder is empty"
                      description="Use the + Folder menu in the toolbar to add files or create a subfolder."
                    />
                  </div>
                ) : (
                  <ResizableFilesTable
                    childFolders={childFolders}
                    files={files}
                    openFolder={openFolder}
                    onOpenFile={(id) => router.push(`/files/view/${id}`)}
                    onDeleteFile={(id) => {
                      if (confirm('Delete this file?')) deleteFile.mutate(id);
                    }}
                  />
                )}
              </div>
              {fileMeta && fileMeta.totalPages > 1 ? (
                <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                  <span>
                    Files: page {fileMeta.page} of {fileMeta.totalPages} ({fileMeta.total} total)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={fileMeta.page <= 1}
                      onClick={() => setFilePage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={fileMeta.page >= fileMeta.totalPages}
                      onClick={() => setFilePage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
