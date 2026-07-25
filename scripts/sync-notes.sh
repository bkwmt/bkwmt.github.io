#!/usr/bin/env bash
# 從 research_library 同步導讀（唯一權威資料源）到 src/content/notes/ 並注入 frontmatter。
set -euo pipefail

SRC="$HOME/Developer/research_library/Nick Crossley/notes"
DEST="$(cd "$(dirname "$0")/.." && pwd)/src/content/notes"
mkdir -p "$DEST"

sync_one() {
  local file="$1" slug="$2" title="$3" source="$4" year="$5" order="$6"
  if [[ ! -f "$SRC/$file" ]]; then
    echo "WARN: 找不到 $SRC/$file，跳過" >&2
    return 0
  fi
  {
    printf -- '---\n'
    printf 'title: "%s"\n' "$title"
    printf 'source: "%s"\n' "$source"
    printf 'year: %s\n' "$year"
    printf 'order: %s\n' "$order"
    printf -- '---\n\n'
    cat "$SRC/$file"
  } > "$DEST/$slug.md"
  echo "synced: $file -> $slug.md"
}

sync_one "2008_Crossley_Pretty-Connected_導讀.md" "2008-pretty-connected" \
  "Pretty Connected：早期英國 punk 的社會網絡" \
  "Crossley (2008), Theory, Culture & Society 25(6): 89–116" 2008 1
sync_one "2015_SNMW-Ch1_Introduction_導讀.md" "2015-snmw-ch1" \
  "SNMW Ch1：Introduction" \
  "Crossley, McAndrew & Widdop (eds.) (2015), Social Networks and Music Worlds, Ch. 1" 2015 2
sync_one "2015_SNMW-Ch2_What-is-SNA_導讀.md" "2015-snmw-ch2" \
  "SNMW Ch2：什麼是社會網絡分析" \
  "Crossley, McAndrew & Widdop (eds.) (2015), Social Networks and Music Worlds, Ch. 2" 2015 3
