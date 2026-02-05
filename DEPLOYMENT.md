# 🚀 راهنمای Deploy روی Hetzner Server

این راهنما مراحل کامل deploy کردن Hokm Game روی سرور Hetzner را شرح می‌دهد.

## 📋 پیش‌نیازها

### روی سرور Hetzner شما باید نصب باشد:
- ✅ Docker
- ✅ Docker Compose
- ✅ Git
- ✅ Nginx (برای reverse proxy اصلی)

---

## 🔧 مرحله 1: نصب Docker روی Hetzner

اگر Docker نصب نیست، این دستورات را اجرا کنید:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Log out and log back in for group changes to take effect
```

---

## 🌐 مرحله 2: تنظیم DNS

در پنل مدیریت دامنه `maxhmd.dev`:

1. یک رکورد `A` اضافه کنید:
   - **Name**: `hokm`
   - **Type**: `A`
   - **Value**: `[IP سرور Hetzner شما]`
   - **TTL**: `300` (یا Auto)

2. منتظر بمانید تا DNS propagate شود (معمولاً 5-15 دقیقه)

تست کنید:
```bash
ping hokm.maxhmd.dev
# باید IP سرور شما را نشان دهد
```

---

## 📂 مرحله 3: Clone کردن پروژه روی سرور

```bash
# Connect to your Hetzner server
ssh root@YOUR_SERVER_IP

# Create project directory
sudo mkdir -p /opt/hokm
sudo chown $USER:$USER /opt/hokm

# Clone the repository
cd /opt/hokm
git clone https://github.com/hameda9795/hokm.git .

# Or if you already have it, just pull
git pull origin main
```

---

## 🔐 مرحله 4: تنظیم Environment Variables

```bash
cd /opt/hokm

# Create .env file
cp .env.example .env

# Edit with your bot token
nano .env
```

محتویات `.env`:
```env
TELEGRAM_BOT_TOKEN=7969149954:AAF-YOUR-ACTUAL-BOT-TOKEN
TELEGRAM_WEBHOOK_DOMAIN=https://hokm.maxhmd.dev
NODE_ENV=production
```

---

## 🔒 مرحله 5: دریافت SSL Certificate (Let's Encrypt)

```bash
# Create directories for certbot
sudo mkdir -p /opt/hokm/nginx/ssl

# Run certbot to get SSL certificate
docker run -it --rm \
  -v /opt/hokm/nginx/ssl:/etc/letsencrypt \
  -v /var/www/certbot:/var/www/certbot \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d hokm.maxhmd.dev
```

**نکته مهم:** اگر پورت 80 قبلاً استفاده می‌شود، ابتدا nginx یا سرویس دیگری که روی پورت 80 است را متوقف کنید:
```bash
sudo systemctl stop nginx
# یا
sudo docker stop [container_name]
```

بعد از دریافت certificate، می‌توانید سرویس را دوباره start کنید.

---

## 🐋 مرحله 6: Build و اجرای Docker Containers

```bash
cd /opt/hokm

# Build all containers
docker-compose build

# Start services in detached mode
docker-compose up -d

# Check if all services are running
docker-compose ps

# View logs
docker-compose logs -f
```

سرویس‌های زیر باید `Up` باشند:
- ✅ `hokm-redis`
- ✅ `hokm-server`
- ✅ `hokm-client`
- ✅ `hokm-nginx`
- ✅ `hokm-certbot`

---

## 🧪 مرحله 7: تست کردن

### 1. تست سلامت سرور
```bash
curl https://hokm.maxhmd.dev/health
# Expected: OK
```

### 2. تست WebSocket
```bash
curl https://hokm.maxhmd.dev/socket.io/?EIO=4&transport=polling
```

### 3. باز کردن در Telegram
مینی‌اپ را در Telegram باز کنید و بررسی کنید که به درستی کار می‌کند.

---

## 🔄 مرحله 8: راه‌اندازی GitHub Actions (CI/CD)

### 8.1. ایجاد SSH Key برای GitHub

```bash
# روی سرور Hetzner
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
# Don't set a passphrase (just press Enter)

# نمایش public key
cat ~/.ssh/github-actions.pub
```

این public key را به `~/.ssh/authorized_keys` اضافه کنید:
```bash
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 8.2. تنظیم GitHub Secrets

