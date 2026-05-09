# brightness-knob

Hammerspoon module that wires a rotary pad (or any HID brightness up/down device) to directly control external monitor brightness via Lunar's DDC interface.

## Problem it solves

Lunar's built-in brightness key interception fails in clamshell mode on MacBook Pro (no active built-in display = Sync mode has no source). The HID events never reach Lunar's DDC path. This module intercepts them at the Hammerspoon level and calls `lunar ddc` directly.

## Files

- **`hammerspoon/brightness-knob.lua`** — Hammerspoon module; symlinked to `~/.hammerspoon/`

## Requirements

- [Hammerspoon](https://www.hammerspoon.org/) installed and running
- [Lunar Pro](https://lunar.fyi/) with `lunar` CLI on PATH at `/Users/joe/.local/bin/lunar`
- External monitors with DDC/CI support

## Installation

Managed by the nursery installer. Manually:

```zsh
ln -s "$(pwd)/hammerspoon/brightness-knob.lua" ~/.hammerspoon/brightness-knob.lua
echo "require('brightness-knob')" >> ~/.hammerspoon/init.lua
```

## Configuration

Edit `STEP` in `brightness-knob.lua` to change brightness increment per knob tick (default: 6).
