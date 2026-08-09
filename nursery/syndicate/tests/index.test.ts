import { greet } from '@/index.js';
import { describe, expect, it } from 'vitest';

describe('greet', () => {
  it('returns greeting with name', () => {
    expect(greet('world')).toBe('Hello, world!');
  });
});
