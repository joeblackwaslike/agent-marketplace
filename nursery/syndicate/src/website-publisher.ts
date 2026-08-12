import { marked } from 'marked';
import { estimateReadTime } from './read-time.js';
import type { Article } from './types.js';

const SITE_TITLE = 'joeblack.nyc';
const X_SHARE_INTENT_URL = 'https://x.com/intent/post';
const LINKEDIN_SHARE_URL = 'https://www.linkedin.com/sharing/share-offsite/';
const GISCUS_REPO = 'joeblackwaslike/agent-marketplace';
const GISCUS_REPO_ID = 'R_kgDOSIKodw';
const GISCUS_CATEGORY = 'Comments';
const GISCUS_CATEGORY_ID = 'DIC_kwDOSIKod84DDLEf';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeRegExp(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Article content conventionally opens with a `# Title` line matching the frontmatter title
 * (a Substack/Medium export habit) — the page already renders that title from frontmatter as
 * `.article-title`, so leaving it in the markdown body doubles it up. Only ever strips a
 * genuine level-1 heading (a lone `#`, not `##`) at the very start of the content.
 */
function stripLeadingTitle(content: string): string {
  return content.replace(/^\s*#[ \t][^\n]*\n+/, '');
}

const CTA_COMMENT_PATTERN = /<!--\s*cta:([\s\S]*?)-->/g;

type CtaPayload = {
  copy: string;
  actionLabel: string;
  actionUrl: string;
};

function isCtaPayload(value: unknown): value is CtaPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CtaPayload).copy === 'string' &&
    typeof (value as CtaPayload).actionLabel === 'string' &&
    typeof (value as CtaPayload).actionUrl === 'string'
  );
}

function renderCtaCard(cta: CtaPayload): string {
  return `<aside class="cta-card">
      <p class="cta-card-copy">${escapeHtml(cta.copy)}</p>
      <a class="btn-primary cta-card-action" href="${escapeHtml(
        cta.actionUrl,
      )}" target="_blank" rel="noopener">${escapeHtml(cta.actionLabel)}</a>
    </aside>`;
}

/**
 * A marker with malformed JSON or a missing required field is left in the output as an inert
 * HTML comment (renders as nothing) rather than stripped — a second catch-all removal pass
 * risks consuming adjacent valid markup, and leaving it visible in a warning is enough for an
 * author to find and fix it during a `sync` run. Do not "fix" this into a stripping pass.
 */
function substituteCtaMarkers(bodyHtml: string): string {
  return bodyHtml.replaceAll(CTA_COMMENT_PATTERN, (match, rawJson: string) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson.trim());
    } catch {
      console.warn(`Skipping malformed CTA marker (invalid JSON): ${match}`);
      return match;
    }
    if (!isCtaPayload(parsed)) {
      console.warn(`Skipping malformed CTA marker (missing fields): ${match}`);
      return match;
    }
    return renderCtaCard(parsed);
  });
}

function renderShareLinks(title: string, canonicalUrl: string): string {
  const xHref = `${X_SHARE_INTENT_URL}?text=${encodeURIComponent(title)}&url=${encodeURIComponent(canonicalUrl)}`;
  const linkedinHref = `${LINKEDIN_SHARE_URL}?url=${encodeURIComponent(canonicalUrl)}`;

  return `<div class="share-links">
      <span class="share-links-label">Share</span>
      <a class="btn-ghost share-btn" href="${escapeHtml(xHref)}" target="_blank" rel="noopener">X</a>
      <a class="btn-ghost share-btn" href="${escapeHtml(linkedinHref)}" target="_blank" rel="noopener">LinkedIn</a>
      <button class="btn-ghost share-btn" type="button" id="copy-link-btn" data-url="${escapeHtml(canonicalUrl)}">Copy link</button>
    </div>
    <script>
      (function () {
        var btn = document.getElementById('copy-link-btn');
        if (!btn) return;
        btn.addEventListener('click', function () {
          navigator.clipboard.writeText(btn.dataset.url).then(function () {
            var original = btn.textContent;
            btn.textContent = 'Copied';
            setTimeout(function () { btn.textContent = original; }, 2000);
          });
        });
      })();
    </script>`;
}

