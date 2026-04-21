# Contributing

Contributions are welcome! This is Joe Black's personal Claude Code plugin collection. PRs should improve existing plugins or the marketplace infrastructure.

## What We Accept

- Bug fixes and improvements to existing plugins
- Plugin version bumps in `marketplace.json`
- Documentation improvements
- Infrastructure / CI improvements (workflows, schema, site)

## What We Don't Accept

- New plugins from other authors — each plugin lives in its own repo. Want to list your plugin? [Open a discussion](https://github.com/joeblackwaslike/agent-marketplace/discussions).

## Development Setup

```bash
git clone https://github.com/joeblackwaslike/agent-marketplace.git
cd agent-marketplace/site
npm install
npm run dev      # dev server at http://localhost:5173
npm test         # run catalog unit tests
```

## Submitting a PR

1. Fork the repo
2. Create a branch: `git checkout -b fix/your-fix`
3. Make your changes
4. Run `cd site && npm test` (if touching `catalog.js`)
5. Run `npx prettier --write "**/*.json" --ignore-path .gitignore` to format JSON
6. Open a PR — the template will guide you

## Bumping a Plugin Version

Edit `.claude-plugin/marketplace.json`, update the `version` field for the relevant plugin, and submit a PR. CI will verify the source URL still resolves.
