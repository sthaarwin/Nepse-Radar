#!/usr/bin/env bash
# ==============================================================================
# NepseRadar - Security-Hardened Deployment for Oracle Cloud Free Tier
# Supports: Ubuntu 20.04/22.04/24.04 & Oracle Linux 8/9 (x86 & ARM Ampere)
# ==============================================================================

set -e

echo "=================================================="
echo "  Deploying Hardened NepseRadar on Oracle Cloud"
echo "=================================================="

APP_DIR="/opt/nepseradar"
PORT=8000

# 1. Require root / sudo
if [ "$EUID" -ne 0 ]; then
  echo "[!] Please run with sudo: sudo bash deploy_oracle.sh"
  exit 1
fi

# 2. Create isolated non-root system user
echo "[*] Creating dedicated system user 'nepseradar'..."
if ! id -u nepseradar &>/dev/null; then
  useradd -r -s /bin/false -d ${APP_DIR} nepseradar
fi

# 3. Configure firewall
echo "[*] Configuring firewall for port ${PORT}..."
if command -v iptables &> /dev/null; then
  iptables -I INPUT 6 -m state --state NEW -p tcp --dport ${PORT} -j ACCEPT || true
  iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
fi

if command -v ufw &> /dev/null; then
  ufw allow ${PORT}/tcp || true
fi

# 4. Install dependencies
echo "[*] Installing Python & system packages..."
if command -v apt-get &> /dev/null; then
  apt-get update -y
  apt-get install -y python3 python3-pip python3-venv git curl openssl
elif command -v dnf &> /dev/null; then
  dnf install -y python3 python3-pip git curl openssl
fi

# 5. Copy project files
echo "[*] Setting up application in ${APP_DIR}..."
mkdir -p ${APP_DIR}
cp -r ./* ${APP_DIR}/
cd ${APP_DIR}

# 6. Generate secure .env if not present
if [ ! -f .env ]; then
  SEC_KEY=$(openssl rand -hex 16)
  echo "[*] Generated secure API Secret Key: ${SEC_KEY}"
  cat << EOF > .env
API_KEY=${SEC_KEY}
HOST=0.0.0.0
PORT=${PORT}
REFRESH_INTERVAL_MINUTES=10
RATE_LIMIT_PER_MINUTE=120
REFRESH_COOLDOWN_SECONDS=30
EOF
fi

# 7. Create Virtual Environment
echo "[*] Creating Python virtual environment..."
python3 -m venv venv
./venv/bin/pip install --upgrade pip
./venv/bin/pip install -r requirements.txt
./venv/bin/pip install -e .

# 8. Run initial data ingestion
echo "[*] Performing initial NEPSE data ingestion..."
PYTHONPATH=. ./venv/bin/python -m nepse_alert.cli ingest

# 9. Enforce restrictive file permissions
echo "[*] Enforcing security file permissions..."
chown -R nepseradar:nepseradar ${APP_DIR}
chmod 700 ${APP_DIR}/data
chmod 600 ${APP_DIR}/.env 2>/dev/null || true

# 10. Create hardened systemd 24/7 service (non-root execution)
echo "[*] Setting up hardened systemd service..."
cat << EOF > /etc/systemd/system/nepseradar.service
[Unit]
Description=NepseRadar 24/7 Backend API & Scheduler
After=network.target

[Service]
Type=simple
User=nepseradar
Group=nepseradar
WorkingDirectory=${APP_DIR}
Environment="PYTHONPATH=${APP_DIR}"
Environment="HOST=0.0.0.0"
Environment="PORT=${PORT}"
ExecStart=/bin/sh -c '${APP_DIR}/venv/bin/python -m nepse_alert.cli ingest && (${APP_DIR}/venv/bin/python -m nepse_alert.cli scheduler &) && ${APP_DIR}/venv/bin/python -m nepse_alert.cli serve'
Restart=always
RestartSec=10

# Security sandboxing
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nepseradar
systemctl restart nepseradar

PUBLIC_IP=$(curl -s https://ifconfig.me || echo "<YOUR_ORACLE_PUBLIC_IP>")
LOADED_KEY=$(grep -E "^API_KEY=" .env | cut -d '=' -f 2 || echo "")

echo ""
echo "=================================================="
echo "  NepseRadar Deployed & Hardened Successfully!"
echo "=================================================="
echo "API URL:            http://${PUBLIC_IP}:${PORT}"
echo "Health Check:       http://${PUBLIC_IP}:${PORT}/health"
echo "Your API Key:       ${LOADED_KEY}"
echo ""
echo "CLOUDFLARE TUNNEL (Zero Open Ports & Free HTTPS):"
echo "  To enable free Cloudflare Tunnel encryption:"
echo "  sudo bash setup_tunnel.sh"
echo ""
echo "IMPORTANT: In your mobile app Settings tab:"
echo "  1. Server URL: http://${PUBLIC_IP}:${PORT} (or your Cloudflare Tunnel HTTPS URL)"
echo "  2. API Key:    ${LOADED_KEY}"
echo ""
echo "Service status: sudo systemctl status nepseradar"
echo "View live logs: sudo journalctl -u nepseradar -f"
echo "=================================================="
