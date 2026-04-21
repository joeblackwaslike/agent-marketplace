import { describe, it, expect } from 'vitest';
import { getCategories, applyFilter, renderPluginCard, renderFilterPills } from '../catalog.js';

const plugins = [
  {
    name: 'lessons-learned',
    description: 'Automatic mistake capture.',
    source: { source: 'url', url: 'https://github.com/joeblackwaslike/lessons-learned.git' },
    version: '0.1.0',
    category: 'productivity',
    keywords: ['lessons', 'hooks'],
  },
  {
    name: 'mcp-exec',
    description: 'Sandboxed code execution.',
    source: { source: 'url', url: 'https://github.com/joeblackwaslike/mcp-exec.git' },
    version: '0.1.0',
    category: 'execution',
    keywords: ['mcp', 'sandbox'],
  },
];

describe('getCategories', () => {
  it('returns sorted unique categories', () => {
    expect(getCategories(plugins)).toEqual(['execution', 'productivity']);
  });

  it('deduplicates repeated categories', () => {
    const duped = [...plugins, { ...plugins[0] }];
    expect(getCategories(duped)).toEqual(['execution', 'productivity']);
  });
});

describe('applyFilter', () => {
  it('returns all plugins when category is "all"', () => {
    expect(applyFilter(plugins, 'all')).toHaveLength(2);
  });

  it('filters to matching category', () => {
    const result = applyFilter(plugins, 'execution');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('mcp-exec');
  });

  it('returns empty array when category has no matches', () => {
    expect(applyFilter(plugins, 'nonexistent')).toHaveLength(0);
  });
});

describe('renderPluginCard', () => {
  it('includes plugin name', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('lessons-learned');
  });

  it('includes install command', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('claude plugin install lessons-learned');
  });

  it('strips .git suffix from source URL', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('https://github.com/joeblackwaslike/lessons-learned"');
    expect(html).not.toContain('.git');
  });

  it('includes version with v prefix', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('v0.1.0');
  });

  it('includes all keywords', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('lessons');
    expect(html).toContain('hooks');
  });

  it('sets data-category attribute', () => {
    const html = renderPluginCard(plugins[0]);
    expect(html).toContain('data-category="productivity"');
  });
});

describe('renderFilterPills', () => {
  it('renders All pill before category pills', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'all');
    expect(html.indexOf('>All<')).toBeLessThan(html.indexOf('execution'));
  });

  it('marks All pill as active when activeCategory is "all"', () => {
    const html = renderFilterPills(['execution'], 'all');
    const allPillSection = html.slice(0, html.indexOf('execution'));
    expect(allPillSection).toContain('active');
  });

  it('marks correct category pill as active', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'execution');
    expect(html).toMatch(/class="pill active" data-category="execution"/);
  });

  it('renders a pill for each category', () => {
    const html = renderFilterPills(['execution', 'productivity'], 'all');
    expect(html).toContain('data-category="execution"');
    expect(html).toContain('data-category="productivity"');
  });
});
