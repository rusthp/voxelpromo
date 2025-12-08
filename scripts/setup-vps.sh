#!/bin/bash
# VoxelPromo VPS Setup Script
# This script automatically installs all dependencies needed for production

set -e

echo "=========================================="
echo "  VoxelPromo - VPS Setup Script"
echo "=========================================="
echo ""

# Detect Ubuntu version
if [ -f /etc/os-release ]; then
    . /etc/os-release
    UBUNTU_VERSION=$VERSION_ID
    echo "✅ Detected: $NAME $VERSION_ID"
else
    echo "⚠️  Could not detect OS version, assuming Ubuntu 22.04"
    UBUNTU_VERSION="22.04"
fi

echo ""
echo "📦 Step 1: Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo ""
echo "📦 Step 2: Installing Node.js 20 LTS..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs build-essential
else
    echo "   Node.js already installed: $(node --version)"
fi

echo ""
echo "📦 Step 3: Installing MongoDB 7.0..."
if ! command -v mongod &> /dev/null; then
    sudo apt-get install -y gnupg curl
    curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
        sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
    
    # Use jammy repo for all versions (works for 22.04 and 24.04)
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
        sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
    
    sudo apt-get update
    sudo apt-get install -y mongodb-org
    sudo systemctl enable --now mongod
    echo "   MongoDB installed and started!"
else
    echo "   MongoDB already installed"
fi

echo ""
echo "📦 Step 4: Installing PM2 and global tools..."
sudo npm install -g pm2 serve typescript ts-node

echo ""
echo "📦 Step 5: Installing Chrome/Puppeteer dependencies..."

# Check if Ubuntu 24.04+ (uses t64 packages)
if [[ "$UBUNTU_VERSION" == "24."* ]]; then
    echo "   Using Ubuntu 24.04 (t64) packages..."
    sudo apt-get install -y \
        libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 \
        libcairo2 libatspi2.0-0t64 libgtk-3-0t64
else
    echo "   Using Ubuntu 22.04 or earlier packages..."
    sudo apt-get install -y \
        libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
        libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
        libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
        libcairo2 libatspi2.0-0 libgtk-3-0
fi

echo ""
echo "=========================================="
echo "  ✅ VPS Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Clone the project: git clone <your-repo> voxelpromo"
echo "  2. cd voxelpromo && npm install"
echo "  3. Configure frontend/.env with VITE_API_URL"
echo "  4. npm run build"
echo "  5. pm2 start ecosystem.config.js"
echo ""
echo "See docs/production_guide.md for full instructions."
