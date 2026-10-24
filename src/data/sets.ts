import { basic500 } from './basic500';
import { jinanBook1, jinanBook2, jinanBook3 } from './jinan';

export interface CharacterSet {
  id: string;
  name: string;
  description: string;
  characters: readonly string[];
}

const cumulative = (...books: string[][]) => [...new Set(books.flat())];

// Add new collections here; the selector and validation tests pick them up.
export const characterSets: readonly CharacterSet[] = [
  {
    id: 'jinan-through-2',
    name: 'Up to 二年级',
    description: '暨南《中文》 · 第一至二册',
    characters: cumulative(jinanBook1, jinanBook2),
  },
  {
    id: 'jinan-through-3',
    name: 'Up to 三年级',
    description: '暨南《中文》 · 第一至三册',
    characters: cumulative(jinanBook1, jinanBook2, jinanBook3),
  },
  {
    id: 'basic-500',
    name: 'Basic 500',
    description: 'A mix of everyday characters',
    characters: basic500,
  },
];

export function getSet(id: string): CharacterSet {
  return characterSets.find(set => set.id === id) ?? characterSets[0];
}
