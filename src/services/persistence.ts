import type { Resume } from '../types/resume';
import type { Locale } from '../types/resume';

/**
 * IndexedDB persistence boundary (spec §6 layer 3, §17 error handling). This is
 * the ONLY place that touches IndexedDB. A single record holds the one resume
 * (BR-1) plus the UI locale (§10.1) and the editor's own view state. All
 * operations reject on failure so callers can fall back to memory-only mode.
 */

const DB_NAME = 'onlinecv';
const DB_VERSION = 1;
const STORE = 'app';
const RECORD_KEY = 'state';

export interface PersistedState {
  resume: Resume;
  uiLocale: Locale;
  /**
   * Which editor sections are expanded. Absent in records written before this
   * was tracked, and `null` until the user opens or closes something — either
   * way the editor falls back to its default set.
   */
  openSections?: string[] | null;
  /**
   * True once the first-run wizard has been finished. Absent in records written
   * before this was tracked — the store then infers it from the resume itself
   * (see `looksUnstarted`), so an existing CV is never sent back to the wizard.
   */
  wizardCompleted?: boolean;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

/** Load the persisted state, or `null` when nothing has been saved yet. */
export async function loadState(): Promise<PersistedState | null> {
  const db = await openDb();
  try {
    return await new Promise<PersistedState | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve((req.result as PersistedState | undefined) ?? null);
      req.onerror = () => reject(req.error ?? new Error('Failed to read state'));
    });
  } finally {
    db.close();
  }
}

/** Persist the full state (resume + UI locale). */
export async function saveState(state: PersistedState): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(state, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to write state'));
      tx.onabort = () => reject(tx.error ?? new Error('Write transaction aborted'));
    });
  } finally {
    db.close();
  }
}

/** Clear the stored state (BR-8 reset). */
export async function clearState(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to clear state'));
    });
  } finally {
    db.close();
  }
}
