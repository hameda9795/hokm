# 🚀 راهنمای سریع Deploy

## تنظیم DNS ✅
```bash
hokm.maxhmd.dev → IP سرور Hetzner
```

## دستورات کاربردی

### راه‌اندازی اولیه (یکبار)
```bash
# روی سرور Hetzner
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/hokm-game/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

### Deployment خودکار
```bash
# روی کامپیوتر شخصی
git add .
git commit -m "Update code"
git push origin main
# ✅ خودکار deploy می‌شود!
```

### مدیریت Services
```bash
# مشاهده logs
cd /opt/hokm
docker-compose logs -f

# Restart
docker-compose restart

# Stop/Start
docker-compose down
docker-compose up -d

# بررسی وضعیت
docker-compose ps
```

### SSL Certificate
```bash
# تمدید دستی (اتوماتیک است)
docker-compose run --rm certbot renew

# دریافت مجدد
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d hokm.maxhmd.dev
```

### Health Checks
```bash
curl https://hokm.maxhmd.dev/health
curl https://hokm.maxhmd.dev/api/health
```

### عیب‌یابی
```bash
# بررسی logs خطا
docker-compose logs --tail=100

# Rebuild کامل
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# پاک کردن cache
docker system prune -af
```

## GitHub Secrets لازم

| Secret | مقدار |
|--------|------|
| `SERVER_HOST` | IP سرور |
| `SERVER_USER` | `root` |
| `SERVER_PORT` | `22` |
| `SSH_PRIVATE_KEY` | Private key SSH |
| `TELEGRAM_BOT_TOKEN` | توکن ربات |

## URLs مهم

- 🌐 App: https://hokm.maxhmd.dev
- 🏥 Health: https://hokm.maxhmd.dev/health
- 📊 API: https://hokm.maxhmd.dev/api/health
- 🔌 WebSocket: wss://hokm.maxhmd.dev/socket.io

## پورت‌ها

- **80**: HTTP (redirect به HTTPS)
- **443**: HTTPS
- **3000**: Server (internal)
- **6379**: Redis (internal)

## Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_DOMAIN=https://hokm.maxhmd.dev
NODE_ENV=production
```

---

📖 راهنمای کامل: [DEPLOYMENT.md](./DEPLOYMENT.md)  
✅ چک‌لیست: [CHECKLIST.md](./CHECKLIST.md)
