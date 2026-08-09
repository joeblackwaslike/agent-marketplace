# List available recipes
default:
  @just --list

# Install dependencies and set up hooks
install:
  pnpm install

# Run all quality checks
check:
  pnpm typecheck && pnpm lint

# Run tests
test:
  pnpm test

# Run tests with coverage
test-coverage:
  pnpm test:coverage

# Build the project
build:
  pnpm build

# Clean build output
clean:
  rm -rf dist coverage

# Build and publish to npm
release: build
  pnpm publish

# Start docs dev server
docs:
  pnpm docs:start

# Build docs
docs-build:
  pnpm docs:build

# Serve built docs locally
docs-serve:
  pnpm docs:serve

# Clear Docusaurus cache
docs-clear:
  pnpm docs:clear

# Check for unused dependencies
deps:
  pnpm depcheck
