import * as fs from 'fs/promises';
import type { FileStorageProvider } from '../modules/file-storage/file-storage.interface';

export async function readBytesFromStorageKey(
  storage: FileStorageProvider,
  keyOrPath: string,
): Promise<Buffer | null> {
  const ref = await storage.getSignedUrl(keyOrPath);
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    try {
      const res = await fetch(ref);
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
  try {
    return await fs.readFile(ref);
  } catch {
    return null;
  }
}
