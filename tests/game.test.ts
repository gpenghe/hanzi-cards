import { describe, expect, it } from 'vitest';
import { characterSets } from '../src/data/sets';
import { jinanBook1, jinanBook2, jinanBook3 } from '../src/data/jinan';
import { createGame, defaults, gameReducer, makeOrder, readPreferences, savePreferences, STORAGE_KEY, swipeDirection } from '../src/game';

describe('character collections', () => {
  it('has 500 distinct characters in Basic 500 and stable unique set IDs', () => {
    expect(characterSets.find(set => set.id === 'basic-500')?.characters).toHaveLength(500);
    expect(new Set(characterSets.map(set => set.id)).size).toBe(characterSets.length);
  });
  for (const set of characterSets) {
    it(`${set.name} contains only unique, single Han characters`, () => {
      expect(set.characters.length).toBeGreaterThan(0);
      expect(new Set(set.characters).size).toBe(set.characters.length);
      for (const character of set.characters) expect(character).toMatch(/^\p{Script=Han}$/u);
    });
  }
  it('builds cumulative textbook sets from the verified volume lists', () => {
    expect([jinanBook1.length, jinanBook2.length, jinanBook3.length]).toEqual([133, 143, 158]);
    expect(characterSets[0].characters).toEqual([...new Set([...jinanBook1, ...jinanBook2])]);
    expect(characterSets[1].characters).toEqual([...new Set([...jinanBook1, ...jinanBook2, ...jinanBook3])]);
    expect(characterSets[0].characters).toHaveLength(275);
    expect(characterSets[1].characters).toHaveLength(429);
    expect(characterSets[0].characters.every(c => characterSets[1].characters.includes(c))).toBe(true);
  });
});

describe('game navigation', () => {
  it('goes next and previous without going before the first card', () => {
    const state = createGame({ ...defaults, shuffle: false });
    expect(state.deck.history[0]).toBe('一');
    const next = gameReducer(state, { type: 'next' });
    expect(next.deck.history[next.deck.index]).toBe('二');
    expect(gameReducer(next, { type: 'previous' }).deck).toEqual(state.deck);
    expect(gameReducer(state, { type: 'previous' }).deck.index).toBe(0);
    expect(next.interacted).toBe(true);
  });
  it('has no repeats within each shuffled traversal, including after rollover', () => {
    let state = createGame(defaults);
    const count = characterSets[0].characters.length;
    const all: string[] = [];
    for (let i = 0; i < count * 5; i++) {
      all.push(state.deck.history[state.deck.index]);
      state = gameReducer(state, { type: 'next' });
    }
    for (let round = 0; round < 5; round++) {
      expect(new Set(all.slice(round * count, (round + 1) * count)).size).toBe(count);
      if (round) expect(all[round * count]).not.toBe(all[round * count - 1]);
    }
    expect(state.deck.history.length).toBeLessThanOrEqual(count * 3);
  });
  it('retains history across round boundaries and replays it going forward', () => {
    let state = createGame(defaults);
    state = { ...state, deck: { ...state.deck, index: state.deck.history.length - 1 } };
    const last = state.deck.history[state.deck.index];
    const next = gameReducer(state, { type: 'next' });
    const back = gameReducer(next, { type: 'previous' });
    expect(back.deck.history[back.deck.index]).toBe(last);
    expect(gameReducer(back, { type: 'next' }).deck).toEqual(next.deck);
  });
  it('restarts the sequential list on reaching the end', () => {
    const state = createGame({ ...defaults, shuffle: false });
    state.deck.index = state.deck.history.length - 1;
    const next = gameReducer(state, { type: 'next' });
    expect(next.deck.history[next.deck.index]).toBe('一');
  });
  it('changes sets and modes safely but preserves the card when changing theme', () => {
    let state = createGame(defaults);
    state = gameReducer(state, { type: 'next' });
    const dark = gameReducer(state, { type: 'preferences', preferences: { ...defaults, theme: 'dark' } });
    expect(dark.deck).toEqual(state.deck);
    const basic = gameReducer(dark, { type: 'preferences', preferences: { ...defaults, setId: 'basic-500', shuffle: false } });
    expect(basic.deck.index).toBe(0);
    expect(basic.deck.history).toHaveLength(500);
    expect(basic.deck.history[0]).toBe('人');
  });
  it('does not mutate the original dataset', () => {
    const chars = Object.freeze(['人', '口', '手']);
    expect([...makeOrder(chars, true)].sort()).toEqual([...chars].sort());
    expect(makeOrder(chars, false)).toEqual(chars);
  });
});

describe('preferences only', () => {
  it('persists preferences without game history or progress', () => {
    const memory = new Map<string, string>();
    const storage = { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => { memory.set(key, value); } };
    const preferences = { ...defaults, shuffle: false, theme: 'dark' as const };
    expect(savePreferences(storage, preferences)).toBe(true);
    expect(readPreferences(storage)).toEqual(preferences);
    expect(Object.keys(JSON.parse(memory.get(STORAGE_KEY)!)).sort()).toEqual(['setId', 'shuffle', 'theme']);
  });
  it.each(['broken JSON', 'null', '[]', '5', '"text"', '{"setId":"removed","shuffle":1,"theme":"unknown"}'])('recovers from invalid saved values: %s', value => {
    expect(readPreferences({ getItem: () => value })).toEqual(defaults);
  });
  it('works when browser storage is unavailable', () => {
    expect(readPreferences({ getItem: () => { throw new Error('denied'); } })).toEqual(defaults);
    expect(savePreferences({ setItem: () => { throw new Error('full'); } }, defaults)).toBe(false);
  });
});

describe('gestures', () => {
  it('distinguishes deliberate horizontal swipes from small and vertical movements', () => {
    expect(swipeDirection(-100, 10)).toBe('next');
    expect(swipeDirection(100, 10)).toBe('previous');
    expect(swipeDirection(5, 2)).toBeNull();
    expect(swipeDirection(30, 0)).toBeNull();
    expect(swipeDirection(50, 90)).toBeNull();
  });
});
