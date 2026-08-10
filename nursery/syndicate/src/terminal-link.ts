const ESC_CODE_POINT = 27;
const BEL_CODE_POINT = 7;

const ESC = String.fromCodePoint(ESC_CODE_POINT);
const BEL = String.fromCodePoint(BEL_CODE_POINT);

/**
 * Wraps a URL in an OSC 8 terminal hyperlink escape sequence, so terminals that support it
 * (iTerm2, modern Terminal.app, VS Code's integrated terminal) render it as an actually
 * clickable link instead of plain text the user has to select and copy by hand. Terminals
 * without OSC 8 support just show the label as plain text — the escape codes are invisible.
 */
export function terminalLink(url: string, label: string = url): string {
  return `${ESC}]8;;${url}${BEL}${label}${ESC}]8;;${BEL}`;
}
