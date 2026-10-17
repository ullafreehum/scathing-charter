#!/usr/bin/env bash
# The Scathing Charter launcher for macOS / Linux: installs on first run, then opens the game.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get the LTS version from https://nodejs.org and run ./play.sh again."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "First launch: downloading the game's parts (1-3 minutes)..."
  npm install || { echo "Install failed - see 'If something goes wrong' in README.md"; exit 1; }
fi
echo "Starting the game. Your browser will open; if not, go to http://localhost:5173"
echo "Keep this terminal open while you play. Press Ctrl+C to stop."
npm start
