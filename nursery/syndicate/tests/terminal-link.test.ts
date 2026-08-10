import { describe, expect, it } from 'vitest';
import { terminalLink } from '../src/terminal-link.js';

const ESC = String.fromCharCode(27);
const BEL = String.fromCharCode(7);

describe('terminalLink', () => {
  it('wraps a URL in OSC 8 hyperlink escape codes', () => {
    const result = terminalLink('https://example.com');
    expect(result).toBe(`${ESC}]8;;https://example.com${BEL}https://example.com${ESC}]8;;${BEL}`);
  });

  it('uses a custom label when given, still linking to the URL', () => {
    const result = terminalLink('https://example.com', 'Click here');
    expect(result).toBe(`${ESC}]8;;https://example.com${BEL}Click here${ESC}]8;;${BEL}`);
  });
});
