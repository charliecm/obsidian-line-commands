#!/usr/bin/env bash
PLUGIN_ID=$(node -p "require('./manifest.json').id")
VAULT="$1"

install_to() {
  local TARGET="$1"
  local BASE="$2"
  if [[ ! -d "$BASE" ]]; then
    echo "Skipping $BASE (folder does not exist)"
    return
  fi
  mkdir -p "$TARGET"
  rm -f "$TARGET/main.js" "$TARGET/manifest.json" "$TARGET/styles.css"
  if [[ $3 == "-d" ]]; then
    ln -s "$(pwd)/main.js" "$TARGET"
    ln -s "$(pwd)/manifest.json" "$TARGET"
    echo Linked plugin files to "$TARGET"
  else
    cp -f main.js manifest.json "$TARGET"
    echo Installed plugin files to "$TARGET"
  fi
}

if [[ -d "$VAULT/.obsidian" ]]; then
  npm run build
fi

install_to "$VAULT/.obsidian/plugins/$PLUGIN_ID" "$VAULT/.obsidian" "$2"

obsidian plugin:reload id=$PLUGIN_ID
