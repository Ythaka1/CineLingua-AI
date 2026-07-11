"use client";

/**
 * Client-side blob store for imported video files (IndexedDB).
 * v1 keeps the video local — only metadata and subtitles go to Supabase —
 * so the file must be re-attachable across sessions without re-uploading.
 */

const DB_NAME = "cinelingua";
const STORE = "videos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
        t.oncomplete = () => db.close();
      }),
  );
}

export async function putVideo(mediaId: string, file: Blob): Promise<void> {
  await tx("readwrite", (s) => s.put(file, mediaId));
}

export async function getVideo(mediaId: string): Promise<Blob | null> {
  const result = await tx<Blob | undefined>("readonly", (s) => s.get(mediaId));
  return result ?? null;
}

export async function deleteVideo(mediaId: string): Promise<void> {
  await tx("readwrite", (s) => s.delete(mediaId));
}
