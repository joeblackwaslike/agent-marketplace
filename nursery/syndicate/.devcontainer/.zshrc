# If you come from bash you might have to change your $PATH.
# export PATH=$HOME/bin:$HOME/.local/bin:/usr/local/bin:$PATH

# Path to your Oh My Zsh installation.
export ZSH="$HOME/.oh-my-zsh"

# Set name of the theme to load --- if set to "random", it will
# load a random theme each time Oh My Zsh is loaded, in which case,
# to know which specific one was loaded, run: echo $RANDOM_THEME
# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="devcontainers"

# Set list of themes to pick from when loading at random
# Setting this variable when ZSH_THEME="devcontainers"
# a theme from this variable instead of looking in $ZSH/themes/
# If set to an empty array, this variable will have no effect.
# ZSH_THEME_RANDOM_CANDIDATES=( "robbyrussell" "agnoster" )

# Uncomment the following line to use case-sensitive completion.
# CASE_SENSITIVE="true"

# Uncomment the following line to use hyphen-insensitive completion.
# Case-sensitive completion must be off. _ and - will be interchangeable.
HYPHEN_INSENSITIVE="true"

# Uncomment one of the following lines to change the auto-update behavior
zstyle ':omz:update' mode disabled  # disable automatic updates
# zstyle ':omz:update' mode auto      # update automatically without asking
# zstyle ':omz:update' mode reminder  # just remind me to update when it's time

# Uncomment the following line to change how often to auto-update (in days).
# zstyle ':omz:update' frequency 13

# Uncomment the following line if pasting URLs and other text is messed up.
# DISABLE_MAGIC_FUNCTIONS="true"

# Uncomment the following line to disable colors in ls.
# DISABLE_LS_COLORS="true"

# Uncomment the following line to disable auto-setting terminal title.
# DISABLE_AUTO_TITLE="true"

# Uncomment the following line to enable command auto-correction.
# ENABLE_CORRECTION="true"

# Uncomment the following line to display red dots whilst waiting for completion.
# You can also set it to another string to have that shown instead of the default red dots.
# e.g. COMPLETION_WAITING_DOTS="%F{yellow}waiting...%f"
# Caution: this setting can cause issues with multiline prompts in zsh < 5.7.1 (see #5765)
# COMPLETION_WAITING_DOTS="true"

# Uncomment the following line if you want to disable marking untracked files
# under VCS as dirty. This makes repository status check for large repositories
# much, much faster.
DISABLE_UNTRACKED_FILES_DIRTY="true"

# Uncomment the following line if you want to change the command execution time
# stamp shown in the history command output.
# You can set one of the optional three formats:
# "mm/dd/yyyy"|"dd.mm.yyyy"|"yyyy-mm-dd"
# or set a custom format using the strftime function format specifications,
# see 'man strftime' for details.
# HIST_STAMPS="mm/dd/yyyy"

# Would you like to use another custom folder than $ZSH/custom?
# ZSH_CUSTOM=/path/to/new-custom-folder

# cut loading time in half
DISABLE_MAGIC_FUNCTIONS="true"
DISABLE_COMPFIX="true"

ZSH_AUTOSUGGEST_BUFFER_MAX_SIZE="20"
ZSH_AUTOSUGGEST_USE_ASYNC=1

# Which plugins would you like to load?
# Standard plugins can be found in $ZSH/plugins/
# Custom plugins may be added to $ZSH_CUSTOM/plugins/
# Example format: plugins=(rails git textmate ruby lighthouse)
# Add wisely, as too many plugins slow down shell startup.
plugins=(
    eza
    asdf
    git
)

# eza config
zstyle ':omz:plugins:eza' 'dirs-first' yes
zstyle ':omz:plugins:eza' 'git-status' yes
zstyle ':omz:plugins:eza' 'header' yes
zstyle ':omz:plugins:eza' 'icons' yes
zstyle ':omz:plugins:eza' 'hyperlink' yes

# Skip compaudit check - speeds up compinit
skip_global_compinit=1

# Load compinit with cache checking (once per day)
autoload -Uz compinit
if [[ -n ${ZDOTDIR:-$HOME}/.zcompdump(#qNmh+24) ]]; then
  	compinit
else
  	compinit -C
fi

if [[ -o interactive ]]; then
	source $ZSH/oh-my-zsh.sh
fi

# User configuration
export MANPATH="/usr/local/man:$MANPATH"
export LANG=en_US.UTF-8

# moor pager (mirrors local macOS settings)
if command -v moor >/dev/null 2>&1; then
    export MOOR='-no-clear-on-exit -quit-if-one-screen -reformat -tab-size 4'
    export PAGER=moor
    export MANPAGER=moor
fi

# Claude Code
export ENABLE_EXPERIMENTAL_MCP_CLI=true
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1

# in-container claude runs without permission prompts
alias claude='claude --dangerously-skip-permissions'

# opencode
export OPENCODE_AGENT_SKILLS_SUPERPOWERS_MODE=true

if command -v eza >/dev/null 2>&1; then
    alias ls='eza --long --all -g --git --sort name --group --group-directories-first --icons'
fi

# fzf key bindings + completion
[ -f /usr/share/doc/fzf/examples/key-bindings.zsh ]  && source /usr/share/doc/fzf/examples/key-bindings.zsh
[ -f /usr/share/doc/fzf/examples/completion.zsh ]     && source /usr/share/doc/fzf/examples/completion.zsh

# zsh shortcuts
alias reload='source ~/.zshrc'

# pnpm
alias pn=pnpm

if [[ -o interactive ]]; then
    eval "$(oh-my-posh init zsh --config ~/.mytheme.omp.yaml)"
fi

set -aU path

# source optional runtime env files installed by asdf
set -aU includes
includes=(
    "${ASDF_DATA_DIR:-/home/vscode/.asdf}/installs/rust/stable/env"
    "${ASDF_DATA_DIR:-/home/vscode/.asdf}/installs/gcloud/"*".0.0/path.zsh.inc"
    "${ASDF_DATA_DIR:-/home/vscode/.asdf}/installs/gcloud/"*".0.0/completion.zsh.inc"
)

for file in $includes; do
    [[ -f $file ]] && . $file
done
