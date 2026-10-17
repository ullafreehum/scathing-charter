import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SCHEMA_VERSION, deserialize } from './save';
import { step } from './game';

describe('save migrations', () => {
  it('loads a real 0.9.5 (v4) save and keeps playing', () => {
    const text = readFileSync(new URL('./__fixtures__/save-v4-0.9.5.json', import.meta.url), 'utf8');
    const old = JSON.parse(text);
    const s = deserialize(text);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.deposits.balmora).toBe(old.deposits['hlaalu:balmora']);
    expect(Object.keys(s.deposits).some(k => k.includes(':'))).toBe(false);
    expect(Object.keys(s.world.branches).some(k => k.includes(':'))).toBe(false);
    const next = step(s, { t: 'wait', days: 1 }).state;
    expect(next.day).toBe(s.day + 1);
  });
});
