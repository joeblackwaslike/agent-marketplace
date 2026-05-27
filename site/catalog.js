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
