export const parseJsonArraySafe = (jsonString?: string): string[] => {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      return parsed.map((v) => (typeof v === 'string' ? v : JSON.stringify(v)));
    }
    if (typeof parsed === 'string') return [parsed];
    return [];
  } catch {
    return jsonString
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
};

export const formatAuthorsShort = (authors: string[]) => {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0];
  return `${authors[0]}, et al.`;
};

export const getPublishedYear = (iso?: string): number | undefined => {
  if (!iso) return undefined;
  const n = Date.parse(iso);
  if (Number.isNaN(n)) return undefined;
  return new Date(n).getFullYear();
};

