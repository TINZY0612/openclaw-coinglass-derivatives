#!/usr/bin/env bash
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Please run as root: sudo bash scripts/install-systemd.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVICE_PATH="/etc/systemd/system/coinglass-derivatives.service"
TIMER_PATH="/etc/systemd/system/coinglass-derivatives.timer"

cat > "$SERVICE_PATH" <<EOF
[Unit]
Description=Fetch public Coinglass derivatives data for crypto daily report
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
WorkingDirectory=${SKILL_DIR}
Environment=COINGLASS_OUTPUT_DIR=/data/coinglass
ExecStart=/usr/bin/env node ${SKILL_DIR}/scripts/fetch-coinglass.mjs
User=${SUDO_USER:-root}
Group=${SUDO_USER:-root}

[Install]
WantedBy=multi-user.target
EOF

cat > "$TIMER_PATH" <<EOF
[Unit]
Description=Run Coinglass derivatives fetcher daily before Asia morning report

[Timer]
OnCalendar=*-*-* 23:50:00 UTC
Persistent=true
Unit=coinglass-derivatives.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload
systemctl enable --now coinglass-derivatives.timer

echo "Installed and enabled coinglass-derivatives.timer"
echo "Check with: systemctl list-timers coinglass-derivatives.timer"
echo "Manual run: systemctl start coinglass-derivatives.service"
