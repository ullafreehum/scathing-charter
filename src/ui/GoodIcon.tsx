// Small line icons for the 16 goods (24×24, drawn in currentColor, tinted by category).
const PATHS: Record<string, string> = {
  'kwama-eggs': 'M12 4c3.5 0 6 4.5 6 9a6 6 0 0 1-12 0c0-4.5 2.5-9 6-9z',
  saltrice: 'M12 21V7M12 9 8 5M12 9l4-4M12 13 8 10M12 13l4-3M12 17l-3-2M12 17l3-2',
  sujamma: 'M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z',
  'skingrad-wine': 'M8 3h8l-1 7a3 3 0 0 1-6 0zM12 13v7M9 21h6',
  'nord-mead': 'M6 6h9v14H6zM15 9h3v7h-3M6 10h9',
  timber: 'M4 15a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 15a4 4 0 1 0 8 0 4 4 0 1 0-8 0M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0',
  'raw-glass': 'M12 3l5 6-5 12-5-12zM7 9h10',
  'raw-ebony': 'M5 15l3-8 7-2 4 6-3 8H8zM8 7l4 5 3-7M12 12l-4 8',
  stalhrim: 'M12 2v20M5 7l14 10M19 7 5 17',
  'dwemer-artifacts': 'M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  'moon-sugar': 'M15 4a8 8 0 1 0 5 13A6 6 0 0 1 15 4z',
  skooma: 'M10 3h4M11 3v5l-4 9a3 3 0 0 0 3 4h4a3 3 0 0 0 3-4l-4-9V3M8.5 15h7',
  'bug-musk': 'M10 4h4v4h-4zM9 8h6v3a5 5 0 1 1-6 0z',
  'soul-gems': 'M6 9l3-5h6l3 5-6 11zM6 9h12M9 4l3 5 3-5',
  'healing-draughts': 'M10 3h4v5a6 6 0 1 1-4 0zM12 13v4M10 15h4',
  washtongue: 'M5 12h14a7 7 0 0 1-14 0zM14 4l-3 8',
};
const TINT: Record<string, string> = { food: 'text-moss', drink: 'text-ice', material: 'text-parchment', luxury: 'text-gold', narcotic: 'text-danger', magic: 'text-lilac', medicine: 'text-moss' };

export function GoodIcon({ id, category, size = 18 }: { id: string; category?: string; size?: number }) {
  const d = PATHS[id]; if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      className={`inline-block shrink-0 align-[-3px] ${TINT[category ?? ''] ?? 'text-parchment'}`} aria-hidden="true"><path d={d} /></svg>
  );
}
