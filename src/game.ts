import { characterSets, getSet } from './data/sets';

export type Theme = 'system' | 'light' | 'dark';
export interface Preferences { setId: string; shuffle: boolean; theme: Theme }
export interface Deck { history: string[]; index: number }
export interface Game { preferences: Preferences; deck: Deck; interacted: boolean }
export const STORAGE_KEY = 'hanzi-cards:preferences:v1';
export const defaults: Preferences = { setId: 'jinan-through-2', shuffle: true, theme: 'system' };

export function readPreferences(storage: Pick<Storage, 'getItem'>): Preferences {
  try {
    const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return { ...defaults };
    const p = value as Partial<Preferences>;
    return {
      setId: characterSets.some(set => set.id === p.setId) ? p.setId! : defaults.setId,
      shuffle: typeof p.shuffle === 'boolean' ? p.shuffle : defaults.shuffle,
      theme: p.theme === 'light' || p.theme === 'dark' || p.theme === 'system' ? p.theme : defaults.theme,
    };
  } catch { return { ...defaults }; }
}

export function savePreferences(storage: Pick<Storage, 'setItem'>, preferences: Preferences): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch { return false; }
}

export function makeOrder(characters: readonly string[], shuffle: boolean, previous?: string): string[] {
  const order = [...characters];
  if (shuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    // No immediate repeat when a new shuffled round begins.
    if (order.length > 1 && order[0] === previous) {
      const j = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[j]] = [order[j], order[0]];
    }
  }
  return order;
}

export function createGame(preferences: Preferences): Game {
  return {
    preferences,
    deck: { history: makeOrder(getSet(preferences.setId).characters, preferences.shuffle), index: 0 },
    interacted: false,
  };
}

export type Action = { type: 'next' | 'previous' | 'restart' }
  | { type: 'preferences'; preferences: Preferences };

export function gameReducer(state: Game, action: Action): Game {
  if (action.type === 'preferences') {
    const changedDeck = state.preferences.setId !== action.preferences.setId
      || state.preferences.shuffle !== action.preferences.shuffle;
    return changedDeck ? { ...createGame(action.preferences), interacted: true }
      : { ...state, preferences: action.preferences };
  }
  if (action.type === 'restart') return { ...createGame(state.preferences), interacted: true };
  const { history, index } = state.deck;
  if (action.type === 'previous') {
    return { ...state, interacted: true, deck: { history, index: Math.max(0, index - 1) } };
  }
  if (index + 1 < history.length) {
    return { ...state, interacted: true, deck: { history, index: index + 1 } };
  }
  const characters = getSet(state.preferences.setId).characters;
  const next = makeOrder(characters, state.preferences.shuffle, history[index]);
  // Keep three rounds for back navigation without unbounded memory growth.
  const combined = [...history, ...next];
  const trim = Math.max(0, combined.length - characters.length * 3);
  return {
    ...state, interacted: true,
    deck: { history: combined.slice(trim), index: index + 1 - trim },
  };
}

export function swipeDirection(dx: number, dy: number): 'next' | 'previous' | null {
  return Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.3
    ? dx < 0 ? 'next' : 'previous' : null;
}
