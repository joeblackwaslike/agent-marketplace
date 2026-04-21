import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from './catalog.js';

const MARKETPLACE_URL =
  import.meta.env.VITE_MARKETPLACE_URL ||
  '/.claude-plugin/marketplace.json';

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

async function init() {
  const grid = document.getElementById('plugin-grid');
  const filterContainer = document.getElementById('filter-pills');
  const pluginCount = document.getElementById('plugin-count');
  const heroCopyBtn = document.getElementById('hero-copy-btn');
  const installCmd = document.getElementById('install-cmd');

  heroCopyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(installCmd.textContent).then(() => {
      heroCopyBtn.textContent = 'Copied!';
      setTimeout(() => { heroCopyBtn.textContent = 'Copy'; }, 2000);
    });
  });

  let plugins = [];
  let activeCategory = 'all';

  try {
    const res = await fetch(MARKETPLACE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    plugins = data.plugins;
    pluginCount.textContent = plugins.length;
  } catch {
    grid.innerHTML = '<p class="error">Failed to load plugins. Please refresh or check back later.</p>';
    return;
  }

  function render() {
    const categories = getCategories(plugins);
    const filtered = applyFilter(plugins, activeCategory);

    filterContainer.innerHTML = renderFilterPills(categories, activeCategory);
    grid.innerHTML = filtered.map(renderPluginCard).join('');

    filterContainer.querySelectorAll('.pill').forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.dataset.category;
        render();
      });
    });

    attachCopyListeners(grid);
    observeCards(grid);
  }

  render();
}

init();
