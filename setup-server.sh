#!/bin/bash

# 🚀 Quick Setup Script for Hetzner Server
# This script automates the initial setup process

set -e  # Exit on error

echo "🔧 Starting Hokm Game Setup..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Running as root"

# Update system
echo -e "\n${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓${NC} System updated"

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo -e "\n${YELLOW}🐋 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓${NC} Docker installed"
else
    echo -e "${GREEN}✓${NC} Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo -e "\n${YELLOW}🐋 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓${NC} Docker Compose installed"
else
    echo -e "${GREEN}✓${NC} Docker Compose already installed"
fi

# Install Git if not present
if ! command -v git &> /dev/null; then
    echo -e "\n${YELLOW}📦 Installing Git...${NC}"
    apt install -y git
    echo -e "${GREEN}✓${NC} Git installed"
else
    echo -e "${GREEN}✓${NC} Git already installed"
fi

# Create project directory
PROJECT_DIR="/opt/hokm"
echo -e "\n${YELLOW}📂 Setting up project directory...${NC}"
mkdir -p $PROJECT_DIR
echo -e "${GREEN}✓${NC} Project directory created at $PROJECT_DIR"

# Get user input
echo -e "\n${YELLOW}Please provide the following information:${NC}"
read -p "🔗 GitHub repository URL: " REPO_URL
read -p "🤖 Telegram Bot Token: " BOT_TOKEN

# Clone or pull repository
cd $PROJECT_DIR
if [ -d ".git" ]; then
    echo -e "\n${YELLOW}📥 Pulling latest changes...${NC}"
    git pull origin main
else
    echo -e "\n${YELLOW}📥 Cloning repository...${NC}"
    git clone $REPO_URL .
fi
echo -e "${GREEN}✓${NC} Repository ready"

# Create .env file
echo -e "\n${YELLOW}📝 Creating .env file...${NC}"
cat > .env << EOF
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_WEBHOOK_DOMAIN=https://hokm.maxhmd.dev
NODE_ENV=production
EOF
echo -e "${GREEN}✓${NC} .env file created"

# Get SSL certificate
echo -e "\n${YELLOW}🔒 Setting up SSL certificate...${NC}"
read -p "📧 Your email for Let's Encrypt: " EMAIL

# Stop any service on port 80
systemctl stop nginx 2>/dev/null || true
docker stop $(docker ps -q) 2>/dev/null || true

# Get certificate
docker run -it --rm \
  -v $PROJECT_DIR/nginx/ssl:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email $EMAIL \
  --agree-tos \
  --no-eff-email \
  -d hokm.maxhmd.dev

echo -e "${GREEN}✓${NC} SSL certificate obtained"

# Build and start containers
echo -e "\n${YELLOW}🏗️  Building Docker containers...${NC}"
docker-compose build
echo -e "${GREEN}✓${NC} Containers built"

echo -e "\n${YELLOW}🚀 Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓${NC} Services started"

# Wait for services
echo -e "\n${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 15

# Check health
echo -e "\n${YELLOW}🏥 Checking service health...${NC}"
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://hokm.maxhmd.dev/health || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo -e "${GREEN}✓${NC} Health check passed"
else
    echo -e "${RED}⚠️  Health check failed (HTTP $HEALTH_CHECK)${NC}"
    echo -e "${YELLOW}📋 Checking logs...${NC}"
    docker-compose logs --tail=20
fi

# Show status
echo -e "\n${YELLOW}📊 Service Status:${NC}"
docker-compose ps

echo -e "\n${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Setup Complete! ✅${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "1. Set up GitHub Actions secrets in your repository:"
echo -e "   - SERVER_HOST: Your server IP"
echo -e "   - SERVER_USER: root (or your user)"
echo -e "   - SERVER_PORT: 22"
echo -e "   - SSH_PRIVATE_KEY: Your SSH private key"
echo -e "   - TELEGRAM_BOT_TOKEN: $BOT_TOKEN"
echo -e "\n2. Test your Mini App:"
echo -e "   ${GREEN}https://hokm.maxhmd.dev${NC}"
echo -e "\n3. View logs:"
echo -e "   ${YELLOW}cd $PROJECT_DIR && docker-compose logs -f${NC}"
echo -e "\n${GREEN}═══════════════════════════════════════${NC}\n"
