#!/usr/bin/env bash
set -euo pipefail
base_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
worktree=$(realpath -- "$1")
output=$2
export GIT_CONFIG_COUNT=4
export GIT_CONFIG_KEY_0=filter.lfs.clean GIT_CONFIG_VALUE_0='git-lfs clean -- %f'
export GIT_CONFIG_KEY_1=filter.lfs.smudge GIT_CONFIG_VALUE_1='git-lfs smudge -- %f'
export GIT_CONFIG_KEY_2=filter.lfs.process GIT_CONFIG_VALUE_2='git-lfs filter-process'
export GIT_CONFIG_KEY_3=filter.lfs.required GIT_CONFIG_VALUE_3=true
export LOCALAPPDATA="$base_dir/local-app-data/$output"
export MILIASTRA_ALLOW_LIVE_WRITE=0
export MILIASTRA_SAVE_ROOTS='[]'
export MILIASTRA_MCP_ROOT="$base_dir/mcp"
cd "$worktree"
npm run build:native -- "$base_dir/base/native-experiment-base.gil" "build/$output" --release-candidate
