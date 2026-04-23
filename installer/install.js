#!/usr/bin/env node
// installer/install.js — interactive project installer for helpers repo
import React, { useState, useEffect } from 'react';
import { render, Text, Box, useInput, useApp } from 'ink';
import { execSync, spawnSync } from 'child_process';
import { existsSync, readdirSync, statSync, mkdirSync, unlinkSync, symlinkSync, readlinkSync, readFileSync, appendFileSync } from 'fs';
import { resolve, dirname, basename, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO     = resolve(__dirname, '..');
const PROJECTS = join(REPO, 'nursery');
const HOME     = homedir();

// ── discover projects ───────────────────────────────────────────────────────
function discoverProjects() {
  return readdirSync(PROJECTS)
    .filter(n => statSync(join(PROJECTS, n)).isDirectory())
    .map(name => {
      const dir  = join(PROJECTS, name);
      const bins = existsSync(join(dir, 'bin'))
        ? readdirSync(join(dir, 'bin')).filter(f => !f.startsWith('.'))
        : [];
      const zshs = existsSync(join(dir, 'zsh'))
        ? readdirSync(join(dir, 'zsh')).filter(f => f.endsWith('.zsh'))
        : [];
      const plists = existsSync(join(dir, 'launchd'))
        ? readdirSync(join(dir, 'launchd')).filter(f => f.endsWith('.plist'))
        : [];
      return { name, dir, bins, zshs, plists };
    });
}

// ── install logic ───────────────────────────────────────────────────────────
function safeLink(src, dst) {
  mkdirSync(dirname(dst), { recursive: true });
  if (existsSync(dst) || (() => { try { readlinkSync(dst); return true; } catch { return false; } })()) {
    try {
      if (readlinkSync(dst) === src) return { status: 'skipped', dst };
    } catch {}
    unlinkSync(dst);
  }
  symlinkSync(src, dst);
  return { status: 'linked', dst, src };
}

function installProject(project) {
  const results = [];

  // bin → /usr/local/bin
  for (const f of project.bins) {
    const src = join(project.dir, 'bin', f);
    spawnSync('chmod', ['+x', src]);
    results.push({ type: 'bin', ...safeLink(src, join('/usr/local/bin', f)) });
  }

  // zsh → context-aware targets
  for (const f of project.zshs) {
    const src = join(project.dir, 'zsh', f);
    let dst;
    if (f === 'docker.plugin.zsh') {
      // oh-my-zsh custom plugin — goes in its own plugin dir
      dst = join(HOME, '.oh-my-zsh/custom/plugins/docker', f);
    } else {
      dst = join(HOME, '.config/claude', f);
    }
    results.push({ type: 'zsh', ...safeLink(src, dst) });

    // ensure .zshrc sources claude-use.zsh if not already
    if (f === 'claude-use.zsh') {
      const zshrc = join(HOME, '.zshrc');
      const marker = 'claude-use.zsh';
      try {
        const content = readFileSync(zshrc, 'utf8');
        if (!content.includes(marker)) {
          appendFileSync(zshrc,
            `\n# helpers: claude account switcher\n[ -f "$HOME/.config/claude/claude-use.zsh" ] && source "$HOME/.config/claude/claude-use.zsh"\n`
          );
          results.push({ type: 'zshrc', status: 'appended', dst: zshrc });
        }
      } catch {}
    }
  }

  // launchd → ~/Library/LaunchAgents + bootstrap
  for (const f of project.plists) {
    const src   = join(project.dir, 'launchd', f);
    const dst   = join(HOME, 'Library/LaunchAgents', f);
    const label = f.replace(/\.plist$/, '');
    const uid   = process.getuid();

    results.push({ type: 'plist', ...safeLink(src, dst) });

    // unload if already loaded, then bootstrap
    spawnSync('launchctl', ['bootout', `gui/${uid}/${label}`]);
    const boot = spawnSync('launchctl', ['bootstrap', `gui/${uid}`, dst]);
    results.push({
      type: 'launchd',
      label,
      status: boot.status === 0 ? 'loaded' : 'load-failed',
      dst,
    });
  }

  return results;
}

// ── UI components ───────────────────────────────────────────────────────────
const TICK   = '✓';
const CROSS  = '✗';
const ARROW  = '›';
const CHECK  = '◉';
const UNCHECK= '○';

function CheckList({ items, cursor, selected }) {
  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const isCursor   = i === cursor;
        const isSelected = selected.has(i);
        return (
          <Box key={item.name}>
            <Text color={isCursor ? 'cyan' : undefined}>
              {isCursor ? ARROW : ' '}{' '}
            </Text>
            <Text color={isSelected ? 'green' : 'white'}>
              {isSelected ? CHECK : UNCHECK}{' '}
            </Text>
            <Text bold={isCursor}>{item.name}</Text>
            <Text dimColor>
              {'  '}
              {[
                item.bins.length    ? `${item.bins.length} bin`    : '',
                item.zshs.length    ? `${item.zshs.length} zsh`    : '',
                item.plists.length  ? `${item.plists.length} launchd` : '',
              ].filter(Boolean).join('  ')}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function ResultLine({ r }) {
  const icon  = r.status === 'linked' || r.status === 'loaded' || r.status === 'appended'
    ? <Text color="green">{TICK}</Text>
    : r.status === 'skipped'
      ? <Text color="yellow">~</Text>
      : <Text color="red">{CROSS}</Text>;
  const label = r.label ?? basename(r.dst ?? '');
  return (
    <Box>
      {icon}
      <Text> [{r.type}] </Text>
      <Text dimColor>{label}</Text>
      <Text color="gray">  {r.status}</Text>
    </Box>
  );
}

// ── main app ────────────────────────────────────────────────────────────────
function App({ projects }) {
  const { exit } = useApp();
  const [phase,   setPhase]   = useState('select');   // select | installing | done
  const [cursor,  setCursor]  = useState(0);
  const [selected, setSelected] = useState(new Set(projects.map((_, i) => i)));
  const [results, setResults] = useState([]);

  useInput((input, key) => {
    if (phase !== 'select') return;

    if (key.upArrow)   setCursor(c => Math.max(0, c - 1));
    if (key.downArrow) setCursor(c => Math.min(projects.length - 1, c + 1));

    if (input === ' ') {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(cursor) ? next.delete(cursor) : next.add(cursor);
        return next;
      });
    }

    if (input === 'a') {
      setSelected(prev =>
        prev.size === projects.length
          ? new Set()
          : new Set(projects.map((_, i) => i))
      );
    }

    if (key.return) {
      if (selected.size === 0) { exit(); return; }
      setPhase('installing');
      const toInstall = [...selected].map(i => projects[i]);
      const allResults = [];
      for (const p of toInstall) {
        try {
          allResults.push({ project: p.name, lines: installProject(p) });
        } catch (err) {
          allResults.push({ project: p.name, lines: [{ type: 'error', status: 'error', dst: err.message }] });
        }
      }
      setResults(allResults);
      setPhase('done');
    }

    if (input === 'q' || key.escape) exit();
  });

  if (phase === 'select') {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box marginBottom={1}>
          <Text bold color="cyan">idea-nursery installer</Text>
          <Text dimColor>  ↑↓ move  space toggle  a all/none  enter install  q quit</Text>
        </Box>
        <CheckList items={projects} cursor={cursor} selected={selected} />
      </Box>
    );
  }

  if (phase === 'installing') {
    return <Text color="yellow">Installing...</Text>;
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color="green">Installation complete</Text>
      </Box>
      {results.map(({ project, lines }) => (
        <Box key={project} flexDirection="column" marginBottom={1}>
          <Text bold underline>{project}</Text>
          {lines.map((r, i) => <ResultLine key={i} r={r} />)}
        </Box>
      ))}
      <Text dimColor>Press any key to exit</Text>
    </Box>
  );
}

// ── entry ───────────────────────────────────────────────────────────────────
const projects = discoverProjects();
if (projects.length === 0) {
  console.error('No projects found in', PROJECTS);
  process.exit(1);
}

const { waitUntilExit } = render(<App projects={projects} />);
await waitUntilExit();
