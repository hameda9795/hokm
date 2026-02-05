# 🚀 دستورات دقیق برای Deploy

## مرحله 1: تنظیم DNS ✅
در پنل دامنه maxhmd.dev:
```
Name: hokm
Type: A
Value: [IP سرور Hetzner]
TTL: Auto
```

تست:
```bash
ping hokm.maxhmd.dev
```

---

## مرحله 2: اجرای Setup روی سرور 🖥️

```bash
# 1. اتصال به سرور
ssh root@YOUR_SERVER_IP

# 2. دانلود اسکریپت
curl -O https://raw.githubusercontent.com/hameda9795/hokm/main/setup-server.sh

# 3. اجرا
chmod +x setup-server.sh
sudo ./setup-server.sh
```

**اطلاعات مورد نیاز:**
- ✅ GitHub repo URL: `https://github.com/hameda9795/hokm.git` (پیش‌فرض)
- ✅ Bot Token: `YOUR_TELEGRAM_BOT_TOKEN`
- ✅ Email for SSL: `your-email@example.com`

---

## مرحله 3: تنظیم GitHub Actions 🔑

### 3.1. ساخت SSH Key

```bash
# روی سرور (در همان SSH session)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github-actions

# نمایش و کپی public key
cat ~/.ssh/github-actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# کپی کردن private key برای GitHub
cat ~/.ssh/github-actions
# کل محتویات را (از BEGIN تا END) کپی کن
```

### 3.2. اضافه کردن Secrets به GitHub

به این آدرس برو:
```
https://github.com/hameda9795/hokm/settings/secrets/actions
```

Secretهای زیر را اضافه کن:

| Secret Name | مقدار |
|-------------|-------|
| `SERVER_HOST` | IP سرور Hetzner (مثلا `1.2.3.4`) |
| `SERVER_USER` | `root` |
| `SERVER_PORT` | `22` |
| `SSH_PRIVATE_KEY` | محتویات کامل `~/.ssh/github-actions` |
| `TELEGRAM_BOT_TOKEN` | توکن ربات تلگرام |

---

## مرحله 4: تست ✨

### تست Manual
```bash
# Health check
curl https://hokm.maxhmd.dev/health

# باید برگردونه: OK
```

### تست Auto-Deploy
```bash
# روی کامپیوتر خودت
cd d:\tmp\hokm
git add .
git commit -m "Test deployment"
git push origin main
```

بعد به این آدرس برو:
```
https://github.com/hameda9795/hokm/actions
```

باید workflow "Deploy to Hetzner" رو ببینی که در حال اجراست! ✅

---

## ✅ تمام!

حالا هر وقت `git push` بزنی، خودکار deploy میشه! 🎉

### لینک‌های مهم:
- 🌐 Mini App: https://hokm.maxhmd.dev
- 🤖 GitHub: https://github.com/hameda9795/hokm
- 📊 Actions: https://github.com/hameda9795/hokm/actions
- 🐛 Issues: https://github.com/hameda9795/hokm/issues
