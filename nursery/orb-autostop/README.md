# orb-autostop

Two-part system for on-demand OrbStack/Docker management:

- **`bin/orb-autostop`** — bash script run every 5 min by launchd; stops OrbStack
  after 15 min of idle (no running containers, no socket clients, no dev servers)
- **`zsh/docker.plugin.zsh`** — oh-my-zsh custom plugin; wraps the `docker` command
  to lazy-start OrbStack on first use if it isn't running
- **`launchd/com.joeblack.orb-autostop.plist`** — runs `orb-autostop` on a 5-min timer

## Installation

Managed by the helpers installer. Manually:

```zsh
# bin
ln -s "$(pwd)/bin/orb-autostop" /usr/local/bin/orb-autostop

# zsh plugin (oh-my-zsh)
ln -s "$(pwd)/zsh/docker.plugin.zsh" ~/.oh-my-zsh/custom/plugins/docker/docker.plugin.zsh
# ensure 'docker' is in plugins=(...) in ~/.zshrc

# launchd
ln -s "$(pwd)/launchd/com.joeblack.orb-autostop.plist" ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.joeblack.orb-autostop.plist
```
