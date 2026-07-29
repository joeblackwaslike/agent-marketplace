export function getCategories(plugins) {
  return [...new Set(plugins.map(p => p.category))].sort();
}

export function applyFilter(plugins, category) {
  if (category === 'all') return plugins;
  return plugins.filter(p => p.category === category);
}

export function renderPluginCard(plugin, platform = 'claude') {
  const cli = platform === 'codex' ? 'codex' : 'claude';
  const installCmd = `${cli} plugin install ${plugin.name}`;
  const rawUrl = plugin.source.url ?? `https://github.com/${plugin.source.repo}`;
  const sourceUrl = rawUrl.replace(/\.git$/, '');
  const keywords = (plugin.keywords ?? [])
    .map(k => `<span class="keyword">${k}</span>`)
    .join('');
  const versionBadge = plugin.version ? `<span class="version">v${plugin.version}</span>` : '';
  return `<article class="plugin-card" data-category="${plugin.category}">
  <div class="card-top">
    <span class="card-category category-${plugin.category}">${plugin.category}</span>
  </div>
  <h2 class="card-name">${plugin.name}</h2>
  <p class="card-desc">${plugin.description}</p>
  <div class="card-keywords">${keywords}</div>
  <div class="card-footer">
    <div class="install-snippet">
      <code>${installCmd}</code>
      <button class="copy-btn" data-cmd="${installCmd}" aria-label="Copy">Copy</button>
    </div>
    <div class="card-meta">
      ${versionBadge}
      <a href="${sourceUrl}" target="_blank" rel="noopener">Source →</a>
    </div>
  </div>
</article>`;
}

export function renderFilterPills(categories, activeCategory) {
  const allPill = `<button class="pill${activeCategory === 'all' ? ' active' : ''}" data-category="all">All</button>`;
  const pills = categories.map(c =>
    `<button class="pill${activeCategory === c ? ' active' : ''}" data-category="${c}">${c}</button>`
  );
  return [allPill, ...pills].join('');
}

// ── Projects ─────────────────────────────────────────────────────────────────

function pluginLabel(plugin) {
  if (plugin === 'both') return 'Claude + Codex';
  if (plugin === 'codex') return 'Codex';
  if (plugin === 'claude') return 'Claude';
  return '';
}

export function projectMatches(project, filter) {
  if (!filter || filter.kind === 'all') return true;
  if (filter.kind === 'domain') return project.domains.includes(filter.value);
  if (filter.kind === 'lang') return project.lang === filter.value;
  if (filter.kind === 'type') return project.type === filter.value;
  if (filter.kind === 'plugin') return project.plugin === filter.value;
  return true;
}

export function renderDomainPills(domains, filter) {
  const isAll = !filter || filter.kind === 'all';
  const allPill = `<button class="pill${isAll ? ' active' : ''}" data-kind="all">All</button>`;
  const pills = domains.map(d => {
    const active = filter && filter.kind === 'domain' && filter.value === d;
    return `<button class="pill${active ? ' active' : ''}" data-kind="domain" data-value="${d}">${d}</button>`;
  });
  return [allPill, ...pills].join('');
}

export function renderProjectCard(p) {
  const stars = p.stars > 0
    ? `<span class="project-stars" title="GitHub stars">★ ${p.stars}</span>`
    : '';
  const domainTags = p.domains
    .map(d => `<button class="tag tag--domain" data-kind="domain" data-value="${d}">${d}</button>`)
    .join('');
  const typeTag = `<button class="tag tag--type" data-kind="type" data-value="${p.type}">${p.type}</button>`;
  const langTag = `<button class="tag tag--lang" data-kind="lang" data-value="${p.lang}">${p.lang}</button>`;
  const pluginTag = p.plugin
    ? `<button class="tag tag--plugin" data-kind="plugin" data-value="${p.plugin}">${pluginLabel(p.plugin)} plugin</button>`
    : '';
  return `<article class="project-card reveal" data-domains="${p.domains.join('|')}" data-lang="${p.lang}" data-type="${p.type}">
  <div class="project-top">
    <span class="project-icon">${p.icon}</span>
    <div class="project-head">
      <h3 class="project-name">${p.name}</h3>
      <span class="project-lang">${p.lang}</span>
    </div>
    ${stars}
  </div>
  <p class="project-desc">${p.desc}</p>
  <div class="project-tags">${domainTags}${langTag}${typeTag}${pluginTag}</div>
  <a class="project-link" href="${p.url}" target="_blank" rel="noopener">View on GitHub →</a>
</article>`;
}
