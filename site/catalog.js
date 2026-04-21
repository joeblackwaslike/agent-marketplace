export function getCategories(plugins) {
  return [...new Set(plugins.map(p => p.category))].sort();
}

export function applyFilter(plugins, category) {
  if (category === 'all') return plugins;
  return plugins.filter(p => p.category === category);
}

export function renderPluginCard(plugin) {
  const installCmd = `claude plugin install ${plugin.name}`;
  const sourceUrl = plugin.source.url.replace(/\.git$/, '');
  const keywords = plugin.keywords
    .map(k => `<span class="keyword">${k}</span>`)
    .join('');
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
      <span class="version">v${plugin.version}</span>
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
