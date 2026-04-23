# cu: switch Claude Code account profile.
#
# Usage:
#   cu                     # list profiles (default)
#   cu <profile>           # load profile: exports env vars + persists to settings.json
#   cu <profile> <args...> # load profile AND launch claude with args
#   cu ls                  # list profiles; marks the currently-persisted one with ▶
#   cu which               # show current active profile
#   cu clear               # clear Claude-related env vars from current shell
#   cu help                # show this help
#
# Aliases: list → ls  |  1/pri → primary  |  2/sec → secondary  |  g/gcp → vertex
#
# Profiles live in ~/.config/claude/accounts/<profile>.env
#
# Switching a profile always writes the relevant vars into ~/.claude/settings.json
# AND into VS Code Insiders' claudeCode.environmentVariables, so the extension and
# any non-shell CC invocation picks it up immediately.
# For Vertex profiles, all Vertex env vars are written; OAuth keys are cleared.
# For OAuth profiles, the token is written; Vertex env vars are cleared.

export CLAUDE_ACCOUNTS_DIR="${CLAUDE_ACCOUNTS_DIR:-$HOME/.config/claude/accounts}"

_cu_settings="$HOME/.claude/settings.json"
_cu_vscode_settings="$HOME/Library/Application Support/Code - Insiders/User/settings.json"

# Keys owned by cu — managed in both settings.json and VS Code settings
_CU_VERTEX_KEYS=(
  CLAUDE_CODE_USE_VERTEX
  ANTHROPIC_VERTEX_PROJECT_ID
  CLOUD_ML_REGION
  VERTEX_REGION_CLAUDE_4_6_SONNET
  VERTEX_REGION_CLAUDE_4_6_HAIKU
  VERTEX_REGION_CLAUDE_4_6_OPUS
  ANTHROPIC_MODEL
  API_TIMEOUT_MS
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
)
_CU_OAUTH_KEYS=(CLAUDE_CODE_OAUTH_TOKEN)

_claude_use_clear_env() {
  unset CLAUDE_ACCOUNT_LABEL
  unset CLAUDE_CODE_OAUTH_TOKEN
  unset CLAUDE_CODE_USE_VERTEX
  unset ANTHROPIC_VERTEX_PROJECT_ID
  unset CLOUD_ML_REGION
  unset ANTHROPIC_MODEL
  unset VERTEX_REGION_CLAUDE_4_6_SONNET
  unset VERTEX_REGION_CLAUDE_4_6_HAIKU
  unset VERTEX_REGION_CLAUDE_4_6_OPUS
  unset API_TIMEOUT_MS
  unset CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
}

# Write env vars into ~/.claude/settings.json using jq.
# $1: JSON object of key→value to set
# $2: JSON array of key names to clear first
_cu_persist_settings() {
  local set_json="$1"
  local clear_json="$2"
  local result
  result=$(jq --argjson s "$set_json" --argjson c "$clear_json" '
    .env //= {} |
    reduce $c[] as $k (.; del(.env[$k])) |
    reduce ($s | to_entries[]) as $e (.; .env[$e.key] = $e.value)
  ' "$_cu_settings") || { echo "cu: failed to update settings.json" >&2; return 1; }
  printf '%s\n' "$result" > "$_cu_settings"
}

# Write env vars into VS Code Insiders' claudeCode.environmentVariables.
# Parses JSONC (strips // comments and trailing commas), modifies the array, writes valid JSON.
# $1: JSON object of key→value to set
# $2: JSON array of key names to clear first
_cu_persist_vscode_env() {
  local set_json="$1"
  local clear_json="$2"
  [[ -f "$_cu_vscode_settings" ]] || return 0
  SET_JSON="$set_json" CLEAR_JSON="$clear_json" VSCODE_PATH="$_cu_vscode_settings" node -e "
    const fs = require('fs');
    const path = process.env.VSCODE_PATH;
    let raw = fs.readFileSync(path, 'utf8');
    raw = raw.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    raw = raw.replace(/,(\s*[}\]])/g, '\$1');
    const s = JSON.parse(raw);
    const clearKeys = JSON.parse(process.env.CLEAR_JSON);
    const toSet = JSON.parse(process.env.SET_JSON);
    let envVars = s['claudeCode.environmentVariables'] || [];
    envVars = envVars.filter(e => !clearKeys.includes(e.name));
    for (const [name, value] of Object.entries(toSet)) {
      if (value) envVars.push({ name, value });
    }
    s['claudeCode.environmentVariables'] = envVars;
    fs.writeFileSync(path, JSON.stringify(s, null, 4));
  " || { echo "cu: warning: could not update VS Code Insiders settings" >&2; return 1; }
}

