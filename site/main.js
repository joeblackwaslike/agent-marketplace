import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from './catalog.js';

const MARKETPLACE_URL =
  import.meta.env.VITE_MARKETPLACE_URL ||
  '/.claude-plugin/marketplace.json';

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

// ── Parallax ───────────────────────────────────────────────────────────────

function initParallax() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        heroBg.style.transform = `translateY(${window.scrollY * 0.35}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// ── Reveal on scroll ───────────────────────────────────────────────────────

function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
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
          entry.target.classList.add('visible');
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

async function initPlugins() {
  const grid = document.getElementById('plugin-grid');
  const filterContainer = document.getElementById('filter-pills');
  const heroCopyBtn = document.getElementById('hero-copy-btn');
  const installCmd = document.getElementById('install-cmd');

  if (heroCopyBtn && installCmd) {
    heroCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(installCmd.textContent.trim()).then(() => {
        heroCopyBtn.textContent = 'Copied!';
        setTimeout(() => { heroCopyBtn.textContent = 'Copy'; }, 2000);
      });
    });
  }

  if (!grid) return;

  let plugins = [];
  let activeCategory = 'all';

  try {
    const res = await fetch(MARKETPLACE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    plugins = data.plugins;
    const countEl = document.getElementById('plugin-count');
    if (countEl) countEl.textContent = plugins.length;
  } catch {
    grid.innerHTML = '<p class="error">Failed to load plugins. Please refresh or check back later.</p>';
    return;
  }

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

    grid.innerHTML = filtered.map(renderPluginCard).join('');
    attachCopyListeners(grid);
    observeCards(grid);
  }

  render();
}

// ── Init ───────────────────────────────────────────────────────────────────

function init() {
  initTheme();
  initParallax();
  initPlugins();
  // Defer reveal so elements are painted first
  requestAnimationFrame(() => {
    setTimeout(initReveal, 100);
  });
}

init();
