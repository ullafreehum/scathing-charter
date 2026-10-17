import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, normalizeSettings } from './storage';

describe('settings migration', () => {
  it('fills defaults for an empty object', () => { expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS); });
  it('migrates the old motion / largeText switches', () => {
    const s = normalizeSettings({ sound: false, motion: false, largeText: true });
    expect(s).toMatchObject({ sound: false, ash: false, animations: false, textScale: 1.12, theme: 'ashlands' });
    expect(s).not.toHaveProperty('motion');
  });
  it('clamps bad values', () => {
    expect(normalizeSettings({ volume: 7, textScale: Number.NaN }).volume).toBe(1);
    expect(normalizeSettings({ textScale: 9 }).textScale).toBe(1.6);
  });
});
