#!/bin/bash
# Installs the daily Klang calendar reminder on this Mac (a launchd agent, no admin rights needed).
# It runs klang_check.py at 08:30 (after GitHub's 05:23 update) and again at 18:30 as a reminder;
# it only shows a pop-up when something is wrong. Remove it with: install.sh --uninstall
set -euo pipefail
LABEL="ch.klang.calendar-check"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
SCRIPT="$(cd "$(dirname "$0")" && pwd)/klang_check.py"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
if [ "${1:-}" = "--uninstall" ]; then rm -f "$PLIST"; echo "Removed $LABEL"; exit 0; fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/usr/bin/python3</string><string>$SCRIPT</string></array>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>30</integer></dict>
    <dict><key>Hour</key><integer>18</integer><key>Minute</key><integer>30</integer></dict>
  </array>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/klang-calendar-check.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/klang-calendar-check.log</string>
</dict>
</plist>
EOF
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "Installed $LABEL: checks at 08:30 and 18:30 ($SCRIPT)"