# Determine which profile is currently persisted in settings.json.
# Returns "vertex", the OAuth token string, or "" for none.
_cu_active_profile() {
  jq -r '
    .env //= {} |
    if .env.CLAUDE_CODE_USE_VERTEX == "1" then "vertex"
    elif (.env.CLAUDE_CODE_OAUTH_TOKEN // "") != "" then .env.CLAUDE_CODE_OAUTH_TOKEN
    else ""
    end
  ' "$_cu_settings" 2>/dev/null || echo ""
}

cu() {
  local cmd="$1"
  shift 2>/dev/null

  case "$cmd" in
    "")
      cu ls
      return
      ;;
    help|-h|--help)
      awk 'NR>1 && /^[^#]/{exit} NR>1{sub(/^# ?/,""); print}' "$HOME/.config/claude/claude-use.zsh"
      return 0
      ;;
    list)
      cu ls "$@"
      return
      ;;
    ls)
      {
        setopt LOCAL_OPTIONS NO_XTRACE NO_VERBOSE
        local active_marker name label is_active prof_token
        active_marker="$(_cu_active_profile)"
        printf "\033[2mProfiles in %s\033[0m\n\n" "$CLAUDE_ACCOUNTS_DIR"
        for f in "$CLAUDE_ACCOUNTS_DIR"/*.env(N); do
          name="${f:t:r}"
          is_active=0
          label="$(grep -m1 "^CLAUDE_ACCOUNT_LABEL=" "$f" 2>/dev/null | sed -E 's/^[^=]*="?([^"]*)"?$/\1/')"
          if [[ "$name" == "vertex" && "$active_marker" == "vertex" ]]; then
            is_active=1
          elif [[ "$name" != "vertex" ]]; then
            prof_token="$(grep "^CLAUDE_CODE_OAUTH_TOKEN=" "$f" 2>/dev/null | sed -E 's/^[^=]*="?([^"]*)"?$/\1/')"
            [[ -n "$prof_token" && "$prof_token" == "$active_marker" ]] && is_active=1
          fi
          if (( is_active )); then
            printf "\033[1;32m▶ %-11s\033[0m  %s\n" "$name" "${label:-(no label)}"
          else
            printf "  \033[2m%-11s\033[0m  %s\n" "$name" "${label:-(no label)}"
          fi
        done
        echo
      } 2>/dev/null
      return 0
      ;;
    which)
      if [ -n "$CLAUDE_ACCOUNT_LABEL" ]; then
        echo "Shell: $CLAUDE_ACCOUNT_LABEL"
      else
        echo "Shell: no profile loaded"
      fi
      local active_marker
      active_marker="$(_cu_active_profile)"
      if [ "$active_marker" = "vertex" ]; then
        echo "Persisted (settings.json): vertex"
      elif [ -n "$active_marker" ]; then
        local found_label=""
        for f in "$CLAUDE_ACCOUNTS_DIR"/*.env(N); do
          local t
          t=$(grep "^CLAUDE_CODE_OAUTH_TOKEN=" "$f" 2>/dev/null | sed -E 's/^[^=]*="?([^"]*)"?$/\1/')
          if [ "$t" = "$active_marker" ]; then
            found_label=$(grep -m1 "^CLAUDE_ACCOUNT_LABEL=" "$f" 2>/dev/null | sed -E "s/^[^=]*=\"?([^\"]*)\"?$/\1/")
            break
          fi
        done
        echo "Persisted (settings.json): ${found_label:-unknown}"
      else
        echo "Persisted (settings.json): none"
      fi
      return 0
      ;;
    clear)
      _claude_use_clear_env
      echo "Cleared Claude env vars from this shell."
      echo "Note: settings.json is unchanged — use 'cu <profile>' to switch the persisted profile."
      return 0
      ;;
  esac

  # Resolve short aliases to canonical profile names
  local -A _cu_aliases=(
    [1]=primary   [pri]=primary
    [2]=secondary [sec]=secondary
    [g]=vertex    [gcp]=vertex
  )
  [ -n "${_cu_aliases[$cmd]}" ] && cmd="${_cu_aliases[$cmd]}"

  local profile="$cmd"
  local env_file="$CLAUDE_ACCOUNTS_DIR/$profile.env"

  if [ ! -f "$env_file" ]; then
    echo "cu: no such profile: $profile" >&2
    echo "Available profiles:" >&2
    cu ls >&2
    return 1
  fi

  # Permission sanity check
  local perms
  perms=$(stat -f "%Lp" "$env_file" 2>/dev/null)
  if [ "$perms" != "600" ]; then
    echo "claude-use: warning: $env_file has mode $perms, expected 600" >&2
    echo "           Fix with: chmod 600 $env_file" >&2
  fi

  _claude_use_clear_env

  # Parse env file into associative array
  local -A _cu_env=()
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in ""|\#*) continue ;; esac
    if [[ "$line" =~ ^([A-Z_][A-Z0-9_]*)=\"?([^\"]*)\"?$ ]]; then
      _cu_env["${match[1]}"]="${match[2]}"
    fi
  done < "$env_file"

  # Export all parsed vars into current shell
  local _k _v
  for _k in "${(k)_cu_env[@]}"; do
    _v="${_cu_env[$_k]}"
    eval "export ${_k}=\"\$_v\""
  done

  # Guard against placeholder tokens
  if [[ "$CLAUDE_CODE_OAUTH_TOKEN" == REPLACE_ME* ]]; then
    echo "cu: profile $profile still has a placeholder token" >&2
    echo "           Edit $env_file and paste the real token." >&2
    return 1
  fi
  if [[ "$ANTHROPIC_VERTEX_PROJECT_ID" == REPLACE_ME* || "$CLOUD_ML_REGION" == REPLACE_ME* ]]; then
    echo "cu: profile $profile still has placeholder Vertex values" >&2
    echo "           Edit $env_file and paste the real project/region." >&2
    return 1
  fi

  # Build JSON payloads: always clear ALL managed keys first, then set this profile's vars.
  local set_json clear_json
  clear_json=$(jq -n '$ARGS.positional' --args "${_CU_VERTEX_KEYS[@]}" "${_CU_OAUTH_KEYS[@]}")

  if [ "$profile" = "vertex" ]; then
    set_json='{}'
    for k in "${_CU_VERTEX_KEYS[@]}"; do
      [[ -n "${_cu_env[$k]}" ]] || continue
      set_json=$(jq --arg k "$k" --arg v "${_cu_env[$k]}" '. + {($k): $v}' <<< "$set_json")
    done
  else
    set_json=$(jq -n --arg t "${_cu_env[CLAUDE_CODE_OAUTH_TOKEN]}" '{"CLAUDE_CODE_OAUTH_TOKEN": $t}')
  fi

  _cu_persist_settings "$set_json" "$clear_json" || return 1
  _cu_persist_vscode_env "$set_json" "$clear_json"

  echo "Loaded + persisted: $CLAUDE_ACCOUNT_LABEL"
  if [ "$profile" = "vertex" ]; then
    echo "→ Reload VS Code window to apply (⌘⇧P → Developer: Reload Window)"
  fi

  # If extra args given, launch claude with them now.
  if [ $# -gt 0 ]; then
    if [ "$profile" = "vertex" ]; then
      command claude --bare "$@"
    else
      command claude "$@"
    fi
  fi
}

# Completion
if [ -n "$ZSH_VERSION" ]; then
  _claude_use_complete() {
    local -a profiles
    profiles=(ls list which clear help 1 2 g pri sec gcp)
    for f in "$CLAUDE_ACCOUNTS_DIR"/*.env(N); do
      profiles+=("${f:t:r}")
    done
    compadd -a profiles
  }
  compdef _claude_use_complete cu 2>/dev/null
fi
