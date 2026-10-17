// Source URL helpers (see docs/LORE_BIBLE.md for the full index).
export const U = (page: string) => `https://en.uesp.net/wiki/Lore:${page}`;
export const UG = (ns: string, page: string) => `https://en.uesp.net/wiki/${ns}:${page}`;
export const IL = (slug: string) => `https://www.imperial-library.info/content/${slug}`;
/** Parse "good-id 0.7 other-id 1.2" into a tendency map. */
export function T(spec: string): Record<string, number> {
  const out: Record<string, number> = {};
  const parts = spec.trim().split(/\s+/);
  for (let i = 0; i < parts.length; i += 2) out[parts[i]] = Number(parts[i + 1]);
  return out;
}