به مخزن GitHub خود بروید:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

این secretها را اضافه کنید:

| Secret Name | Value |
|------------|-------|
| `SERVER_HOST` | IP سرور Hetzner شما |
| `SERVER_USER` | `root` یا username شما |
| `SERVER_PORT` | `22` (یا پورت SSH شما) |
| `SSH_PRIVATE_KEY` | محتویات `~/.ssh/github-actions` (private key) |
| `TELEGRAM_BOT_TOKEN` | توکن ربات تلگرام |
| `TELEGRAM_CHAT_ID` | (اختیاری) برای notification |

برای مشاهده private key:
```bash
cat ~/.ssh/github-actions
```

کل محتویات را (از `-----BEGIN` تا `-----END`) کپی کنید.

### 8.3. تست Workflow

حالا هر وقت کد را `git push` کنید، GitHub Actions خودکار:
1. ✅ کد را روی سرور pull می‌کند
2. ✅ Docker containers را build می‌کند
3. ✅ سرویس‌ها را restart می‌کند
4. ✅ Health check انجام می‌دهد

```bash
# تست کنید
git add .
git commit -m "Test auto deployment"
git push origin main
```

در GitHub، به **Actions** tab بروید و وضعیت deployment را ببینید.

---

## 📊 دستورات مفید مدیریتی

### مشاهده logs
```bash
# تمام سرویس‌ها
docker-compose logs -f

# فقط server
docker-compose logs -f server

# فقط client
docker-compose logs -f client

# 100 خط آخر
docker-compose logs --tail=100
```

### Restart سرویس‌ها
```bash
# همه سرویس‌ها
docker-compose restart

# فقط server
docker-compose restart server
```

### Stop/Start
```bash
# Stop
docker-compose down

# Start
docker-compose up -d
```

### بررسی resource usage
```bash
docker stats
```

### پاک کردن containers و volumes قدیمی
```bash
# حذف containers متوقف شده
docker container prune -f

# حذف images استفاده نشده
docker image prune -af

# حذف volumes استفاده نشده (احتیاط: داده‌ها پاک می‌شود!)
docker volume prune -f
```

---

## 🔄 تمدید خودکار SSL Certificate

Certbot container هر 12 ساعت یکبار SSL certificate را چک و در صورت نیاز renew می‌کند.

برای تست manual:
```bash
docker-compose run --rm certbot renew --dry-run
```

---

## 🐛 عیب‌یابی

### مشکل: سرویس‌ها start نمی‌شوند
```bash
# بررسی logs
docker-compose logs

# بررسی وضعیت
docker-compose ps
```

### مشکل: SSL certificate کار نمی‌کند
```bash
# بررسی certificate
sudo ls -la /opt/hokm/nginx/ssl/live/hokm.maxhmd.dev/

# دریافت مجدد
docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d hokm.maxhmd.dev
```

### مشکل: WebSocket متصل نمی‌شود
بررسی کنید که:
- ✅ Port 443 باز است
- ✅ Nginx config درست است
- ✅ Server در حال اجراست

```bash
# تست پورت
nc -zv hokm.maxhmd.dev 443

# بررسی nginx config
docker-compose exec nginx nginx -t
```

### مشکل: تغییرات بعد از deploy دیده نمی‌شود
```bash
# پاک کردن cache و rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📈 Monitoring و Performance

### نصب Monitoring Tools (اختیاری)

```bash
# نصب htop
sudo apt install htop

# مشاهده
htop
```

### بررسی disk usage
```bash
df -h
du -sh /opt/hokm
docker system df
```

---

## 🎉 تمام!

حالا شما یک سیستم CI/CD کامل دارید که:
- ✅ با `git push` خودکار deploy می‌شود
- ✅ SSL certificate دارد
- ✅ از Docker استفاده می‌کند
- ✅ با Telegram Mini App کار می‌کند
- ✅ خودکار certificate renew می‌شود

---

## 📞 پشتیبانی

اگر مشکلی پیش آمد:
1. Logs را بررسی کنید: `docker-compose logs -f`
2. Status سرویس‌ها را چک کنید: `docker-compose ps`
3. Health endpoint را تست کنید: `curl https://hokm.maxhmd.dev/health`

موفق باشید! 🚀
