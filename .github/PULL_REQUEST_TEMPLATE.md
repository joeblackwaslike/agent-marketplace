## What does this PR do?

<!-- Brief description of the change -->

## Type of change

- [ ] Bug fix in an existing plugin
- [ ] Plugin version update in `marketplace.json`
- [ ] Documentation improvement
- [ ] Infrastructure / CI improvement
- [ ] Other (describe below)

## Checklist

- [ ] JSON files pass formatting (`npx prettier --check "**/*.json" --ignore-path .gitignore`)
- [ ] `marketplace.json` validates against schema (`npx ajv-cli validate -s schemas/marketplace.schema.json -d .claude-plugin/marketplace.json --spec=draft7`)
- [ ] Site tests pass if applicable (`cd site && npm test`)
