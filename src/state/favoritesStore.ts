const STORAGE_KEY = 'paperhub:favorites';

const safeParse = (raw: string | null): number[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => {
        const n = typeof v === 'number' ? v : Number(v);
        return Number.isFinite(n) && n > 0 ? n : null;
      })
      .filter((v): v is number => v !== null);
  } catch {
    return [];
  }
};

const readSet = (): Set<number> => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return new Set(safeParse(raw));
};

const writeSet = (set: Set<number>) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  const arr = Array.from(set.values());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore quota or serialization errors
  }
};

export const getFavoriteIds = (): number[] => {
  return Array.from(readSet().values());
};

export const isFavoriteCollection = (collectionId: number | null | undefined): boolean => {
  if (!collectionId || !Number.isFinite(collectionId)) return false;
  const set = readSet();
  return set.has(collectionId);
};

export const setFavoriteCollection = (collectionId: number, favorite: boolean): boolean => {
  if (!collectionId || !Number.isFinite(collectionId)) return false;
  const set = readSet();
  if (favorite) {
    set.add(collectionId);
  } else {
    set.delete(collectionId);
  }
  writeSet(set);
  return favorite;
};

export const toggleFavoriteCollection = (collectionId: number): boolean => {
  if (!collectionId || !Number.isFinite(collectionId)) return false;
  const set = readSet();
  const next = !set.has(collectionId);
  if (next) {
    set.add(collectionId);
  } else {
    set.delete(collectionId);
  }
  writeSet(set);
  return next;
};

export const getFavoriteCount = (): number => {
  return readSet().size;
};

