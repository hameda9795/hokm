# ✅ چک‌لیست Deploy به Hetzner

این چک‌لیست گام به گام برای deploy کردن پروژه Hokm روی سرور Hetzner شما.

## 📋 قبل از شروع

- [ ] سرور Hetzner آماده است
- [ ] دسترسی SSH به سرور دارید
- [ ] دامنه `maxhmd.dev` در اختیار دارید
- [ ] توکن ربات تلگرام دارید

---

## 🌐 مرحله 1: تنظیم DNS (5 دقیقه)

- [ ] به پنل مدیریت دامنه `maxhmd.dev` بروید
- [ ] یک رکورد A برای subdomain `hokm` بسازید:
  ```
  Name: hokm
  Type: A
  Value: [IP سرور Hetzner شما]
  TTL: 300 (یا Auto)
  ```
- [ ] منتظر بمانید تا DNS propagate شود (5-15 دقیقه)
- [ ] تست کنید: `ping hokm.maxhmd.dev` (باید IP سرور را نشان دهد)

---

## 🖥️ مرحله 2: راه‌اندازی سرور (20 دقیقه)

### گزینه A: استفاده از اسکریپت خودکار (پیشنهادی ⭐)

```bash
# اتصال به سرور
ssh root@YOUR_SERVER_IP

# دانلود و اجرای اسکریپت setup
curl -O https://raw.githubusercontent.com/hameda9795/hokm/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

اطلاعات زیر را وارد کنید:
- [ ] URL مخزن GitHub
- [ ] توکن ربات تلگرام
- [ ] ایمیل برای Let's Encrypt

### گزینه B: راه‌اندازی دستی

اگر می‌خواهید خودتان مرحله به مرحله پیش بروید:
- [ ] به فایل `DEPLOYMENT.md` مراجعه کنید
- [ ] مراحل 1 تا 7 را دنبال کنید

---

## 🔐 مرحله 3: تنظیم GitHub (10 دقیقه)

### 3.1. ساخت SSH Key

```bash
# روی سرور Hetzner
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions
# هنگام درخواست passphrase، فقط Enter بزنید

# نمایش public key
cat ~/.ssh/github-actions.pub
```

- [ ] Public key را به `~/.ssh/authorized_keys` اضافه کنید:
  ```bash
  cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  ```

- [ ] Private key را کپی کنید:
  ```bash
  cat ~/.ssh/github-actions
  ```

### 3.2. اضافه کردن GitHub Secrets

به مخزن GitHub بروید:
**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Secretهای زیر را اضافه کنید:

- [ ] `SERVER_HOST` = IP سرور Hetzner
- [ ] `SERVER_USER` = `root` (یا username شما)
- [ ] `SERVER_PORT` = `22`
- [ ] `SSH_PRIVATE_KEY` = محتویات کامل `~/.ssh/github-actions` (private key)
- [ ] `TELEGRAM_BOT_TOKEN` = توکن ربات تلگرام
- [ ] `TELEGRAM_CHAT_ID` = (اختیاری) Chat ID برای دریافت notification

---

## 🧪 مرحله 4: تست کردن (5 دقیقه)

### 4.1. تست Manual

```bash
# Health check
curl https://hokm.maxhmd.dev/health
# باید "OK" برگرداند

# تست API
curl https://hokm.maxhmd.dev/api/health
# باید JSON برگرداند

# تست WebSocket
curl https://hokm.maxhmd.dev/socket.io/?EIO=4&transport=polling
```

- [ ] همه endpoint‌ها پاسخ می‌دهند
- [ ] SSL بدون خطا کار می‌کند (قفل سبز)

### 4.2. تست در تلگرام

- [ ] Mini App را در تلگرام باز کنید
- [ ] یک گیم جدید بسازید
- [ ] به گیم بپیوندید
- [ ] بازی کار می‌کند

---

## 🚀 مرحله 5: تست CI/CD (5 دقیقه)

```bash
# یک تغییر کوچک در کد
echo "# Test deployment" >> README.md

# Commit و Push
git add .
git commit -m "Test auto deployment"
git push origin main
```

- [ ] به **Actions** tab در GitHub بروید
- [ ] Workflow "Deploy to Hetzner" در حال اجرا است
- [ ] Workflow با موفقیت تمام شد (علامت ✓ سبز)
- [ ] تغییرات در Mini App دیده می‌شود

---

## 📊 مرحله 6: مانیتورینگ (مداوم)

### بررسی Logs

```bash
# اتصال به سرور
ssh root@YOUR_SERVER_IP

# مشاهده logs
cd /opt/hokm
docker-compose logs -f

# فقط server logs
docker-compose logs -f server

# فقط client logs
docker-compose logs -f client
```

### بررسی وضعیت Services

```bash
# لیست services
docker-compose ps

# وضعیت سلامت
curl https://hokm.maxhmd.dev/health
```

- [ ] همه services در حالت "Up" هستند
- [ ] Logs هیچ خطای critical ندارد

---

## 🎉 تمام شد!

اگر همه موارد بالا ✓ دارند، پروژه شما با موفقیت deploy شده است!

### حالا می‌توانید:

✅ با `git push` خودکار deploy کنید  
✅ تغییرات را بلافاصله در Telegram ببینید  
✅ از Cloudflare جدا شده‌اید  
✅ روی سرور Hetzner خودتان هستید  

---

## ⚠️ مشکلات رایج

### اگر services start نمی‌شوند:

```bash
docker-compose logs
docker-compose ps
```

### اگر SSL کار نمی‌کند:

```bash
# دریافت مجدد certificate
docker-compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d hokm.maxhmd.dev
```

### اگر GitHub Actions fail می‌شود:

- بررسی کنید که همه Secrets درست وارد شده‌اند
- SSH Key را دوباره بسازید و دوباره امتحان کنید
- مطمئن شوید که پورت 22 روی سرور باز است

---

## 📞 راهنمایی بیشتر

- 📖 [DEPLOYMENT.md](./DEPLOYMENT.md) - راهنمای مفصل
- 📖 [README.md](./README.md) - مستندات پروژه
- 🐛 [GitHub Issues](https://github.com/hameda9795/hokm/issues)

موفق باشید! 🚀