function renderGiscusEmbed(): string {
  return `<div class="giscus-wrap">
      <div class="giscus"></div>
      <script src="https://giscus.app/client.js"
        data-repo="${GISCUS_REPO}"
        data-repo-id="${GISCUS_REPO_ID}"
        data-category="${GISCUS_CATEGORY}"
        data-category-id="${GISCUS_CATEGORY_ID}"
        data-mapping="pathname"
        data-strict="0"
        data-reactions-enabled="1"
        data-emit-metadata="0"
        data-input-position="bottom"
        data-theme="preferred_color_scheme"
        data-lang="en"
        crossorigin="anonymous"
        async>
      </script>
    </div>`;
}

export type WritingCardEntry = {
  slug: string;
  tag: string;
  title: string;
  url: string;
  readTime: number;
};

function buildCard(entry: WritingCardEntry): string {
  return `<article class="writing-card reveal" data-slug="${escapeHtml(
    entry.slug,
  )}"><span class="writing-tag">${escapeHtml(
    entry.tag,
  )}</span><h3 class="writing-title"><a href="${escapeHtml(entry.url)}">${escapeHtml(
    entry.title,
  )}</a></h3><p class="writing-meta">${entry.readTime} min read</p></article>`;
}

export function insertWritingCard(html: string, entry: WritingCardEntry): string {
  const card = buildCard(entry);
  const existingPattern = new RegExp(
    `<article class="writing-card reveal" data-slug="${escapeRegExp(
      escapeHtml(entry.slug),
    )}">.*?</article>`,
  );

  if (existingPattern.test(html)) {
    return html.replace(existingPattern, card);
  }

  const marker = '<div class="writing-list">';
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error('writing-list marker not found in site index');
  }
  const insertAt = index + marker.length;
  return html.slice(0, insertAt) + card + html.slice(insertAt);
}

function renderThemeInitScript(): string {
  return `<script>
      (function () {
        var t = localStorage.getItem('jb-theme') || 'dark';
        document.documentElement.dataset.theme = t;
      })();
    </script>`;
}

function renderNav(): string {
  return `<nav class="nav" aria-label="Main navigation">
      <a class="nav-wordmark" href="/#top">joeblack<span class="nyc">.nyc</span></a>
      <ul class="nav-links">
        <li><a href="/#plugins">Plugins</a></li>
        <li><a href="/#writing">Writing</a></li>
        <li><a href="/#projects">Projects</a></li>
        <li><a href="/#connect">Connect</a></li>
      </ul>
      <div class="nav-actions">
        <a class="nav-icon" href="https://github.com/joeblackwaslike" target="_blank" rel="noopener" aria-label="GitHub">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
        </a>
        <a class="nav-icon" href="https://twitter.com/joeblackwaslike" target="_blank" rel="noopener" aria-label="Twitter / X">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
          <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
      </div>
    </nav>`;
}

function renderFooter(): string {
  return `<footer class="site-footer">
      <span class="footer-wordmark">joeblack.nyc</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <span>© Joe Black</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <span>New York</span>
      <span class="footer-sep" aria-hidden="true">·</span>
      <a href="https://github.com/joeblackwaslike/agent-marketplace/blob/main/LICENSE">MIT</a>
    </footer>`;
}

function formatPublishedLabel(publishedAt: string | null): string {
  if (!publishedAt) return '';
  return new Date(publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function renderArticlePage(article: Article, siteBaseUrl: string, tag: string): string {
  const { title, description, slug, publishedAt } = article.frontmatter;
  const canonicalUrl = `${siteBaseUrl}/writing/${slug}/`;
  const readTime = estimateReadTime(article.content);
  const bodyHtml = substituteCtaMarkers(
    marked.parse(stripLeadingTitle(article.content), { async: false }),
  );
  const metaLine = [formatPublishedLabel(publishedAt), `${readTime} min read`]
    .filter(Boolean)
    .join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="article" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <title>${escapeHtml(title)} · ${SITE_TITLE}</title>

    ${renderThemeInitScript()}

    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="../../style.css" />
  </head>

  <body>
    ${renderNav()}

    <article class="article-page">
      <div class="article-inner">
        <a class="article-back" href="/#writing">← Writing</a>
        <span class="writing-tag">${escapeHtml(tag)}</span>
        <h1 class="article-title">${escapeHtml(title)}</h1>
        <p class="article-meta">${escapeHtml(metaLine)}</p>
        <div class="article-body">
          ${bodyHtml}
        </div>
        ${renderShareLinks(title, canonicalUrl)}
        ${renderGiscusEmbed()}
      </div>
    </article>

    ${renderFooter()}

    <script type="module">
      import { initTheme } from '../../theme.js';
      initTheme();
    </script>
  </body>
</html>
`;
}
