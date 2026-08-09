import { describe, expect, it } from 'vitest';
import { estimateReadTime } from '../src/read-time.js';

describe('estimateReadTime', () => {
  it('rounds to the nearest minute at 200wpm', () => {
    const words = Array.from({ length: 1000 }, () => 'word').join(' ');
    expect(estimateReadTime(words)).toBe(5);
  });

  it('never returns less than 1 minute', () => {
    expect(estimateReadTime('short')).toBe(1);
  });
});
