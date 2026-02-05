import { Bot, InlineKeyboard, Context } from 'grammy';
import { GameManager } from '../game/GameManager.js';

interface BotConfig {
  token: string;
  miniAppUrl: string;
  gameManager: GameManager;
}

export class TelegramBot {
  private bot: Bot;
  private miniAppUrl: string;
  private gameManager: GameManager;
  private activeTournaments: Map<number, string> = new Map(); // chatId -> gameId

  constructor(config: BotConfig) {
    this.bot = new Bot(config.token);
    this.miniAppUrl = config.miniAppUrl;
    this.gameManager = config.gameManager;

    this.setupCommands();
    this.setupHandlers();
  }

  private setupCommands() {
    this.bot.api.setMyCommands([
      { command: 'start', description: '🎮 شروع بات' },
      { command: 'play', description: '🃏 شروع بازی در گروه' },
      { command: 'newgame', description: '🆕 ایجاد بازی جدید' },
      { command: 'status', description: '📊 وضعیت بازی فعلی' },
      { command: 'help', description: '❓ راهنمای بازی' },
      { command: 'cancel', description: '❌ لغو بازی فعلی' }
    ]);
  }

  private setupHandlers() {
    // دستور شروع
    this.bot.command('start', async (ctx) => {
      const startParam = ctx.match;
      const isGroup = ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';

      // اگر در گروه هستیم، به handlePlayCommand هدایت کن
      if (isGroup) {
        await this.handlePlayCommand(ctx, true);
        return;
      }

      // در چت خصوصی
      if (startParam && startParam.startsWith('game_')) {
        // Deep link برای پیوستن به بازی
        const gameId = startParam.replace('game_', '');
        const gameUrl = `${this.miniAppUrl}?gameId=${gameId}`;

        const keyboard = new InlineKeyboard()
          .webApp('🎴 پیوستن به بازی', gameUrl);

        await ctx.reply(
          `🎮 بازی حکم\n\n` +
          `کد بازی: ${gameId}\n\n` +
          `برای پیوستن روی دکمه زیر کلیک کنید:`,
          { reply_markup: keyboard }
        );
      } else {
        // پیام خوش‌آمدگویی معمولی
        const keyboard = new InlineKeyboard()
          .webApp('🎮 شروع بازی', this.miniAppUrl);

        await ctx.reply(
          '🃏 به بازی حکم خوش آمدید!\n\n' +
          'برای شروع بازی روی دکمه زیر کلیک کنید یا از دستور /help برای راهنما استفاده کنید.',
          { reply_markup: keyboard }
        );
      }
    });

    // دستور بازی در گروه
    this.bot.command('play', async (ctx) => {
      await this.handlePlayCommand(ctx);
    });

    // ایجاد بازی جدید
    this.bot.command('newgame', async (ctx) => {
      await this.handlePlayCommand(ctx, true);
    });

    // شنیدن همه پیام‌های متنی برای شروع بازی با فارسی
    this.bot.on('message:text', async (ctx) => {
      const text = ctx.message.text.trim();
      console.log('[Bot] Received message:', text, 'in chat type:', ctx.chat?.type);

      // بررسی متن‌های فارسی برای شروع بازی
      if (text === 'بازی حکم' || text === 'بازی' || text === 'حکم بازی') {
        if (ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup') {
          console.log('[Bot] Starting game from Persian text');
          await this.handlePlayCommand(ctx, true);
        }
      }
    });

    // callback query برای دکمه‌های inline
    this.bot.on('callback_query:data', async (ctx) => {
      const data = ctx.callbackQuery.data;

      if (data.startsWith('join_')) {
        const gameId = data.replace('join_', '');
        const user = ctx.from;
        const gameUrl = `${this.miniAppUrl}?gameId=${gameId}`;

        await ctx.answerCallbackQuery({
          url: gameUrl
        });
      }
    });

    // وضعیت بازی
    this.bot.command('status', async (ctx) => {
      await this.handleStatusCommand(ctx);
    });

    // لغو بازی
    this.bot.command('cancel', async (ctx) => {
      await this.handleCancelCommand(ctx);
    });

    // راهنما
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '📖 راهنمای بازی حکم\n\n' +
        '🎯 هدف بازی:\n' +
        'گرفتن ۷ دست از ۱۳ دست برای بردن هر راند\n\n' +
        '👥 بازیکنان:\n' +
        '۴ نفر در ۲ تیم (بازیکنان روبروی هم هم‌تیمی هستند)\n\n' +
        '👑 حاکم:\n' +
        'بازیکنی که حکم (خال برنده) را انتخاب می‌کند\n\n' +
        '📜 قوانین:\n' +
        '• باید از خال درخواستی بازی کنید (اگر دارید)\n' +
        '• حکم همیشه بقیه خال‌ها را می‌زند\n' +
        '• اگر تیم بازنده هیچ دستی نبرده باشد (کاپ)، ۲ امتیاز می‌گیرید\n\n' +
        '🏆 پیروزی:\n' +
        'تیمی که اول به ۷ امتیاز برسد برنده است!\n\n' +
        '💡 دستورات:\n' +
        '/play - شروع بازی در گروه\n' +
        '/newgame - ایجاد بازی جدید\n' +
        '/status - وضعیت بازی فعلی\n' +
        '/cancel - لغو بازی\n' +
        '/help - نمایش این راهنما'
      );
    });

    // Handle errors
    this.bot.catch((err) => {
      console.error('Bot error:', err);
    });
  }

  private async handlePlayCommand(ctx: Context, forceNew: boolean = false) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const user = ctx.from!;
    let gameId = this.activeTournaments.get(chatId);

    // اگر بازی فعالی نیست یا forceNew باشد، بازی جدید بساز
    if (!gameId || forceNew) {
      gameId = this.gameManager.createGame();
      this.activeTournaments.set(chatId, gameId);
      // ثبت chatId برای اطلاع‌رسانی‌های بعدی
      this.gameManager.setGameTelegramChat(gameId, chatId);
      // ثبت سازنده بازی
      this.gameManager.setGameCreator(gameId, user.id, user.username);
    } else {
      // بررسی کن که بازی هنوز منتظر بازیکن است
      const game = this.gameManager.getGame(gameId);
      if (game && game.getState().phase !== 'waiting') {
        gameId = this.gameManager.createGame();
        this.activeTournaments.set(chatId, gameId);
        this.gameManager.setGameTelegramChat(gameId, chatId);
        this.gameManager.setGameCreator(gameId, user.id, user.username);
      }
    }

    // لینک مستقیم به Mini App با پارامتر startapp
    // فرمت صحیح: https://t.me/botusername/appname?startapp=parameter
    const botUsername = ctx.me.username;
    const miniAppUrl = `https://t.me/${botUsername}/hokmgeram?startapp=game_${gameId}`;

    // نام کاربر برای نمایش
    const creatorName = user.username
      ? `@${user.username}`
      : `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`;
    const creatorLink = user.username
      ? `[${creatorName}](tg://user?id=${user.id})`
      : `[${user.first_name}](tg://user?id=${user.id})`;

    const keyboard = new InlineKeyboard()
      .url('🎴 پیوستن به بازی', miniAppUrl);

    await ctx.reply(
      '🎮 بازی حکم شروع شد!\n\n' +
      `🎯 کد بازی: \`${gameId}\`\n` +
      `👑 سازنده: ${creatorLink}\n` +
      '👥 بازیکنان: 0/4\n\n' +
      '🔹 روی دکمه زیر کلیک کنید تا وارد بازی شوید\n' +
      '🔹 یا لینک را با دوستان خود به اشتراک بگذارید',
      {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      }
    );
  }

  private async handleStatusCommand(ctx: Context) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const gameId = this.activeTournaments.get(chatId);

    if (!gameId) {
      await ctx.reply('❌ هیچ بازی فعالی در این گروه وجود ندارد.\n\nبرای شروع از دستور /play استفاده کنید.');
      return;
    }

    const game = this.gameManager.getGame(gameId);
    if (!game) {
      this.activeTournaments.delete(chatId);
      await ctx.reply('❌ بازی یافت نشد. لطفاً بازی جدیدی با /play ایجاد کنید.');
      return;
    }

    const state = game.getState();
    const playerCount = state.players.filter(p => p.isConnected).length;

    let statusText = `📊 وضعیت بازی\n\n`;
    statusText += `🎯 کد بازی: \`${gameId}\`\n`;

    // نمایش سازنده بازی
    const creator = this.gameManager.getGameCreator(gameId);
    if (creator.telegramId) {
      const creatorLink = creator.username
        ? `[@${creator.username}](tg://user?id=${creator.telegramId})`
        : `[سازنده](tg://user?id=${creator.telegramId})`;
      statusText += `👑 سازنده: ${creatorLink}\n`;
    }

    statusText += `👥 بازیکنان: ${playerCount}/4\n`;
    statusText += `📍 مرحله: ${this.getPhaseText(state.phase)}\n\n`;

    if (playerCount > 0) {
      statusText += '👤 بازیکنان:\n';
      state.players.forEach((p, idx) => {
        const icon = p.isConnected ? '✅' : '❌';
        // ساختن لینک به پروفایل تلگرام
        const playerLink = p.telegramId
          ? `[${p.name}](tg://user?id=${p.telegramId})`
          : p.name;
        const teamLabel = p.team === 'team1' ? '(تیم ۱)' : '(تیم ۲)';
        statusText += `${icon} ${playerLink} ${teamLabel}\n`;
      });
    }

    if (state.phase === 'playing') {
      statusText += `\n🏆 امتیازات:\n`;
      statusText += `تیم ۱: ${state.gameScore.team1} | تیم ۲: ${state.gameScore.team2}\n`;
      statusText += `دست جاری: تیم ۱: ${state.roundScore.team1} | تیم ۲: ${state.roundScore.team2}\n`;
    }

    await ctx.reply(statusText, { parse_mode: 'Markdown' });
  }

  private async handleCancelCommand(ctx: Context) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('⚠️ این دستور فقط در گروه کار می‌کند!');
      return;
    }

    const chatId = ctx.chat!.id;
    const gameId = this.activeTournaments.get(chatId);

    if (!gameId) {
      await ctx.reply('❌ هیچ بازی فعالی برای لغو وجود ندارد.');
      return;
    }

    this.activeTournaments.delete(chatId);
    await ctx.reply('✅ بازی لغو شد.\n\nبرای شروع بازی جدید از /play استفاده کنید.');
  }

  private getPhaseText(phase: string): string {
    const phases: Record<string, string> = {
      'waiting': '⏳ در انتظار بازیکنان',
      'selectingHokm': '👑 انتخاب حکم',
      'playing': '🎮 در حال بازی',
      'roundEnd': '🎊 پایان دست',
      'gameEnd': '🏁 پایان بازی'
    };
    return phases[phase] || phase;
  }

  // متد برای ارسال اطلاع‌رسانی به گروه
  async notifyGameUpdate(chatId: number, message: string, keyboard?: InlineKeyboard) {
    try {
      await this.bot.api.sendMessage(chatId, message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // شروع بات
  async start() {
    await this.bot.start({
      onStart: (botInfo) => {
        console.log(`
╔═══════════════════════════════════════╗
║     🤖 Telegram Bot Started 🤖        ║
╠═══════════════════════════════════════╣
║  Bot: @${botInfo.username?.padEnd(29) || 'Unknown'.padEnd(29)} ║
║  Mini App: ${this.miniAppUrl.substring(0, 23).padEnd(23)}    ║
╚═══════════════════════════════════════╝
        `);
      }
    });
  }

  // توقف بات
  stop() {
    this.bot.stop();
  }

  getBot() {
    return this.bot;
  }
}
