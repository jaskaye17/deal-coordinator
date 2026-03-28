import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalStorageProvider } from '../src/modules/file-storage/local-storage.provider';

describe('LocalStorageProvider', () => {
  const testDir = path.join(__dirname, '../tmp/test-storage');
  let provider: LocalStorageProvider;

  beforeEach(() => {
    process.env.STORAGE_LOCAL_PATH = testDir;
    provider = new LocalStorageProvider();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  describe('initializeDealFolders', () => {
    it('creates default folder structure for a deal', async () => {
      const paths = await provider.initializeDealFolders('ws-1', 'deal-1');

      expect(paths.length).toBe(9);
      expect(paths).toContain('ws-1/deal-1/01_Intake');
      expect(paths).toContain('ws-1/deal-1/09_Audit_Log');

      const stat = await fs.stat(path.join(testDir, 'ws-1', 'deal-1', '01_Intake'));
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('storeFile', () => {
    it('stores a file and returns relative path', async () => {
      const result = await provider.storeFile(
        'ws-1',
        'deal-1',
        '01_Intake',
        'test.txt',
        'hello world',
      );

      expect(result).toBe('ws-1/deal-1/01_Intake/test.txt');

      const content = await fs.readFile(
        path.join(testDir, 'ws-1', 'deal-1', '01_Intake', 'test.txt'),
        'utf8',
      );
      expect(content).toBe('hello world');
    });

    it('handles Buffer content', async () => {
      await provider.storeFile(
        'ws-1',
        'deal-1',
        '02_Listing_Docs',
        'binary.pdf',
        Buffer.from([0x25, 0x50, 0x44, 0x46]),
      );

      const content = await fs.readFile(
        path.join(testDir, 'ws-1', 'deal-1', '02_Listing_Docs', 'binary.pdf'),
      );
      expect(content[0]).toBe(0x25);
    });
  });

  describe('uploadFile', () => {
    it('stores a file by key', async () => {
      const key = await provider.uploadFile('ws-1/files/doc.txt', 'content here');
      expect(key).toBe('ws-1/files/doc.txt');

      const content = await fs.readFile(
        path.join(testDir, 'ws-1', 'files', 'doc.txt'),
        'utf8',
      );
      expect(content).toBe('content here');
    });
  });

  describe('deleteFile', () => {
    it('deletes an existing file', async () => {
      await provider.uploadFile('ws-1/to-delete.txt', 'temp');
      await provider.deleteFile('ws-1/to-delete.txt');

      await expect(
        fs.access(path.join(testDir, 'ws-1', 'to-delete.txt')),
      ).rejects.toThrow();
    });

    it('does not throw for non-existent file', async () => {
      await expect(provider.deleteFile('nonexistent.txt')).resolves.toBeUndefined();
    });
  });

  describe('createFolder', () => {
    it('creates a folder by key', async () => {
      await provider.createFolder('ws-1/new-folder');

      const stat = await fs.stat(path.join(testDir, 'ws-1', 'new-folder'));
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('listFiles', () => {
    it('lists files in a deal directory', async () => {
      await provider.storeFile('ws-1', 'deal-1', '01_Intake', 'a.txt', 'aaa');
      await provider.storeFile('ws-1', 'deal-1', '02_Listing_Docs', 'b.pdf', 'bbb');

      const files = await provider.listFiles('ws-1', 'deal-1');

      expect(files.length).toBe(2);
      expect(files.find((f) => f.name === 'a.txt')).toBeTruthy();
      expect(files.find((f) => f.name === 'b.pdf')).toBeTruthy();
    });

    it('returns empty array for non-existent deal', async () => {
      const files = await provider.listFiles('ws-1', 'nonexistent');
      expect(files).toEqual([]);
    });
  });

  describe('listFilesByPrefix', () => {
    it('lists files under a key prefix', async () => {
      await provider.uploadFile('global-templates/a/v1/x.pdf', '%PDF');
      await provider.uploadFile('global-templates/b/v1/y.pdf', '%PDF');

      const listed = await provider.listFilesByPrefix('global-templates/a');
      expect(listed.some((f) => f.key.endsWith('x.pdf'))).toBe(true);
      expect(listed.some((f) => f.key.includes('global-templates/b'))).toBe(false);
    });

    it('returns empty array for missing prefix', async () => {
      const listed = await provider.listFilesByPrefix('nope/');
      expect(listed).toEqual([]);
    });
  });
});
