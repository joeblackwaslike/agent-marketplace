# claude-switcher

`cu` — switch Claude Code account profiles in the current shell, or set the
global default used by the VS Code extension and other non-shell invocations.

## Usage

```zsh
cu                     # list profiles (default)
cu 1 / cu pri          # load primary account (exports env + persists to settings.json)
cu 2 / cu sec          # load secondary
cu g / cu gcp          # load vertex (GCP)
cu ls                  # list profiles; marks the currently-persisted one with ▶
cu which               # show shell profile and persisted (settings.json) profile
cu clear               # unset all Claude env vars from shell
cu help                # show usage
```

Switching a profile writes env vars into **both** `~/.claude/settings.json` and VS Code
Insiders' `claudeCode.environmentVariables`, so the extension picks it up after a window
reload (⌘⇧P → Developer: Reload Window).

## Installation

Managed by the helpers installer. Manually:

```zsh
ln -s "$(pwd)/zsh/claude-use.zsh" ~/.config/claude/claude-use.zsh
# ensure ~/.zshrc sources it:
echo '[ -f "$HOME/.config/claude/claude-use.zsh" ] && source "$HOME/.config/claude/claude-use.zsh"' >> ~/.zshrc
```

## Profiles

Profiles live in `~/.config/claude/accounts/<name>.env` — **not committed**.
Format:

```bash
CLAUDE_ACCOUNT_LABEL="primary (me@example.com)"
CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..."
```
