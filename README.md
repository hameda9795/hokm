# 🃏 Hokm Card Game - Telegram Mini App

یک بازی آنلاین چند نفره حکم با قابلیت اجرا به عنوان Telegram Mini App.

## ✨ ویژگی‌ها

- 🎮 بازی آنلاین چند نفره با WebSocket
- 📱 Telegram Mini App با رابط کاربری مدرن
- 🎨 گرافیک زیبا با PixiJS
- 🤖 بات‌های هوشمند AI برای پر کردن جاهای خالی
- 🔄 Real-time synchronization
- 💾 Redis برای ذخیره‌سازی state بازی
- 🐋 Docker Compose برای deploy آسان
- 🔒 SSL/HTTPS با Let's Encrypt
- 🚀 CI/CD خودکار با GitHub Actions

## 🛠️ Stack فنی

### Backend
- **Node.js** + **TypeScript**
- **Express** - REST API
- **Socket.IO** - Real-time communication
- **Redis** - Game state management
- **Grammy** - Telegram Bot framework

### Frontend
- **React** + **TypeScript**
- **Vite** - Build tool
- **PixiJS** - Game graphics
- **GSAP** - Animations
- **Zustand** - State management
- **Telegram SDK** - Mini App integration

### DevOps
- **Docker** + **Docker Compose**
- **Nginx** - Reverse proxy
- **Let's Encrypt** - SSL certificates
- **GitHub Actions** - CI/CD

## 📦 نصب و راه‌اندازی

### پیش‌نیازها

- Node.js 20+
- Docker & Docker Compose (برای production)
- یک ربات تلگرام (از [@BotFather](https://t.me/BotFather))

### Development (Local)

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/hokm-game.git
cd hokm-game

# نصب dependencies
npm run install:all

# ایجاد .env file
cp .env.example .env

# ویرایش .env و اضافه کردن BOT_TOKEN
nano .env

# اجرای سرور و کلاینت
npm run dev
```

سرور روی `http://localhost:3001` و کلاینت روی `http://localhost:5173` اجرا می‌شود.

### Production (Hetzner)

برای deploy روی سرور Hetzner، [راهنمای کامل DEPLOYMENT.md](./DEPLOYMENT.md) را مطالعه کنید.

#### روش سریع:

```bash
# روی سرور Hetzner
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/hokm-game/main/setup-server.sh
chmod +x setup-server.sh
sudo ./setup-server.sh
```

این اسکریپت همه چیز را به صورت خودکار نصب و راه‌اندازی می‌کند:
- Docker & Docker Compose
- SSL Certificate
- پروژه و dependencies
- Build و اجرا

## 🎮 نحوه استفاده

### 1. ساخت ربات تلگرام

```bash
# به BotFather (@BotFather) در تلگرام بروید
/newbot
# نام و username ربات را وارد کنید
# توکن ربات را کپی کنید
```

### 2. تنظیم Mini App

```bash
# در BotFather
/newapp
# ربات را انتخاب کنید
# عنوان، توضیحات و تصویر را وارد کنید
# URL: https://hokm.maxhmd.dev
```

### 3. تنظیم Webhook

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://hokm.maxhmd.dev/webhook/telegram"
```

## 🚀 CI/CD با GitHub Actions

این پروژه از GitHub Actions برای deployment خودکار استفاده می‌کند.

### راه‌اندازی:

1. **GitHub Secrets را اضافه کنید:**
   - Repository Settings → Secrets and variables → Actions → New secret

   | Secret Name | توضیحات |
   |------------|---------|
   | `SERVER_HOST` | IP سرور Hetzner |
   | `SERVER_USER` | Username SSH (مثلا `root`) |
   | `SERVER_PORT` | پورت SSH (معمولا `22`) |
   | `SSH_PRIVATE_KEY` | کلید خصوصی SSH |
   | `TELEGRAM_BOT_TOKEN` | توکن ربات تلگرام |
   | `TELEGRAM_CHAT_ID` | (اختیاری) برای notification |

2. **هر بار که کد را push می‌کنید، خودکار deploy می‌شود:**

```bash
git add .
git commit -m "Update game logic"
git push origin main
# GitHub Actions به صورت خودکار:
# ✅ کد را روی سرور pull می‌کند
# ✅ Docker images را build می‌کند
# ✅ Services را restart می‌کند
# ✅ Health check انجام می‌دهد
```

## 📁 ساختار پروژه

```
hokm-game/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── game/          # Game logic (PixiJS)
│   │   ├── hooks/         # Custom React hooks
│   │   └── store/         # Zustand state
│   ├── Dockerfile
│   └── nginx.conf
│
├── server/                # Node.js backend
│   ├── src/
│   │   ├── bot/          # Telegram bot
│   │   ├── game/         # Game manager
│   │   ├── socket/       # Socket.IO handlers
│   │   └── types/        # TypeScript types
│   └── Dockerfile
│
├── nginx/                 # Nginx configs
│   ├── nginx.conf
│   └── conf.d/
│       └── hokm.conf
│
├── .github/
│   └── workflows/
│       └── deploy.yml     # CI/CD workflow
│
├── docker-compose.yml
├── DEPLOYMENT.md         # راهنمای کامل deployment
└── setup-server.sh       # اسکریپت نصب خودکار
```

## 🎯 قوانین بازی

حکم یک بازی کارتی ایرانی است که با 4 نفر بازیکن (2 تیم) انجام می‌شود.

### مراحل بازی:

1. **تعیین حاکم**: یک کارت خشت به هر بازیکن داده می‌شود، کمترین خشت حاکم است
2. **انتخاب حکم**: حاکم با دیدن 5 کارت اول، حکم (رنگ برنده) را انتخاب می‌کند
3. **توزیع کارت**: تمام 52 کارت بین 4 نفر توزیع می‌شود (هر نفر 13 کارت)
4. **بازی**: بازیکنان به نوبت کارت می‌زنند، برنده هر دست مشخص می‌شود
5. **امتیازدهی**: تیمی که بیشترین دست را ببرد، امتیاز می‌گیرد
6. **پیروزی**: اولین تیمی که به 7 امتیاز برسد، برنده است

## 🤝 مشارکت

Pull Requestها خوشامد است! برای تغییرات بزرگ، لطفاً ابتدا یک Issue باز کنید.

## 📝 License

MIT

## 📞 پشتیبانی

اگر مشکلی داشتید:
1. [Issues](https://github.com/YOUR_USERNAME/hokm-game/issues) را بررسی کنید
2. [راهنمای DEPLOYMENT.md](./DEPLOYMENT.md) را مطالعه کنید
3. یک Issue جدید باز کنید

---

**ساخته شده با ❤️ در ایران**
