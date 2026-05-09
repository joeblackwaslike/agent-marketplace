-- brightness-knob: intercept HID brightness keys → lunar ddc
-- Wires a rotary pad (or any device emitting HID brightness up/down) to
-- directly drive external monitors via lunar's DDC interface, bypassing
-- Lunar's own key interception which doesn't work in clamshell/no-builtin setups.

local M = {}

local lunar  = "/Users/joe/.local/bin/lunar"
local STEP   = 6
local current = 50
local pending = false

local function applyBrightness()
  if pending then return end
  pending = true
  hs.task.new(lunar, function() pending = false end,
    {"ddc", "all", "BRIGHTNESS", tostring(current)}):start()
end

local function setBrightness(delta)
  current = math.max(0, math.min(100, current + delta))
  applyBrightness()
end

M.watcher = hs.eventtap.new({hs.eventtap.event.types.systemDefined}, function(e)
  local data = e:systemKey()
  if data.key == "BRIGHTNESS_UP" and not data.down then
    setBrightness(STEP); return true
  elseif data.key == "BRIGHTNESS_DOWN" and not data.down then
    setBrightness(-STEP); return true
  end
end)

M.watcher:start()

return M
