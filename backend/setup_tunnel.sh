#!/usr/bin/env bash
# ==============================================================================
# NepseRadar - Automated Cloudflare Tunnel Setup for Oracle Cloud
# Supports: x86_64 (AMD) & aarch64 (ARM Ampere) instances
# Benefits:
#   • 100% Free HTTPS / SSL encryption
#   • ZERO open firewall ports required on Oracle Cloud
#   • Hides your server's public IP from internet scanners
# ==============================================================================

set -e

echo "=================================================="
echo "    NepseRadar - Cloudflare Tunnel Installer"
echo "=================================================="

if [ "$EUID" -ne 0 ]; then
  echo "[!] Please run with sudo: sudo bash setup_tunnel.sh"
  exit 1
fi

LOCAL_PORT=8000

# 1. Detect CPU Architecture (AMD x86_64 vs ARM Ampere aarch64)
ARCH=$(uname -m)
echo "[*] Detected Architecture: ${ARCH}"

if [ "$ARCH" = "x86_64" ]; then
  CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
  CLOUDFLARED_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
else
  echo "[!] Unsupported architecture: ${ARCH}"
  exit 1
fi

# 2. Download and install cloudflared binary
echo "[*] Downloading cloudflared..."
curl -fsSL -o /usr/local/bin/cloudflared "${CLOUDFLARED_URL}"
chmod +x /usr/local/bin/cloudflared

echo "[*] cloudflared version: $(/usr/local/bin/cloudflared --version)"

# 3. Check if user provided a permanent Cloudflare Tunnel Token
CLOUDFLARE_TOKEN="$1"

if [ -n "$CLOUDFLARE_TOKEN" ]; then
  echo "[*] Installing Cloudflare Tunnel with provided Token..."
  /usr/local/bin/cloudflared service install "${CLOUDFLARE_TOKEN}"
  systemctl restart cloudflared
  echo "[+] Permanent Cloudflare Tunnel installed and running!"
else
  echo "[*] Setting up free 24/7 Quick Tunnel (trycloudflare.com)..."
  
  cat << EOF > /etc/systemd/system/nepseradar-tunnel.service
[Unit]
Description=NepseRadar Cloudflare Quick Tunnel
After=network.target nepseradar.service

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --url http://127.0.0.1:${LOCAL_PORT} --no-autoupdate
Restart=always
RestartSec=10
StandardOutput=append:/var/log/nepseradar-tunnel.log
StandardError=append:/var/log/nepseradar-tunnel.log

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable nepseradar-tunnel
  systemctl restart nepseradar-tunnel

  echo "[*] Waiting for tunnel to establish..."
  sleep 4

  TUNNEL_URL=$(grep -o 'https://[-a-zA-Z0-9@:%._\+~#=]*\.trycloudflare\.com' /var/log/nepseradar-tunnel.log | tail -n 1 || echo "")

  echo ""
  echo "=================================================="
  echo "  Cloudflare Tunnel Is Live!"
  echo "=================================================="
  if [ -n "$TUNNEL_URL" ]; then
    echo "Your Secure HTTPS URL: ${TUNNEL_URL}"
    echo "Health Check:          ${TUNNEL_URL}/health"
    echo "Stock Suggestions:     ${TUNNEL_URL}/api/suggestions"
  else
    echo "Tunnel started! Check your URL with:"
    echo "sudo cat /var/log/nepseradar-tunnel.log | grep trycloudflare.com"
  fi
  echo ""
  echo "Note: You can close port ${LOCAL_PORT} on Oracle Cloud firewall;"
  echo "traffic now securely routes through Cloudflare's edge network!"
  echo "=================================================="
fi
