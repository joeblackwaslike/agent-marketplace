function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export type WritingCardEntry = {
  tag: string;
  title: string;
  url: string;
  readTime: number;
};

export function insertWritingCard(html: string, entry: WritingCardEntry): string {
  const marker = '<div class="writing-list">';
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error('writing-list marker not found in site index');
  }
  const insertAt = index + marker.length;
  const card = `<article class="writing-card reveal"><span class="writing-tag">${escapeHtml(
    entry.tag,
  )}</span><h3 class="writing-title"><a href="${escapeHtml(entry.url)}">${escapeHtml(
    entry.title,
  )}</a></h3><p class="writing-meta">${entry.readTime} min read</p></article>`;
  return html.slice(0, insertAt) + card + html.slice(insertAt);
}
