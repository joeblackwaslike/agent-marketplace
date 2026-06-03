import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from './catalog.js';

const MARKETPLACE_URL =
  import.meta.env.VITE_MARKETPLACE_URL ||
  '/.claude-plugin/marketplace.json';

const CODEX_MARKETPLACE_URL =
  import.meta.env.VITE_CODEX_MARKETPLACE_URL ||
  '/.codex-plugin/marketplace.json';

// ── Theme ──────────────────────────────────────────────────────────────────

function getStoredTheme() {
  return localStorage.getItem('jb-theme');
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('jb-theme', theme);
  // Icon visibility handled by CSS [data-theme="dark"] rules.
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }
}

function initTheme() {
  const saved = getStoredTheme();
  const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyTheme(saved || preferred);

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

// ── Reveal on scroll ───────────────────────────────────────────────────────

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  els.forEach((el, i) => {
    el.style.setProperty('--reveal-delay', `${i * 70}ms`);
    observer.observe(el);
  });
}

// ── Plugin cards reveal ────────────────────────────────────────────────────

function observeCards(grid) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  grid.querySelectorAll('.plugin-card').forEach((card, i) => {
    card.style.setProperty('--delay', `${i * 80}ms`);
    observer.observe(card);
  });
}

// ── Copy buttons ───────────────────────────────────────────────────────────

function attachCopyListeners(container) {
  container.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.cmd).then(() => {
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = prev; }, 2000);
      });
    });
  });
}

// ── Plugins ────────────────────────────────────────────────────────────────

async function fetchMarketplace(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function initPlatformGrid(plugins, platform, gridId, pillsId) {
  const grid = document.getElementById(gridId);
  const filterContainer = document.getElementById(pillsId);
  if (!grid) return;

  let activeCategory = 'all';

  function render() {
    const categories = getCategories(plugins);
    const filtered = applyFilter(plugins, activeCategory);

    if (filterContainer) {
      filterContainer.innerHTML = renderFilterPills(categories, activeCategory);
      filterContainer.querySelectorAll('.pill').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCategory = btn.dataset.category;
          render();
        });
      });
    }

    grid.innerHTML = filtered.map(p => renderPluginCard(p, platform)).join('');
    attachCopyListeners(grid);
    observeCards(grid);
  }

  render();
}

async function initPlugins() {
  // Wire install-command copy buttons
  document.querySelectorAll('.install-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      navigator.clipboard.writeText(target.textContent.trim()).then(() => {
        const prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = prev; }, 2000);
      });
    });
  });

  // Platform tab switching
  document.querySelectorAll('.platform-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.platform-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const platform = tab.dataset.platform;
      document.querySelectorAll('.platform-panel').forEach(panel => {
        panel.classList.toggle('hidden', panel.id !== `panel-${platform}`);
      });
    });
  });

  // Fetch both marketplaces in parallel
  const [claudeResult, codexResult] = await Promise.allSettled([
    fetchMarketplace(MARKETPLACE_URL),
    fetchMarketplace(CODEX_MARKETPLACE_URL),
  ]);

  if (claudeResult.status === 'fulfilled') {
    const plugins = claudeResult.value.plugins;
    initPlatformGrid(plugins, 'claude', 'plugin-grid-claude', 'filter-pills-claude');
    const countEl = document.getElementById('plugin-count');
    if (countEl) countEl.textContent = plugins.length;
  } else {
    const grid = document.getElementById('plugin-grid-claude');
    if (grid) grid.innerHTML = '<p class="error">Failed to load plugins. Please refresh or check back later.</p>';
  }

  if (codexResult.status === 'fulfilled') {
    initPlatformGrid(codexResult.value.plugins, 'codex', 'plugin-grid-codex', 'filter-pills-codex');
  } else {
    const grid = document.getElementById('plugin-grid-codex');
    if (grid) grid.innerHTML = '<p class="error">Failed to load plugins. Please refresh or check back later.</p>';
  }
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  initPlugins();
  // Defer reveal so elements are painted first
  requestAnimationFrame(() => {
    setTimeout(initReveal, 100);
  });
}

init();
